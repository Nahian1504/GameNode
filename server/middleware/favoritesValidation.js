const { body, param, validationResult } = require("express-validator");

const validateFavoritesBody = [
  body("appId").trim().notEmpty().withMessage("appId is required").isNumeric().withMessage("appId must be numeric"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });
    next();
  },
];
const validateFavoritesParam = [
  param("appId").trim().notEmpty().withMessage("appId is required").isNumeric().withMessage("appId must be numeric"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });
    next();
  },
];

module.exports = { validateFavoritesBody, validateFavoritesParam };