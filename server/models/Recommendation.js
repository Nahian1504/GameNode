const mongoose = require("mongoose");

const recommendationItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  reason: { type: String, required: true },
  matchPercent: { type: Number, required: true, min: 0, max: 100 },
  genre: { type: String, default: "" },
}, { _id: false });

const recommendationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    recommendations: [recommendationItemSchema],
    generatedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

recommendationSchema.index({ userId: 1 });
recommendationSchema.index({ expiresAt: 1 });

// Check if cache is still valid
recommendationSchema.methods.isExpired = function () {
  return new Date() > this.expiresAt;
};

// Upsert cache entry — 24h expiry
recommendationSchema.statics.upsertForUser = async function (userId, recommendations) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return this.findOneAndUpdate(
    { userId },
    { $set: { recommendations, generatedAt: new Date(), expiresAt } },
    { upsert: true, new: true }
  );
};

// Non-expired cache for user
recommendationSchema.statics.getValidForUser = async function (userId) {
  const doc = await this.findOne({ userId });
  if (!doc || doc.isExpired()) return null;
  return doc;
};

module.exports = mongoose.model("Recommendation", recommendationSchema);

const { UserGame } = require("./Game");
const Favorite = require("./Favorite");
const Achievement = require("./Achievement");

// Top N games by playtime for the user
const getTopGamesByPlaytime = async (userId, limit = 5) => {
  const games = await UserGame.find({ userId })
    .sort({ playtimeForever: -1 })
    .limit(limit)
    .lean();
  return games.map((g) => ({
    name: g.name,
    hours: Math.round(g.playtimeForever / 60),
    appId: g.appId,
  }));
};

// Games with highest achievement completion rate
const getTopAchievementGames = async (userId, limit = 3) => {
  const docs = await Achievement.find({ userId }).lean();
  if (!docs.length) return [];

  return docs
    .map((d) => {
      const total = d.achievements.length;
      const unlocked = d.achievements.filter((a) => a.achieved).length;
      const percent = total > 0 ? Math.round((unlocked / total) * 100) : 0;
      return { appId: d.appId, percent, unlocked, total };
    })
    .sort((a, b) => b.percent - a.percent)
    .slice(0, limit)
    .map((d) => ({ appId: d.appId, name: `App ${d.appId}`, percent: d.percent }));
};

// User's favorite games
const getFavoriteGameNames = async (userId) => {
  const doc = await Favorite.findOne({ userId }).lean();
  if (!doc || !doc.games.length) return [];
  const appIds = doc.games.slice(0, 5).map((g) => g.appId);
  const games = await UserGame.find({ userId, appId: { $in: appIds } }).lean();
  return games.map((g) => ({ name: g.name, appId: g.appId }));
};

// Total library size
const getTotalLibrarySize = async (userId) => {
  return UserGame.countDocuments({ userId });
};

const getUserBehaviorData = async (userId) => {
  const [topGames, topAchievementGames, favoriteGames, totalGames] = await Promise.all([
    getTopGamesByPlaytime(userId),
    getTopAchievementGames(userId),
    getFavoriteGameNames(userId),
    getTotalLibrarySize(userId),
  ]);

  const totalPlaytimeHours = topGames.reduce((sum, g) => sum + g.hours, 0);

  return {
    topGames,
    topAchievementGames,
    favoriteGames,
    totalGames,
    totalPlaytimeHours,
  };
};

module.exports.getUserBehaviorData = getUserBehaviorData;
module.exports.getTopGamesByPlaytime = getTopGamesByPlaytime;
module.exports.getTotalLibrarySize = getTotalLibrarySize;