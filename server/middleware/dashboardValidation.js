const { query, validationResult } = require("express-validator");
const VALID_SORT_VALUES = ["playtime", "name", "recent"];

const validateDashboardQuery = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be between 1 and 50"),
  query("sort")
    .optional()
    .isIn(VALID_SORT_VALUES)
    .withMessage(`Sort must be one of: ${VALID_SORT_VALUES.join(", ")}`),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array().map((e) => e.msg),
      });
    }
    next();
  },
];

module.exports = { validateDashboardQuery };