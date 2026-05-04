require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const { getUserContextForAssistant } = require("../utils/assistantContext");
const { UserGame } = require("../models/Game");
const Achievement = require("../models/Achievement");
const User = require("../models/User");

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  await mongoose.connect(process.env.MONGODB_URI_TEST || "mongodb://localhost:27017/gamenode_test");
});
afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
beforeEach(async () => { await UserGame.deleteMany({}); await Achievement.deleteMany({}); await User.deleteMany({}); });

const uid = () => new mongoose.Types.ObjectId();

describe("AI Assistant Schema Test", () => {

  test("returns context object with all required fields", async () => {
    const userId = uid();
    const ctx = await getUserContextForAssistant(userId);
    expect(ctx).toHaveProperty("topGames");
    expect(ctx).toHaveProperty("totalGames");
    expect(ctx).toHaveProperty("totalPlaytimeHours");
    expect(ctx).toHaveProperty("recentAchievements");
  });

  test("returns correct totalGames count", async () => {
    const userId = uid();
    await UserGame.create({ userId, appId: "570", name: "Dota 2", playtimeForever: 1200 });
    await UserGame.create({ userId, appId: "730", name: "CS2", playtimeForever: 600 });
    const ctx = await getUserContextForAssistant(userId);
    expect(ctx.totalGames).toBe(2);
  });

  test("returns top 3 games by playtime in descending order", async () => {
    const userId = uid();
    await UserGame.create({ userId, appId: "570", name: "Dota 2", playtimeForever: 1200 });
    await UserGame.create({ userId, appId: "730", name: "CS2", playtimeForever: 600 });
    await UserGame.create({ userId, appId: "440", name: "TF2", playtimeForever: 300 });
    await UserGame.create({ userId, appId: "400", name: "Portal", playtimeForever: 120 });
    const ctx = await getUserContextForAssistant(userId);
    expect(ctx.topGames.length).toBe(3);
    expect(ctx.topGames[0].name).toBe("Dota 2");
    expect(ctx.topGames[0].hours).toBe(20);
  });

  test("returns correct totalPlaytimeHours", async () => {
    const userId = uid();
    await UserGame.create({ userId, appId: "570", name: "Dota 2", playtimeForever: 1200 });
    await UserGame.create({ userId, appId: "730", name: "CS2", playtimeForever: 600 });
    const ctx = await getUserContextForAssistant(userId);
    expect(ctx.totalPlaytimeHours).toBe(30);
  });

  test("returns empty arrays for user with no games", async () => {
    const ctx = await getUserContextForAssistant(uid());
    expect(ctx.topGames).toEqual([]);
    expect(ctx.totalGames).toBe(0);
    expect(ctx.totalPlaytimeHours).toBe(0);
    expect(ctx.recentAchievements).toEqual([]);
  });

  test("returns recent achievements sorted by unlock time", async () => {
    const userId = uid();
    await Achievement.create({
      userId, appId: "570",
      achievements: [
        { apiName: "A1", displayName: "First Win", achieved: true, unlockTime: 1700000000 },
        { apiName: "A2", displayName: "10 Wins", achieved: true, unlockTime: 1699000000 },
        { apiName: "A3", displayName: "Locked", achieved: false, unlockTime: 0 },
      ],
    });
    const ctx = await getUserContextForAssistant(userId);
    expect(ctx.recentAchievements.length).toBe(2);
    expect(ctx.recentAchievements[0].name).toBe("First Win");
  });

  test("limits recentAchievements to 5 items", async () => {
    const userId = uid();
    const achievements = Array.from({ length: 8 }, (_, i) => ({
      apiName: `ACH_${i}`, displayName: `Achievement ${i}`,
      achieved: true, unlockTime: 1700000000 - i * 1000,
    }));
    await Achievement.create({ userId, appId: "570", achievements });
    const ctx = await getUserContextForAssistant(userId);
    expect(ctx.recentAchievements.length).toBeLessThanOrEqual(5);
  });
});
