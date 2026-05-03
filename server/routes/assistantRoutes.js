const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { assistantLimiter } = require("../middleware/rateLimiter");
const { validateAssistantMessage } = require("../middleware/assistantValidation");
const { generateAssistantResponse } = require("../utils/genAIService");
const { getUserContextForAssistant } = require("../utils/assistantContext");

router.post("/", protect, assistantLimiter, validateAssistantMessage, async (req, res, next) => {
  try {
    const { message, sessionHistory = [] } = req.body;
    const userId = req.user._id;

    const userContext = await getUserContextForAssistant(userId);

    let response;
    try {
      response = await generateAssistantResponse(message, userContext, sessionHistory);
    } catch (aiError) {
      console.error("GenAI assistant failed:", aiError.message);

      const isRateLimit = aiError.message?.includes("rate limit") ||
                          aiError.response?.status === 429;

      return res.status(503).json({
        success: false,
        message: isRateLimit
          ? "AI rate limit reached. Please wait a minute and try again."
          : "The AI assistant is temporarily unavailable. Please try again in a moment.",
      });
    }

    res.status(200).json({
      success: true,
      response,
      role: "assistant",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;