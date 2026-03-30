const mongoose = require("mongoose");

const leaderboardSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  playerName: { type: String, required: true, trim: true, maxlength: 50 },
  game: { type: String, required: true, trim: true, maxlength: 100 },
  score: { type: Number, required: true, min: 0 },
  rank: { type: Number, default: null },
  notes: { type: String, default: "", maxlength: 200 },
  isPublic: { type: Boolean, default: false },
}, { timestamps: true });

leaderboardSchema.index({ userId: 1 });
leaderboardSchema.index({ game: 1, score: -1 });
leaderboardSchema.index({ userId: 1, game: 1 });

// Static: get leaderboard sorted by score desc, filtered by game optionally
leaderboardSchema.statics.getByUser = function (userId, game = null) {
  const filter = { userId };
  if (game) filter.game = game;
  return this.find(filter).sort({ score: -1 });
};

leaderboardSchema.statics.getPublicByUser = function (userId) {
  return this.find({ userId, isPublic: true }).sort({ score: -1 });
};

module.exports = mongoose.model("Leaderboard", leaderboardSchema);