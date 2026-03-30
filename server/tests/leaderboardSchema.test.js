require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Leaderboard = require("../models/Leaderboard");
const User = require("../models/User");

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  await mongoose.connect(process.env.MONGODB_URI_TEST || "mongodb://localhost:27017/gamenode_test");
});
afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
beforeEach(async () => { await Leaderboard.deleteMany({}); await User.deleteMany({}); });

const uid = () => new mongoose.Types.ObjectId();

describe("Leaderboard Schema Test)", () => {

  test("creates entry with all required fields", async () => {
    const userId = uid();
    const entry  = await Leaderboard.create({ userId, playerName: "ProGamer", game: "Dota 2", score: 9500 });
    expect(entry.playerName).toBe("ProGamer");
    expect(entry.game).toBe("Dota 2");
    expect(entry.score).toBe(9500);
    expect(entry.isPublic).toBe(false);
    expect(entry.notes).toBe("");
  });

  test("rejects entry with missing playerName", async () => {
    await expect(Leaderboard.create({ userId: uid(), game: "Dota 2", score: 100 })).rejects.toThrow();
  });

  test("rejects entry with missing game", async () => {
    await expect(Leaderboard.create({ userId: uid(), playerName: "Pro", score: 100 })).rejects.toThrow();
  });

  test("rejects entry with missing score", async () => {
    await expect(Leaderboard.create({ userId: uid(), playerName: "Pro", game: "Dota 2" })).rejects.toThrow();
  });

  test("rejects negative score", async () => {
    await expect(Leaderboard.create({ userId: uid(), playerName: "Pro", game: "CS2", score: -1 })).rejects.toThrow();
  });

  test("getByUser returns entries sorted by score desc", async () => {
    const userId = uid();
    await Leaderboard.create({ userId, playerName: "A", game: "Dota 2", score: 100 });
    await Leaderboard.create({ userId, playerName: "B", game: "Dota 2", score: 500 });
    await Leaderboard.create({ userId, playerName: "C", game: "Dota 2", score: 250 });
    const entries = await Leaderboard.getByUser(userId);
    expect(entries[0].score).toBe(500);
    expect(entries[1].score).toBe(250);
    expect(entries[2].score).toBe(100);
  });

  test("getByUser filters by game when provided", async () => {
    const userId = uid();
    await Leaderboard.create({ userId, playerName: "A", game: "Dota 2", score: 100 });
    await Leaderboard.create({ userId, playerName: "B", game: "CS2", score: 200 });
    const entries = await Leaderboard.getByUser(userId, "Dota 2");
    expect(entries.length).toBe(1);
    expect(entries[0].game).toBe("Dota 2");
  });

  test("getByUser only returns entries for the given user", async () => {
    const u1 = uid(); const u2 = uid();
    await Leaderboard.create({ userId: u1, playerName: "User1", game: "Dota 2", score: 999 });
    await Leaderboard.create({ userId: u2, playerName: "User2", game: "Dota 2", score: 1 });
    const entries = await Leaderboard.getByUser(u1);
    expect(entries.length).toBe(1);
    expect(entries[0].playerName).toBe("User1");
  });

  test("getPublicByUser returns only public entries", async () => {
    const userId = uid();
    await Leaderboard.create({ userId, playerName: "A", game: "Dota 2", score: 100, isPublic: true });
    await Leaderboard.create({ userId, playerName: "B", game: "CS2", score: 200, isPublic: false });
    const entries = await Leaderboard.getPublicByUser(userId);
    expect(entries.length).toBe(1);
    expect(entries[0].playerName).toBe("A");
  });

  test("can update entry score and save", async () => {
    const userId = uid();
    const entry  = await Leaderboard.create({ userId, playerName: "Pro", game: "Dota 2", score: 100 });
    entry.score  = 999;
    await entry.save();
    const updated = await Leaderboard.findById(entry._id);
    expect(updated.score).toBe(999);
  });

  test("can delete entry", async () => {
    const userId = uid();
    const entry  = await Leaderboard.create({ userId, playerName: "Pro", game: "Dota 2", score: 100 });
    await entry.deleteOne();
    const found  = await Leaderboard.findById(entry._id);
    expect(found).toBeNull();
  });

  test("userId index exists for query performance", async () => {
    const indexes = await Leaderboard.collection.indexes();
    const hasUserIdx = indexes.some((idx) => idx.key && idx.key.userId !== undefined);
    expect(hasUserIdx).toBe(true);
  });
});
