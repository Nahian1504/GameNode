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
const { getGameNews, getCurrentPlayerCount } = require("../utils/steamService");

const MOCK_NEWS = [
  { gid: "1", title: "Major Update 7.35", url: "https://steam.com/n1", author: "Valve", feedname: "ann", feedlabel: "Announcements", date: 1700000000, contents: "Lots of changes" },
  { gid: "2", title: "New Hero Released",  url: "https://steam.com/n2", author: "Valve", feedname: "ann", feedlabel: "Announcements", date: 1699000000, contents: "Meet Ringmaster" },
  { gid: "3", title: "Balance Patch", url: "https://steam.com/n3", author: "Valve", feedname: "ann", feedlabel: "Announcements", date: 1698000000, contents: "Heroes adjusted" },
];

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  await mongoose.connect(process.env.MONGODB_URI_TEST || "mongodb://localhost:27017/gamenode_test");
});
afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); server.close(); });
beforeEach(async () => { await User.deleteMany({}); jest.clearAllMocks(); });

const setup = async (suffix = "1") => {
  const res = await request(app).post("/api/auth/register").send({ username: `dhruv11${suffix}`, email: `dhruv11${suffix}@test.com`, password: "SecurePass1!" });
  return res.body.token;
};

describe("Game News and Player Count Backend Test", () => {

  test("should return news with count param respected", async () => {
    getGameNews.mockResolvedValueOnce(MOCK_NEWS.slice(0, 3));
    const token = await setup("a");
    const res = await request(app).get("/api/steam/news/570?count=3").set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.count).toBe(3);
    expect(res.body.news.length).toBe(3);
  });

  test("should include dateReadable in each news item", async () => {
    getGameNews.mockResolvedValueOnce([MOCK_NEWS[0]]);
    const token = await setup("b");
    const res = await request(app).get("/api/steam/news/570").set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.news[0]).toHaveProperty("dateReadable");
    expect(typeof res.body.news[0].dateReadable).toBe("string");
    expect(res.body.news[0].dateReadable.length).toBeGreaterThan(0);
  });

  test("should include feedLabel in each news item", async () => {
    getGameNews.mockResolvedValueOnce([MOCK_NEWS[0]]);
    const token = await setup("c");
    const res = await request(app).get("/api/steam/news/570").set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.news[0]).toHaveProperty("feedLabel");
    expect(res.body.news[0].feedLabel).toBe("Announcements");
  });

  test("should include count field in response", async () => {
    getGameNews.mockResolvedValueOnce(MOCK_NEWS);
    const token = await setup("d");
    const res = await request(app).get("/api/steam/news/570").set("Authorization", `Bearer ${token}`);
    expect(res.body).toHaveProperty("count");
    expect(res.body.count).toBe(3);
  });

  test("should return date as ISO string", async () => {
    getGameNews.mockResolvedValueOnce([MOCK_NEWS[0]]);
    const token = await setup("e");
    const res = await request(app).get("/api/steam/news/570").set("Authorization", `Bearer ${token}`);
    expect(res.body.news[0].date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test("should fallback author to Unknown when missing", async () => {
    const noAuthor = [{ ...MOCK_NEWS[0], author: null }];
    getGameNews.mockResolvedValueOnce(noAuthor);
    const token = await setup("f");
    const res = await request(app).get("/api/steam/news/570").set("Authorization", `Bearer ${token}`);
    expect(res.body.news[0].author).toBe("Unknown");
  });

  test("should return empty news array with count=0", async () => {
    getGameNews.mockResolvedValueOnce([]);
    const token = await setup("g");
    const res = await request(app).get("/api/steam/news/570").set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.news).toEqual([]);
    expect(res.body.count).toBe(0);
  });

  test("GET /api/steam/playercount/:appId returns player count", async () => {
    getCurrentPlayerCount.mockResolvedValueOnce(85000);
    const token = await setup("h");
    const res = await request(app).get("/api/steam/playercount/570").set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.playerCount).toBe(85000);
    expect(res.body.appId).toBe("570");
  });

  test("GET /api/steam/playercount/:appId returns 0 when no players", async () => {
    getCurrentPlayerCount.mockResolvedValueOnce(0);
    const token = await setup("i");
    const res = await request(app).get("/api/steam/playercount/99999").set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.playerCount).toBe(0);
  });
});
