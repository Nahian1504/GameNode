const express = require("express");
const router = express.Router();
const { param, query, validationResult } = require("express-validator");
const { protect } = require("../middleware/authMiddleware");
const { newsLimiter } = require("../middleware/rateLimiter");
const { getGameNews } = require("../utils/steamService");
const NewsCache = require("../models/NewsCache");

const newsValidation = [
  param("appId").trim().isNumeric().withMessage("appId must be numeric"),
  query("count").optional().isInt({ min: 1, max: 20 }).withMessage("count must be between 1 and 20"),
];

router.get("/:appId", protect, newsLimiter, newsValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }
    const { appId } = req.params;
    const count = parseInt(req.query.count) || 5;

    const cached = await NewsCache.findOne({ appId });
    if (cached && !cached.isExpired()) {
      return res.status(200).json({ success: true, appId, source: "cache", count: cached.newsItems.length, news: cached.newsItems });
    }

    let news;
    try {
      news = await getGameNews(appId, count);
    } catch {
      if (cached) {
        return res.status(200).json({ success: true, appId, source: "stale-cache", count: cached.newsItems.length, news: cached.newsItems });
      }
      return res.status(503).json({ success: false, message: "News service is temporarily unavailable." });
    }

    const formatted = news.map((item) => ({
      gid: item.gid,
      title: item.title,
      url: item.url,
      author: item.author || "Unknown",
      feedName: item.feedname,
      date: new Date(item.date * 1000).toISOString(),
      dateReadable: new Date(item.date * 1000).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
    }));

    if (cached) { cached.newsItems = formatted; cached.fetchedAt = new Date(); await cached.save(); }
    else { await NewsCache.create({ appId, newsItems: formatted }); }

    res.status(200).json({ success: true, appId, source: "steam-api", count: formatted.length, news: formatted });
  } catch (error) { next(error); }
});

module.exports = router;
