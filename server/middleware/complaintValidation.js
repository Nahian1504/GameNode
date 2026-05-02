const { body, param, validationResult } = require("express-validator");
const { COMPLAINT_CATEGORIES } = require("../models/Complaint");

const sanitiseText = (val) => {
  if (typeof val !== "string") return val;
  return val
    .replace(/<[^>]*>/g, "")
    .replace(/[<>"'`]/g, "")
    .trim();
};

const validateComplaintBody = [
  body("category")
    .trim()
    .notEmpty().withMessage("Category is required")
    .isIn(COMPLAINT_CATEGORIES)
    .withMessage(`Category must be one of: ${COMPLAINT_CATEGORIES.join(", ")}`),
  body("description")
    .trim()
    .notEmpty().withMessage("Description is required")
    .isLength({ min: 10 }).withMessage("Description must be at least 10 characters")
    .isLength({ max: 500 }).withMessage("Description must not exceed 500 characters")
    .customSanitizer(sanitiseText),
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

const validateStatusUpdate = [
  param("id")
    .trim()
    .isMongoId().withMessage("Invalid complaint ID"),
  body("status")
    .trim()
    .notEmpty().withMessage("Status is required")
    .isIn(["resolved", "escalated"])
    .withMessage("Status must be resolved or escalated"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
      });
    }
    next();
  },
];

module.exports = { validateComplaintBody, validateStatusUpdate };
