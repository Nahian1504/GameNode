const express = require("express");
const router = express.Router();
const { param, validationResult } = require("express-validator");
const Leaderboard = require("../models/Leaderboard");
const { generateCSV } = require("../utils/csvExport");

const validateUserId = [
  param("userId").trim().isMongoId().withMessage("userId must be a valid ID"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }
    next();
  },
];

// No JWT required
router.get("/:userId", validateUserId, async (req, res, next) => {
  try {
    const entries = await Leaderboard.getPublicByUser(req.params.userId);
    res.status(200).json({
      success: true,
      userId: req.params.userId,
      entries,
      total: entries.length,
    });
  } catch (error) { next(error); }
});

// Download as CSV
router.get("/:userId/csv", validateUserId, async (req, res, next) => {
  try {
    const entries = await Leaderboard.getPublicByUser(req.params.userId);
    const csv = generateCSV(entries);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="leaderboard_${req.params.userId}.csv"`);
    res.status(200).send(csv);
  } catch (error) { next(error); }
});

module.exports = router;
