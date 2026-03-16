const mongoose = require("mongoose");

const gameSchema = new mongoose.Schema(
  {
    // Steam App ID — unique identifier for each game
    appId: {
      type: String,
      required: true,
      unique: true,
    },

    // Game metadata from Steam API
    name: {
      type: String,
      required: true,
      trim: true,
    },
    imgIconUrl: {
      type: String,
      default: null,
    },
    imgLogoUrl: {
      type: String,
      default: null,
    },

    lastFetchedAt: {
      type: Date,
      default: Date.now,
    },

    // Current player count (refreshed periodically)
    currentPlayerCount: {
      type: Number,
      default: 0,
    },
    playerCountUpdatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// User-Game relationship schema
// Tracks which games a user owns and their playtime
const userGameSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Steam App ID
    appId: {
      type: String,
      required: true,
    },

    // Game name 
    name: {
      type: String,
      required: true,
    },

    // Playtime in minutes (from Steam API)
    playtimeForever: {
      type: Number,
      default: 0,
    },

    // Last time Steam API was queried for this user's games
    lastSynced: {
      type: Date,
      default: Date.now,
    },

    imgIconUrl: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

userGameSchema.index({ userId: 1, appId: 1 }, { unique: true });
userGameSchema.index({ userId: 1 });

const Game = mongoose.model("Game", gameSchema);
const UserGame = mongoose.model("UserGame", userGameSchema);

module.exports = { Game, UserGame };
