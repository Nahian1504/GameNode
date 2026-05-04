const { param, validationResult } = require("express-validator");

const validateAchievementParam = [
  param("appId").trim().notEmpty().withMessage("appId is required")
    .isNumeric().withMessage("appId must be numeric")
    .isLength({ min: 1, max: 10 }).withMessage("appId must be between 1 and 10 digits"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }
    next();
  },
];

module.exports = { validateAchievementParam };