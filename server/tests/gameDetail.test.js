jest.mock("../utils/steamService", () => ({
  getOwnedGames: jest.fn(),
  getCurrentPlayerCount: jest.fn(),
  getPlayerSummary: jest.fn(),
  getGameNews: jest.fn(),
  clearUserCache: jest.fn(),
  getGameDetail: jest.fn(),
  getPlayerAchievements: jest.fn(),
  getGlobalAchievementPercentages: jest.fn(),
}));

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const request = require("supertest");
const mongoose = require("mongoose");
const { app, server } = require("../index");
const User = require("../models/User");
const { UserGame } = require("../models/Game");
const Achievement = require("../models/Achievement");
const { getCurrentPlayerCount, getGameNews } = require("../utils/steamService");

const MOCK_STEAM_ID = "76561198000000003";
const MOCK_NEWS_ITEMS = [
  { gid: "1", title: "Big Update", url: "https://steam.com/1", author: "Valve", feedname: "ann", date: 1700000000 },
  { gid: "2", title: "Patch Notes", url: "https://steam.com/2", author: "Valve", feedname: "ann", date: 1699000000 },
];

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
  const res = await request(app).post("/api/auth/register").send({ username: "akshitha7", email: "akshitha7@test.com", password: "SecurePass1!" });
  const token = res.body.token;
  const userId = res.body.user._id;
  await User.findByIdAndUpdate(userId, { steamId: MOCK_STEAM_ID });
  return { token, userId };
};

describe("GET /api/steam/game/:appId Test", () => {

  test("should return aggregated game detail for a valid appId", async () => {
    const { token, userId } = await setupUser();
    await UserGame.create({ userId, appId: "570", name: "Dota 2", playtimeForever: 1200 });
    getCurrentPlayerCount.mockResolvedValueOnce(412857);
    getGameNews.mockResolvedValueOnce(MOCK_NEWS_ITEMS);

    const res = await request(app)
      .get("/api/steam/game/570")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.game).toHaveProperty("appId", "570");
    expect(res.body.game).toHaveProperty("name", "Dota 2");
    expect(res.body.game).toHaveProperty("playtimeHours", 20);
    expect(res.body.game).toHaveProperty("playerCount", 412857);
    expect(res.body.game).toHaveProperty("headerImageUrl");
    expect(res.body.game.headerImageUrl).toContain("570");
  });

  test("should return news array in game detail response", async () => {
    const { token, userId } = await setupUser();
    await UserGame.create({ userId, appId: "570", name: "Dota 2", playtimeForever: 1200 });
    getCurrentPlayerCount.mockResolvedValueOnce(0);
    getGameNews.mockResolvedValueOnce(MOCK_NEWS_ITEMS);

    const res = await request(app)
      .get("/api/steam/game/570")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.game.news).toBeInstanceOf(Array);
    expect(res.body.game.news.length).toBe(2);
    expect(res.body.game.news[0]).toHaveProperty("title");
    expect(res.body.game.news[0]).toHaveProperty("url");
    expect(res.body.game.news[0]).toHaveProperty("date");
  });

  test("should return 0 playtime for a game not in user DB", async () => {
    const { token } = await setupUser();
    getCurrentPlayerCount.mockResolvedValueOnce(5000);
    getGameNews.mockResolvedValueOnce([]);

    const res = await request(app)
      .get("/api/steam/game/99999")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.game.playtimeHours).toBe(0);
    expect(res.body.game.name).toBeNull();
  });

  test("should return 200 and playerCount=0 when Steam player count API fails", async () => {
    const { token, userId } = await setupUser();
    await UserGame.create({ userId, appId: "570", name: "Dota 2", playtimeForever: 600 });
    getCurrentPlayerCount.mockRejectedValueOnce(new Error("Steam unavailable"));
    getGameNews.mockResolvedValueOnce([]);

    const res = await request(app)
      .get("/api/steam/game/570")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.game.playerCount).toBe(0);
  });

  test("should return 200 and empty news when news API fails", async () => {
    const { token, userId } = await setupUser();
    await UserGame.create({ userId, appId: "570", name: "Dota 2", playtimeForever: 600 });
    getCurrentPlayerCount.mockResolvedValueOnce(1000);
    getGameNews.mockRejectedValueOnce(new Error("News unavailable"));

    const res = await request(app)
      .get("/api/steam/game/570")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.game.news).toEqual([]);
  });

  test("should return null achievements when none saved in DB", async () => {
    const { token, userId } = await setupUser();
    await UserGame.create({ userId, appId: "570", name: "Dota 2", playtimeForever: 600 });
    getCurrentPlayerCount.mockResolvedValueOnce(0);
    getGameNews.mockResolvedValueOnce([]);

    const res = await request(app)
      .get("/api/steam/game/570")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.game.achievements).toBeNull();
  });

  test("should return achievement summary when achievements are in DB", async () => {
    const { token, userId } = await setupUser();
    await UserGame.create({ userId, appId: "570", name: "Dota 2", playtimeForever: 1200 });
    await Achievement.create({
      userId,
      appId: "570",
      achievements: [
        { apiName: "ACH_1", displayName: "First Win", achieved: true, unlockTime: 1700000000 },
        { apiName: "ACH_2", displayName: "10 Wins", achieved: true, unlockTime: 1699000000 },
        { apiName: "ACH_3", displayName: "100 Wins", achieved: false, unlockTime: 0 },
      ],
    });
    getCurrentPlayerCount.mockResolvedValueOnce(100000);
    getGameNews.mockResolvedValueOnce([]);

    const res = await request(app)
      .get("/api/steam/game/570")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.game.achievements).not.toBeNull();
    expect(res.body.game.achievements.total).toBe(3);
    expect(res.body.game.achievements.unlocked).toBe(2);
    expect(res.body.game.achievements.locked).toBe(1);
    expect(res.body.game.achievements.percent).toBe(67);
  });

  test("should reject non-numeric appId with 400", async () => {
    const { token } = await setupUser();
    const res = await request(app)
      .get("/api/steam/game/notanumber")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/numeric/i);
  });

  test("should reject request with no JWT token with 401", async () => {
    const res = await request(app).get("/api/steam/game/570");
    expect(res.statusCode).toBe(401);
  });

  test("should return correct headerImageUrl format", async () => {
    const { token } = await setupUser();
    getCurrentPlayerCount.mockResolvedValueOnce(0);
    getGameNews.mockResolvedValueOnce([]);

    const res = await request(app)
      .get("/api/steam/game/570")
      .set("Authorization", `Bearer ${token}`);

    expect(res.body.game.headerImageUrl).toBe(
      "https://cdn.akamai.steamstatic.com/steam/apps/570/header.jpg"
    );
  });
});
