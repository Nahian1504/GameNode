const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require("express-validator");

const User = require("../models/User");
const { UserGame } = require("../models/Game");
const { protect } = require("../middleware/authMiddleware");
const { steamLimiter } = require("../middleware/rateLimiter");
const {
  getOwnedGames,
  getCurrentPlayerCount,
  getPlayerSummary,
  getGameNews,
  clearUserCache,
} = require("../utils/steamService");

// Links a Steam account to the logged-in GameNode user
// All routes in this file require JWT 
router.post(
  "/connect",
  protect,
  steamLimiter,
  [
    body("steamId")
      .trim()
      .matches(/^\d{17}$/)
      .withMessage("Steam ID must be exactly 17 digits"),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: errors.array()[0].msg,
        });
      }

      const { steamId } = req.body;

      // Check if Steam ID already linked to another account
      const existingUser = await User.findOne({
        steamId,
        _id: { $ne: req.user._id },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "This Steam account is already linked to another GameNode account.",
        });
      }

      // Validate Steam ID by calling Steam API
      let playerSummary;
      try {
        playerSummary = await getPlayerSummary(steamId);
      } catch (steamError) {
        return res.status(400).json({
          success: false,
          message: steamError.message,
        });
      }

      // Saves Steam ID to user database
      await User.findByIdAndUpdate(req.user._id, { steamId });

      res.status(200).json({
        success: true,
        message: "Steam account connected successfully!",
        steamProfile: {
          steamId,
          personaName: playerSummary.personaname,
          avatarUrl: playerSummary.avatarfull,
          profileUrl: playerSummary.profileurl,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Retrieves the user's Steam game library for the dashboard
router.get("/dashboard", protect, steamLimiter, async (req, res, next) => {
  try {
    const { steamId } = req.user;

    if (!steamId) {
      return res.status(400).json({
        success: false,
        message: "No Steam account linked. Please connect your Steam account first.",
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;

    if (page < 1 || limit < 1 || limit > 50) {
      return res.status(400).json({
        success: false,
        message: "Invalid pagination parameters.",
      });
    }

    let games;
    try {
      games = await getOwnedGames(steamId);
    } catch (steamError) {
      return res.status(503).json({
        success: false,
        message: "Steam API is temporarily unavailable. Please try again.",
      });
    }

    if (!games || games.length === 0) {
      return res.status(200).json({
        success: true,
        games: [],
        total: 0,
        page,
        totalPages: 0,
        message: "No games found in your Steam library.",
      });
    }

    // Sort by playtime 
    games.sort((a, b) => (b.playtime_forever || 0) - (a.playtime_forever || 0));

    // Pagination
    const total = games.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paginatedGames = games.slice(start, start + limit);

    const formattedGames = paginatedGames.map((game) => ({
      appId: String(game.appid),
      name: game.name,
      playtimeHours: Math.round((game.playtime_forever || 0) / 60 * 10) / 10,
      imgIconUrl: game.img_icon_url
        ? `https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`
        : null,
      headerImageUrl: `https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/header.jpg`,
    }));

    // Sync to MongoDB 
    syncGamesToDB(req.user._id, games).catch((err) =>
      console.error("Background game sync error:", err)
    );

    res.status(200).json({
      success: true,
      games: formattedGames,
      total,
      page,
      totalPages,
    });
  } catch (error) {
    next(error);
  }
});

// Returns the current player count for a specific game
router.get(
  "/playercount/:appId",
  protect,
  steamLimiter,
  [param("appId").trim().isNumeric().withMessage("appId must be numeric")],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: errors.array()[0].msg,
        });
      }

      const { appId } = req.params;
      const count = await getCurrentPlayerCount(appId);

      res.status(200).json({
        success: true,
        appId,
        playerCount: count,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Returns recent news articles for a game
router.get(
  "/news/:appId",
  protect,
  steamLimiter,
  [param("appId").trim().isNumeric().withMessage("appId must be numeric")],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: errors.array()[0].msg,
        });
      }

      const { appId } = req.params;
      const news = await getGameNews(appId, 5);

      res.status(200).json({
        success: true,
        appId,
        news: news.map((item) => ({
          gid: item.gid,
          title: item.title,
          url: item.url,
          author: item.author,
          feedName: item.feedname,
          date: new Date(item.date * 1000).toISOString(),
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Forces a fresh sync from Steam API 
router.post("/sync", protect, steamLimiter, async (req, res, next) => {
  try {
    const { steamId } = req.user;

    if (!steamId) {
      return res.status(400).json({
        success: false,
        message: "No Steam account linked.",
      });
    }

    clearUserCache(steamId);

    res.status(200).json({
      success: true,
      message: "Cache cleared. Your library will refresh on next load.",
    });
  } catch (error) {
    next(error);
  }
});

// Sync games to MongoDB
const syncGamesToDB = async (userId, games) => {
  const ops = games.map((game) => ({
    updateOne: {
      filter: { userId, appId: String(game.appid) },
      update: {
        $set: {
          name: game.name,
          playtimeForever: game.playtime_forever || 0,
          imgIconUrl: game.img_icon_url || null,
          lastSynced: new Date(),
        },
      },
      upsert: true,
    },
  }));

  if (ops.length > 0) {
    await UserGame.bulkWrite(ops);
  }
};

module.exports = router;
