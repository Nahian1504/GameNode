const express = require("express");
const router = express.Router();
const Achievement = require("../models/Achievement");
const { protect } = require("../middleware/authMiddleware");
const { steamLimiter } = require("../middleware/rateLimiter");
const { validateAchievementParam } = require("../middleware/achievementValidation");
const { getPlayerAchievements, getGlobalAchievementPercentages } = require("../utils/steamService");

router.get("/:appId", protect, steamLimiter, validateAchievementParam, async (req, res, next) => {
  try {
    const { appId } = req.params;
    const userId = req.user._id;
    const steamId = req.user.steamId;

    if (!steamId) {
      return res.status(400).json({ success: false, message: "No Steam account linked. Please connect your Steam account first." });
    }

    let rawAchievements;
    try {
      rawAchievements = await getPlayerAchievements(steamId, appId);
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    let globalPercentMap = {};
    try { globalPercentMap = await getGlobalAchievementPercentages(appId); } catch {}

    const formatted = rawAchievements.map((a) => ({
      apiName: a.apiname,
      displayName: a.name || a.apiname,
      description: a.description || "",
      achieved: a.achieved === 1,
      unlockTime: a.unlocktime || 0,
      globalPercent: globalPercentMap[a.apiname] || null,
      iconUrl: a.icon || null,
      iconUrlGray: a.icongray || null,
    }));

    const unlockedCount = formatted.filter((a) => a.achieved).length;
    const existing = await Achievement.findOne({ userId, appId });
    if (existing) {
      existing.achievements = formatted;
      existing.fetchedAt = new Date();
      existing.unlockedCountSnapshot = unlockedCount;
      await existing.save();
    } else {
      await Achievement.create({ userId, appId, achievements: formatted, fetchedAt: new Date(), unlockedCountSnapshot: unlockedCount });
    }

    const summary = {
      total: formatted.length,
      unlocked: unlockedCount,
      locked: formatted.length - unlockedCount,
      percent: formatted.length > 0 ? Math.round((unlockedCount / formatted.length) * 100) : 0,
    };

    res.status(200).json({ success: true, appId, summary, achievements: formatted });
  } catch (error) { next(error); }
});

router.get("/:appId/cached", protect, validateAchievementParam, async (req, res, next) => {
  try {
    const { appId } = req.params;
    const doc = await Achievement.findOne({ userId: req.user._id, appId });
    if (!doc) {
      return res.status(404).json({ success: false, message: "No cached achievements found. Please load achievements first." });
    }
    res.status(200).json({ success: true, appId, summary: doc.getSummary(), achievements: doc.achievements, lastFetched: doc.fetchedAt });
  } catch (error) { next(error); }
});

module.exports = router;
