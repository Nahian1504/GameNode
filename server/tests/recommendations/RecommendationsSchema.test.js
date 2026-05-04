require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Recommendation = require("../models/Recommendation");
const { getUserBehaviorData, getTopGamesByPlaytime, getTotalLibrarySize } = require("../models/Recommendation");
const { UserGame } = require("../models/Game");
const User = require("../models/User");

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  await mongoose.connect(process.env.MONGODB_URI_TEST || "mongodb://localhost:27017/gamenode_test");
});
afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
beforeEach(async () => { await Recommendation.deleteMany({}); await UserGame.deleteMany({}); await User.deleteMany({}); });

const uid = () => new mongoose.Types.ObjectId();

const MOCK_RECS = [
  { name: "Hollow Knight", reason: "Matches your love of challenging games", matchPercent: 92, genre: "Metroidvania" },
  { name: "Hades", reason: "Fast paced action like your top games",  matchPercent: 88, genre: "Roguelike"   },
];

describe("Recommendation Schema Test", () => {

  test("upsertForUser creates new cache entry", async () => {
    const userId = uid();
    const doc = await Recommendation.upsertForUser(userId, MOCK_RECS);
    expect(doc.recommendations.length).toBe(2);
    expect(doc.recommendations[0].name).toBe("Hollow Knight");
    expect(doc.expiresAt).toBeDefined();
  });

  test("upsertForUser sets expiry 24 hours from now", async () => {
    const userId = uid();
    const before = Date.now();
    const doc = await Recommendation.upsertForUser(userId, MOCK_RECS);
    const diff = doc.expiresAt.getTime() - before;
    expect(diff).toBeGreaterThan(23 * 60 * 60 * 1000);
    expect(diff).toBeLessThan(25 * 60 * 60 * 1000);
  });

  test("isExpired returns false for fresh cache", async () => {
    const userId = uid();
    const doc = await Recommendation.upsertForUser(userId, MOCK_RECS);
    expect(doc.isExpired()).toBe(false);
  });

  test("isExpired returns true for expired cache", async () => {
    const userId = uid();
    const doc = await Recommendation.upsertForUser(userId, MOCK_RECS);
    doc.expiresAt = new Date(Date.now() - 1000);
    expect(doc.isExpired()).toBe(true);
  });

  test("getValidForUser returns null when no cache exists", async () => {
    const result = await Recommendation.getValidForUser(uid());
    expect(result).toBeNull();
  });

  test("getValidForUser returns doc for valid cache", async () => {
    const userId = uid();
    await Recommendation.upsertForUser(userId, MOCK_RECS);
    const result = await Recommendation.getValidForUser(userId);
    expect(result).not.toBeNull();
    expect(result.recommendations.length).toBe(2);
  });

  test("getValidForUser returns null for expired cache", async () => {
    const userId = uid();
    await Recommendation.create({ userId, recommendations: MOCK_RECS, generatedAt: new Date(), expiresAt: new Date(Date.now() - 1000) });
    const result = await Recommendation.getValidForUser(userId);
    expect(result).toBeNull();
  });

  test("upsertForUser updates existing entry", async () => {
    const userId = uid();
    await Recommendation.upsertForUser(userId, MOCK_RECS);
    const newRecs = [{ name: "Celeste", reason: "Platformer", matchPercent: 80, genre: "Platformer" }];
    const updated = await Recommendation.upsertForUser(userId, newRecs);
    expect(updated.recommendations.length).toBe(1);
    expect(updated.recommendations[0].name).toBe("Celeste");
  });

  test("unique index prevents two cache entries per user", async () => {
    const userId = uid();
    await Recommendation.create({ userId, recommendations: MOCK_RECS, generatedAt: new Date(), expiresAt: new Date(Date.now() + 86400000) });
    await expect(Recommendation.create({ userId, recommendations: MOCK_RECS, generatedAt: new Date(), expiresAt: new Date(Date.now() + 86400000) })).rejects.toThrow();
  });
});

describe("User behavior aggregation queries Schema Test", () => {

  test("getTopGamesByPlaytime returns games sorted by playtime", async () => {
    const userId = uid();
    await UserGame.create({ userId, appId: "570", name: "Dota 2", playtimeForever: 1200 });
    await UserGame.create({ userId, appId: "730", name: "CS2", playtimeForever: 600 });
    await UserGame.create({ userId, appId: "440", name: "TF2", playtimeForever: 300 });
    const result = await getTopGamesByPlaytime(userId, 3);
    expect(result[0].name).toBe("Dota 2");
    expect(result[0].hours).toBe(20);
    expect(result.length).toBe(3);
  });

  test("getTotalLibrarySize returns correct count", async () => {
    const userId = uid();
    await UserGame.create({ userId, appId: "570", name: "Dota 2", playtimeForever: 100 });
    await UserGame.create({ userId, appId: "730", name: "CS2", playtimeForever: 200 });
    const count = await getTotalLibrarySize(userId);
    expect(count).toBe(2);
  });

  test("getTotalLibrarySize returns 0 for user with no games", async () => {
    const count = await getTotalLibrarySize(uid());
    expect(count).toBe(0);
  });

  test("getUserBehaviorData returns complete behavior object", async () => {
    const userId = uid();
    await UserGame.create({ userId, appId: "570", name: "Dota 2", playtimeForever: 1200 });
    await UserGame.create({ userId, appId: "730", name: "CS2", playtimeForever: 600 });
    const data = await getUserBehaviorData(userId);
    expect(data).toHaveProperty("topGames");
    expect(data).toHaveProperty("totalGames", 2);
    expect(data).toHaveProperty("totalPlaytimeHours");
    expect(data).toHaveProperty("favoriteGames");
    expect(data).toHaveProperty("topAchievementGames");
  });
});
