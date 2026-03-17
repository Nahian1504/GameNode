const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");

const User = require("../models/User");
const { hashPassword, comparePassword } = require("../utils/passwordUtils");
const { authLimiter } = require("../middleware/rateLimiter");

// Input Validation Rules 
const registerValidation = [
  body("username")
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage("Username must be between 3 and 20 characters")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers, and underscores"),
  body("email")
    .trim()
    .isEmail()
    .withMessage("Please enter a valid email address")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/[0-9]/)
    .withMessage("Password must contain at least one number")
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage("Password must contain at least one special character"),
];

const loginValidation = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("Please enter a valid email address")
    .normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

const getValidationErrors = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errors.array().map((e) => e.msg);
  }
  return null;
};


router.post("/register", authLimiter, registerValidation, async (req, res, next) => {
  try {
    // Validate input
    const validationErrors = getValidationErrors(req);
    if (validationErrors) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    const { username, email, password } = req.body;

    // Check for duplicate email or username 
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      const field = existingUser.email === email ? "email" : "username";
      return res.status(409).json({
        success: false,
        message: `This ${field} is already registered.`,
      });
    }

    // Hash password 
    const passwordHash = await hashPassword(password);

    // Create user in MongoDB 
    const user = await User.create({
      username,
      email,
      passwordHash,
    });

    // Generate JWT token 
    const token = generateToken({
      userId: user._id,
      email: user.email,
      role: user.role,
    });

    // Return success 
    res.status(201).json({
      success: true,
      message: "Account created successfully. Welcome to GameNode!",
      token,
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
});


router.post("/login", authLimiter, loginValidation, async (req, res, next) => {
  try {
    // Validate input
    const validationErrors = getValidationErrors(req);
    if (validationErrors) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    const { email, password } = req.body;

    // Find user by email 
    const user = await User.findOne({ email }).select("+passwordHash");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Compare password with stored hash 
    const isPasswordValid = await comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Generate JWT token 
    const token = generateToken({
      userId: user._id,
      email: user.email,
      role: user.role,
    });

    // Return token and safe user object
    res.status(200).json({
      success: true,
      message: "Login successful. Welcome back!",
      token,
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
