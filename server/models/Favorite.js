const mongoose = require("mongoose");

const favoriteEntrySchema = new mongoose.Schema({
  appId: { type: String, required: true },
  addedAt: { type: Date, default: Date.now },
}, { _id: false });

const favoriteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  games: [favoriteEntrySchema],
}, { timestamps: true });

favoriteSchema.index({ userId: 1 });

favoriteSchema.methods.addGame = function (appId) {
  if (this.games.some((g) => g.appId === appId)) throw new Error("Game already in favorites.");
  this.games.push({ appId, addedAt: new Date() });
};
favoriteSchema.methods.removeGame = function (appId) {
  const before = this.games.length;
  this.games = this.games.filter((g) => g.appId !== appId);
  if (this.games.length === before) throw new Error("Game not found in favorites.");
};
favoriteSchema.methods.hasGame = function (appId) {
  return this.games.some((g) => g.appId === appId);
};

module.exports = mongoose.model("Favorite", favoriteSchema);
