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
const NewsCache = require("../models/NewsCache");
const { UserGame } = require("../models/Game");
const Achievement = require("../models/Achievement");
const { getGameNews, getCurrentPlayerCount } = require("../utils/steamService");

const MOCK_NEWS_ITEMS = [
  { gid: "1", title: "Patch 7.35", url: "https://s.com/1", author: "Valve", feedname: "ann", feedlabel: "Ann", date: 1700000000 },
  { gid: "2", title: "New Features", url: "https://s.com/2", author: "Valve", feedname: "ann", feedlabel: "Ann", date: 1699000000 },
];
const MOCK_STEAM_ID = "76561198000000005";

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  await mongoose.connect(process.env.MONGODB_URI_TEST || "mongodb://localhost:27017/gamenode_test");
});
afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); server.close(); });
beforeEach(async () => { await User.deleteMany({}); await NewsCache.deleteMany({}); await UserGame.deleteMany({}); await Achievement.deleteMany({}); jest.clearAllMocks(); });

const setup = async (suffix = "1") => {
  const res = await request(app).post("/api/auth/register").send({ username: `aksh11${suffix}`, email: `aksh11${suffix}@test.com`, password: "SecurePass1!" });
  const token = res.body.token;
  const userId = res.body.user._id;
  await User.findByIdAndUpdate(userId, { steamId: MOCK_STEAM_ID });
  return { token, userId };
};

describe("DB caching Test", () => {

  test("fetches from Steam API and saves to DB cache on first call", async () => {
    const { token } = await setup("a");
    getGameNews.mockResolvedValueOnce(MOCK_NEWS_ITEMS);
    const res = await request(app).get("/api/news/570").set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.source).toBe("steam-api");
    expect(res.body.news.length).toBe(2);
    const cached = await NewsCache.findOne({ appId: "570" });
    expect(cached).not.toBeNull();
    expect(cached.newsItems.length).toBe(2);
  });

  test("returns from DB cache on second call without hitting Steam API", async () => {
    const { token } = await setup("b");
    getGameNews.mockResolvedValueOnce(MOCK_NEWS_ITEMS);
    await request(app).get("/api/news/570").set("Authorization", `Bearer ${token}`);
    jest.clearAllMocks();
    const res = await request(app).get("/api/news/570").set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.source).toBe("cache");
    expect(getGameNews).not.toHaveBeenCalled();
  });

  test("returns stale cache when Steam API is down", async () => {
    const { token } = await setup("c");
    await NewsCache.create({ appId: "570", newsItems: [{ gid: "1", title: "Old News", url: "https://s.com/1", date: new Date().toISOString(), dateReadable: "Jan 1" }], fetchedAt: new Date(Date.now() - 1000 * 60 * 30), ttlSeconds: 900 });
    getGameNews.mockRejectedValueOnce(new Error("Steam down"));
    const res = await request(app).get("/api/news/570").set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.source).toBe("stale-cache");
  });

  test("returns 503 when Steam API fails and no cache exists", async () => {
    const { token } = await setup("d");
    getGameNews.mockRejectedValueOnce(new Error("Steam down"));
    const res = await request(app).get("/api/news/570").set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(503);
  });

  test("news response includes dateReadable field", async () => {
    const { token } = await setup("e");
    getGameNews.mockResolvedValueOnce(MOCK_NEWS_ITEMS);
    const res = await request(app).get("/api/news/570").set("Authorization", `Bearer ${token}`);
    expect(res.body.news[0]).toHaveProperty("dateReadable");
  });

  test("returns 401 without JWT token", async () => {
    const res = await request(app).get("/api/news/570");
    expect(res.statusCode).toBe(401);
  });
});

describe("Game Detail (player count + news) Test", () => {

  test("GET /api/steam/game/:appId returns playerCount and news together", async () => {
    const { token, userId } = await setup("f");
    await UserGame.create({ userId, appId: "570", name: "Dota 2", playtimeForever: 1200 });
    getCurrentPlayerCount.mockResolvedValueOnce(150000);
    getGameNews.mockResolvedValueOnce(MOCK_NEWS_ITEMS);
    const res = await request(app).get("/api/steam/game/570").set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.game.playerCount).toBe(150000);
    expect(res.body.game.news.length).toBe(2);
    expect(res.body.game.news[0].title).toBe("Patch 7.35");
  });

  test("GET /api/steam/game/:appId returns achievement summary when in DB", async () => {
    const { token, userId } = await setup("g");
    await UserGame.create({ userId, appId: "570", name: "Dota 2", playtimeForever: 600 });
    await Achievement.create({
      userId, appId: "570",
      achievements: [
        { apiName: "A1", displayName: "First", achieved: true,  unlockTime: 1700000000 },
        { apiName: "A2", displayName: "Hard",  achieved: false, unlockTime: 0 },
      ],
    });
    getCurrentPlayerCount.mockResolvedValueOnce(0);
    getGameNews.mockResolvedValueOnce([]);
    const res = await request(app).get("/api/steam/game/570").set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.game.achievements).not.toBeNull();
    expect(res.body.game.achievements.total).toBe(2);
    expect(res.body.game.achievements.unlocked).toBe(1);
    expect(res.body.game.achievements.percent).toBe(50);
  });

  test("GET /api/steam/game/:appId returns null achievements when not in DB", async () => {
    const { token } = await setup("h");
    getCurrentPlayerCount.mockResolvedValueOnce(0);
    getGameNews.mockResolvedValueOnce([]);
    const res = await request(app).get("/api/steam/game/570").set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.game.achievements).toBeNull();
  });
});
