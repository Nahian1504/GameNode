const { body, validationResult } = require("express-validator");

const sanitiseMessage = (val) => {
  if (typeof val !== "string") return val;
  return val.replace(/<[^>]*>/g, "").replace(/[<>"'`]/g, "").trim();
};

const validateAssistantMessage = [
  body("message")
    .trim()
    .notEmpty().withMessage("Message is required")
    .isLength({ max: 300 }).withMessage("Message must not exceed 300 characters")
    .customSanitizer(sanitiseMessage),
  body("sessionHistory")
    .optional()
    .isArray().withMessage("sessionHistory must be an array")
    .isArray({ max: 20 }).withMessage("Session history cannot exceed 20 messages"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        statusCode: 400,
      });
    }
    next();
  },
];

module.exports = { validateAssistantMessage };