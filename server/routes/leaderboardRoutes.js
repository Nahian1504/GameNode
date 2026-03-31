const express = require("express");
const router = express.Router();
const Leaderboard = require("../models/Leaderboard");
const { protect } = require("../middleware/authMiddleware");
const { leaderboardLimiter } = require("../middleware/rateLimiter");
const { validateLeaderboardBody, validateLeaderboardId, checkOwnership } = require("../middleware/leaderboardValidation");

// Gets all entries for the current user
router.get("/", protect, async (req, res, next) => {
  try {
    const { game } = req.query;
    const entries = await Leaderboard.getByUser(req.user._id, game || null);
    res.status(200).json({ success: true, entries, total: entries.length });
  } catch (error) { next(error); }
});


router.post("/", protect, leaderboardLimiter, validateLeaderboardBody, async (req, res, next) => {
  try {
    const { playerName, game, score, notes, isPublic } = req.body;
    const entry = await Leaderboard.create({
      userId: req.user._id, playerName, game, score,
      notes: notes || "", isPublic: isPublic || false,
    });
    res.status(201).json({ success: true, message: "Leaderboard entry created.", entry });
  } catch (error) { next(error); }
});

// Updates an existing entry 
router.put("/:id", protect, leaderboardLimiter, validateLeaderboardId,
  checkOwnership(Leaderboard), validateLeaderboardBody,
  async (req, res, next) => {
    try {
      const { playerName, game, score, notes, isPublic } = req.body;
      const entry = req.leaderboardEntry;
      entry.playerName = playerName;
      entry.game = game;
      entry.score = score;
      if (notes !== undefined) entry.notes = notes;
      if (isPublic !== undefined) entry.isPublic = isPublic;
      await entry.save();
      res.status(200).json({ success: true, message: "Leaderboard entry updated.", entry });
    } catch (error) { next(error); }
  }
);

// Deletes an entry 
router.delete("/:id", protect, leaderboardLimiter, validateLeaderboardId,
  checkOwnership(Leaderboard),
  async (req, res, next) => {
    try {
      await req.leaderboardEntry.deleteOne();
      res.status(200).json({ success: true, message: "Leaderboard entry deleted.", id: req.params.id });
    } catch (error) { next(error); }
  }
);

module.exports = router;
