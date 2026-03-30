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
const { getGameNews, getCurrentPlayerCount } = require("../utils/steamService");

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  await mongoose.connect(process.env.MONGODB_URI_TEST || "mongodb://localhost:27017/gamenode_test");
});
afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); server.close(); });
beforeEach(async () => { await User.deleteMany({}); await NewsCache.deleteMany({}); jest.clearAllMocks(); });

const setup = async (suffix = "1") => {
  const res = await request(app).post("/api/auth/register").send({ username: `akshat11${suffix}`, email: `akshat11${suffix}@test.com`, password: "SecurePass1!" });
  return res.body.token;
};

describe("News and Player Count validation Test", () => {

  test("GET /api/news/:appId — rejects non-numeric appId with 400", async () => {
    const token = await setup("a");
    const res   = await request(app).get("/api/news/notanumber").set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/numeric/i);
  });

  test("GET /api/news/:appId — rejects count=0 with 400", async () => {
    const token = await setup("b");
    const res   = await request(app).get("/api/news/570?count=0").set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(400);
  });

  test("GET /api/news/:appId — rejects count=25 (over max 20) with 400", async () => {
    const token = await setup("c");
    const res   = await request(app).get("/api/news/570?count=25").set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/1 and 20/i);
  });

  test("GET /api/news/:appId — accepts count=20 (boundary)", async () => {
    const token = await setup("d");
    getGameNews.mockResolvedValueOnce([]);
    const res   = await request(app).get("/api/news/570?count=20").set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
  });

  test("GET /api/news/:appId — requires JWT, rejects without it", async () => {
    const res = await request(app).get("/api/news/570");
    expect(res.statusCode).toBe(401);
  });

  test("GET /api/steam/playercount/:appId — rejects non-numeric appId with 400", async () => {
    const token = await setup("e");
    const res   = await request(app).get("/api/steam/playercount/badid").set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/numeric/i);
  });

  test("GET /api/steam/playercount/:appId — requires JWT", async () => {
    const res = await request(app).get("/api/steam/playercount/570");
    expect(res.statusCode).toBe(401);
  });

  test("GET /api/steam/news/:appId — rejects count=30 with 400", async () => {
    const token = await setup("f");
    const res   = await request(app).get("/api/steam/news/570?count=30").set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(400);
  });

  test("GET /api/steam/news/:appId — accepts valid count=5", async () => {
    const token = await setup("g");
    getGameNews.mockResolvedValueOnce([]);
    const res   = await request(app).get("/api/steam/news/570?count=5").set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
  });

  test("rateLimiter module exports newsLimiter and playerCountLimiter", () => {
    const { newsLimiter, playerCountLimiter } = require("../middleware/rateLimiter");
    expect(typeof newsLimiter).toBe("function");
    expect(typeof playerCountLimiter).toBe("function");
  });
});
