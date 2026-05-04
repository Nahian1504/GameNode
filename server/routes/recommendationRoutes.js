const express = require("express");
const router = express.Router();

const Recommendation = require("../models/Recommendation");
const { getUserBehaviorData } = require("../models/Recommendation");
const { protect } = require("../middleware/authMiddleware");
const { recommendationLimiter } = require("../middleware/rateLimiter");
const { generateRecommendations } = require("../utils/genAIService");

router.post("/", protect, recommendationLimiter, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const forceRefresh = req.body.forceRefresh === true; 

    if (!forceRefresh) { 
      const cached = await Recommendation.getValidForUser(userId);
      if (cached) {
        return res.status(200).json({
          success: true,
          source: "cache",
          recommendations: cached.recommendations,
          generatedAt: cached.generatedAt,
          expiresAt: cached.expiresAt,
        });
      }
    } else {
      await Recommendation.deleteOne({ userId });
    }

    // Aggregate user behavior data 
    const userBehavior = await getUserBehaviorData(userId);

    if (userBehavior.totalGames < 3) {
      return res.status(200).json({
        success: true,
        source: "fallback",
        recommendations: [],
        message: "Connect your Steam account and play at least 3 games to get personalized recommendations.",
      });
    }

    // Call GenAI API 
    let recommendations;
    try {
      recommendations = await generateRecommendations(userBehavior);
    } catch (aiError) {
      console.error("GenAI recommendations failed:", aiError.message);
      return res.status(503).json({
        success: false,
        message: "Recommendation service is temporarily unavailable. Please try again later.",
      });
    }

    // Cache the result 
    const saved = await Recommendation.upsertForUser(userId, recommendations);

    res.status(200).json({
      success: true,
      source: "generated",
      recommendations,
      generatedAt: saved.generatedAt,
      expiresAt: saved.expiresAt,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/cached", protect, async (req, res, next) => {
  try {
    const cached = await Recommendation.getValidForUser(req.user._id);
    if (!cached) {
      return res.status(404).json({
        success: false,
        message: "No cached recommendations found. Please generate recommendations first.",
      });
    }
    res.status(200).json({
      success: true,
      source: "cache",
      recommendations: cached.recommendations,
      generatedAt: cached.generatedAt,
      expiresAt: cached.expiresAt,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
