const mongoose = require("mongoose");
const achievementSchema = new mongoose.Schema({
  apiName: { type: String, required: true },
  displayName: { type: String, default: "" },
  description: { type: String, default: "" },
  achieved: { type: Boolean, default: false },
  unlockTime: { type: Number, default: 0 },
  globalPercent:{ type: Number, default: null },
  iconUrl: { type: String, default: null },
  iconUrlGray: { type: String, default: null },
}, { _id: false });

const userAchievementSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  appId: { type: String, required: true },
  gameName: { type: String, default: "" },
  achievements: [achievementSchema],
  fetchedAt: { type: Date, default: Date.now },
  unlockedCountSnapshot: { type: Number, default: 0 },
}, { timestamps: true });

userAchievementSchema.index({ userId: 1, appId: 1 }, { unique: true });
userAchievementSchema.index({ userId: 1 });

userAchievementSchema.methods.getSummary = function () {
  const total = this.achievements.length;
  const unlocked = this.achievements.filter((a) => a.achieved).length;
  const percent  = total > 0 ? Math.round((unlocked / total) * 100) : 0;
  return { total, unlocked, locked: total - unlocked, percent };
};
userAchievementSchema.methods.getNewUnlocks = function () {
  const current = this.achievements.filter((a) => a.achieved).length;
  return Math.max(0, current - this.unlockedCountSnapshot);
};

module.exports = mongoose.model("Achievement", userAchievementSchema);
