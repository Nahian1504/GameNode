const { body, param, validationResult } = require("express-validator");

const sanitise = (val) => { if (typeof val !== "string") return val; return val.replace(/<[^>]*>/g, "").replace(/[<>"'`]/g, "").trim(); };

const validateLeaderboardBody = [
  body("playerName")
    .trim()
    .notEmpty().withMessage("playerName is required")
    .isLength({ max: 50 }).withMessage("playerName must not exceed 50 characters")
    .customSanitizer(sanitise),
  body("game")
    .trim()
    .notEmpty().withMessage("game is required")
    .isLength({ max: 100 }).withMessage("game must not exceed 100 characters")
    .customSanitizer(sanitise),
  body("score")
    .notEmpty().withMessage("score is required")
    .isNumeric().withMessage("score must be a number")
    .isFloat({ min: 0 }).withMessage("score must be 0 or greater"),
  body("notes")
    .optional()
    .isLength({ max: 200 }).withMessage("notes must not exceed 200 characters")
    .customSanitizer(sanitise),
  body("isPublic")
    .optional()
    .isBoolean().withMessage("isPublic must be true or false"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }
    next();
  },
];

const validateLeaderboardId = [
  param("id")
    .trim()
    .notEmpty().withMessage("id is required")
    .isMongoId().withMessage("id must be a valid MongoDB ID"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }
    next();
  },
];

const checkOwnership = (Model) => async (req, res, next) => {
  try {
    const entry = await Model.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, message: "Leaderboard entry not found." });
    }
    if (entry.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Access denied. You do not own this entry." });
    }
    req.leaderboardEntry = entry;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { validateLeaderboardBody, validateLeaderboardId, checkOwnership };
