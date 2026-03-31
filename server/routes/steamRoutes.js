const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require("express-validator");

const User = require("../models/User");
const { UserGame } = require("../models/Game");
const { protect } = require("../middleware/authMiddleware");
const { steamLimiter } = require("../middleware/rateLimiter");
const { validateDashboardQuery } = require("../middleware/dashboardValidation");
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
router.get(
  "/dashboard",
  protect,
  dashboardLimiter,
  validateDashboardQuery,
  async (req, res, next) => {
    try {
      const { steamId } = req.user;
      if (!steamId) {
        return res.status(400).json({ success: false, message: "No Steam account linked. Please connect your Steam account first." });
      }

      const page  = parseInt(req.query.page)  || 1;
      const limit = parseInt(req.query.limit) || 12;
      const sort  = req.query.sort || "playtime"; 

      if (page < 1 || limit < 1 || limit > 50) {
        return res.status(400).json({ success: false, message: "Invalid pagination parameters." });
      }

      let games;
      try {
        games = await getOwnedGames(steamId);
      } catch (steamError) {
        return res.status(503).json({ success: false, message: "Steam API is temporarily unavailable. Please try again." });
      }

      if (!games || games.length === 0) {
        return res.status(200).json({
          success: true, games: [], total: 0, page,
          totalPages: 0, totalPlaytimeHours: 0,
          message: "No games found in your Steam library.",
        });
      }

  
      if (sort === "name") {
        games.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      } else if (sort === "recent") {
        games.sort((a, b) => (b.rtime_last_played || 0) - (a.rtime_last_played || 0));
      } else {
        games.sort((a, b) => (b.playtime_forever || 0) - (a.playtime_forever || 0));
      }

      const total = games.length;
      const totalPages = Math.ceil(total / limit);
      const start = (page - 1) * limit;
      const paginated = games.slice(start, start + limit);

      const formattedGames = paginated.map((game) => ({
        appId: String(game.appid),
        name:  game.name,
        playtimeHours: Math.round((game.playtime_forever || 0) / 60 * 10) / 10,
        imgIconUrl: game.img_icon_url
          ? `https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`
          : null,
        headerImageUrl: `https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/header.jpg`,
      }));

      const totalPlaytimeHours = await UserGame.getTotalPlaytimeForUser(req.user._id);

      syncGamesToDB(req.user._id, games).catch((err) =>
        console.error("Background game sync error:", err)
      );

      res.status(200).json({
        success: true,
        games: formattedGames,
        total,
        page,
        totalPages,
        totalPlaytimeHours, 
        sort,
      });
    } catch (error) {
      next(error);
    }
  }
);


router.get(
  "/playercount/:appId",
  protect,
  steamLimiter,
  [param("appId").trim().isNumeric().withMessage("appId must be numeric")],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }
      const { appId } = req.params;
      const count = await getCurrentPlayerCount(appId);
      res.status(200).json({ success: true, appId, playerCount: count });
    } catch (error) {
      next(error);
    }
  }
);


router.get(
  "/news/:appId",
  protect,
  steamLimiter,
  [
    param("appId").trim().isNumeric().withMessage("appId must be numeric"),
    query("count").optional().isInt({ min: 1, max: 20 }).withMessage("count must be between 1 and 20"),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }

      const { appId } = req.params;
      const count = parseInt(req.query.count) || 5;
      const news = await getGameNews(appId, count);

      res.status(200).json({
        success: true,
        appId,
        count: news.length,
        news: news.map((item) => ({
          gid: item.gid,
          title: item.title,
          url: item.url,
          author: item.author || "Unknown",
          feedName: item.feedname,
          feedLabel: item.feedlabel || item.feedname,
          date: new Date(item.date * 1000).toISOString(),
          dateReadable: new Date(item.date * 1000).toLocaleDateString("en-US", {
            year: "numeric", month: "short", day: "numeric",
          }),
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);


router.post("/sync", protect, steamLimiter, async (req, res, next) => {
  try {
    const { steamId } = req.user;
    if (!steamId) {
      return res.status(400).json({ success: false, message: "No Steam account linked." });
    }
    clearUserCache(steamId);
    res.status(200).json({ success: true, message: "Cache cleared. Your library will refresh on next load." });
  } catch (error) {
    next(error);
  }
});


router.get(
  "/game/:appId",
  protect,
  steamLimiter,
  [param("appId").trim().isNumeric().withMessage("appId must be numeric")],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }

      const { appId } = req.params;
      const userId    = req.user._id;

      // Get user's playtime for this game from DB
      const userGame = await UserGame.findOne({ userId, appId });

      // Get current player count — non-fatal if fails
      let playerCount = 0;
      try {
        playerCount = await getCurrentPlayerCount(appId);
      } catch {
        // Steam API unavailable — return 0 instead of failing
      }

      // Get 3 recent news items — non-fatal if fails
      let news = [];
      try {
        news = await getGameNews(appId, 3);
      } catch {
        // News unavailable — return empty array
      }

      // Get achievement summary from DB if already fetched
      const achievementDoc = await Achievement.findOne({ userId, appId });
      const achievementSummary = achievementDoc
        ? achievementDoc.getSummary()
        : null;

      res.status(200).json({
        success: true,
        game: {
          appId,
          name:   userGame?.name || null,
          playtimeHours: userGame
            ? Math.round((userGame.playtimeForever / 60) * 10) / 10
            : 0,
          headerImageUrl: `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`,
          imgIconUrl: userGame?.imgIconUrl || null,
          playerCount,
          news: news.map((item) => ({
            gid: item.gid,
            title: item.title,
            url: item.url,
            date: new Date(item.date * 1000).toISOString(),
          })),
          achievements: achievementSummary,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

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
          lastPlayedAt: game.rtime_last_played
            ? new Date(game.rtime_last_played * 1000)
            : null,
        },
      },
      upsert: true,
    },
  }));
  if (ops.length > 0) await UserGame.bulkWrite(ops);
};

module.exports = router;
