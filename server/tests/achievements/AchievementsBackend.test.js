jest.mock("../utils/steamService", () => ({
  getOwnedGames: jest.fn(), getCurrentPlayerCount: jest.fn(),
  getPlayerSummary: jest.fn(), getGameNews: jest.fn(),
  clearUserCache: jest.fn(), getGameDetail: jest.fn(),
  getPlayerAchievements: jest.fn(), getGlobalAchievementPercentages: jest.fn(),
}));

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const request = require("supertest");
const mongoose = require("mongoose");
const { app, server } = require("../index");
const User = require("../models/User");
const { UserGame } = require("../models/Game");
const Achievement = require("../models/Achievement");
const { getPlayerAchievements, getGlobalAchievementPercentages } = require("../utils/steamService");

const MOCK_STEAM_ID = "76561198000000011";
const MOCK_RAW_ACHIEVEMENTS = [
  { apiname: "ACH_WIN_1", name: "First Win", description: "Win 1 game", achieved: 1, unlocktime: 1700000000, icon: null, icongray: null },
  { apiname: "ACH_WIN_10", name: "Ten Wins", description: "Win 10 games", achieved: 1, unlocktime: 1699000000, icon: null, icongray: null },
  { apiname: "ACH_WIN_100",name: "Hundred Wins", description: "Win 100 games",achieved: 0, unlocktime: 0, icon: null, icongray: null },
];
const MOCK_GLOBAL_PERCENTS = { ACH_WIN_1: 85.0, ACH_WIN_10: 45.5, ACH_WIN_100: 4.2 };

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  await mongoose.connect(process.env.MONGODB_URI_TEST || "mongodb://localhost:27017/gamenode_test");
});
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  server.close();
});
beforeEach(async () => {
  await User.deleteMany({});
  await UserGame.deleteMany({});
  await Achievement.deleteMany({});
  jest.clearAllMocks();
});

const setupUser = async () => {
  const res = await request(app).post("/api/auth/register").send({ username: "dhruv8", email: "dhruv8@test.com", password: "SecurePass1!" });
  const token = res.body.token;
  const userId = res.body.user._id;
  await User.findByIdAndUpdate(userId, { steamId: MOCK_STEAM_ID });
  return { token, userId };
};

describe("Achienvement endpoint Test", () => {

  test("should return achievements with summary", async () => {
    const { token } = await setupUser();
    getPlayerAchievements.mockResolvedValueOnce(MOCK_RAW_ACHIEVEMENTS);
    getGlobalAchievementPercentages.mockResolvedValueOnce(MOCK_GLOBAL_PERCENTS);

    const res = await request(app)
      .get("/api/achievements/570")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.achievements.length).toBe(3);
    expect(res.body.summary.total).toBe(3);
    expect(res.body.summary.unlocked).toBe(2);
    expect(res.body.summary.locked).toBe(1);
    expect(res.body.summary.percent).toBe(67);
  });

  test("should save achievement snapshot to MongoDB", async () => {
    const { token, userId } = await setupUser();
    getPlayerAchievements.mockResolvedValueOnce(MOCK_RAW_ACHIEVEMENTS);
    getGlobalAchievementPercentages.mockResolvedValueOnce({});

    await request(app).get("/api/achievements/570").set("Authorization", `Bearer ${token}`);

    const doc = await Achievement.findOne({ userId, appId: "570" });
    expect(doc).not.toBeNull();
    expect(doc.achievements.length).toBe(3);
  });

  test("should include globalPercent in each achievement", async () => {
    const { token } = await setupUser();
    getPlayerAchievements.mockResolvedValueOnce(MOCK_RAW_ACHIEVEMENTS);
    getGlobalAchievementPercentages.mockResolvedValueOnce(MOCK_GLOBAL_PERCENTS);

    const res = await request(app)
      .get("/api/achievements/570")
      .set("Authorization", `Bearer ${token}`);

    const ach = res.body.achievements.find((a) => a.apiName === "ACH_WIN_1");
    expect(ach.globalPercent).toBe(85.0);
  });

  test("should update existing snapshot on second call", async () => {
    const { token, userId } = await setupUser();
    getPlayerAchievements.mockResolvedValueOnce(MOCK_RAW_ACHIEVEMENTS);
    getGlobalAchievementPercentages.mockResolvedValueOnce({});
    await request(app).get("/api/achievements/570").set("Authorization", `Bearer ${token}`);

    // All achievements unlocked now
    const allUnlocked = MOCK_RAW_ACHIEVEMENTS.map((a) => ({ ...a, achieved: 1, unlocktime: 1700000000 }));
    getPlayerAchievements.mockResolvedValueOnce(allUnlocked);
    getGlobalAchievementPercentages.mockResolvedValueOnce({});
    await request(app).get("/api/achievements/570").set("Authorization", `Bearer ${token}`);

    const doc = await Achievement.findOne({ userId, appId: "570" });
    expect(doc.achievements.every((a) => a.achieved)).toBe(true);
  });

  test("should return 400 when Steam achievements not available", async () => {
    const { token } = await setupUser();
    getPlayerAchievements.mockRejectedValueOnce(new Error("Achievements not available for this game."));

    const res = await request(app)
      .get("/api/achievements/570")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/not available/i);
  });

  test("cached endpoint returns 404 when no cached data", async () => {
    const { token } = await setupUser();
    const res = await request(app)
      .get("/api/achievements/570/cached")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(404);
  });

  test("cached endpoint returns data after first fetch", async () => {
    const { token } = await setupUser();
    getPlayerAchievements.mockResolvedValueOnce(MOCK_RAW_ACHIEVEMENTS);
    getGlobalAchievementPercentages.mockResolvedValueOnce({});
    await request(app).get("/api/achievements/570").set("Authorization", `Bearer ${token}`);

    const cachedRes = await request(app)
      .get("/api/achievements/570/cached")
      .set("Authorization", `Bearer ${token}`);

    expect(cachedRes.statusCode).toBe(200);
    expect(cachedRes.body.achievements.length).toBe(3);
    expect(cachedRes.body).toHaveProperty("lastFetched");
  });
});
