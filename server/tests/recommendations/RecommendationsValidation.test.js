jest.mock("../../utils/genAIService", () => ({
  generateComplaintResolution: jest.fn(),
  generateRecommendations: jest.fn().mockResolvedValue([
    { name: "Hollow Knight", reason: "Great match", matchPercent: 90, genre: "Metroidvania" },
  ]),
  generateAssistantResponse: jest.fn(),
}));

require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const request = require("supertest");
const mongoose = require("mongoose");
const { app, server } = require("../../index");
const User = require("../../models/User");
const Recommendation = require("../../models/Recommendation");
const { UserGame } = require("../../models/Game");

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  await mongoose.connect(process.env.MONGODB_URI_TEST || "mongodb://localhost:27017/gamenode_test");
});
afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); server.close(); });
beforeEach(async () => { await User.deleteMany({}); await Recommendation.deleteMany({}); await UserGame.deleteMany({}); jest.clearAllMocks(); });

const setup = async (s = "1") => {
  const r = await request(app).post("/api/auth/register").send({ username: `akshat14${s}`, email: `akshat14${s}@t.com`, password: "SecurePass1!" });
  return { token: r.body.token, userId: r.body.user._id };
};

describe("Recommendation auth and rate limiting Test", () => {

  test("rejects POST /api/recommendations without JWT with 401", async () => {
    const res = await request(app).post("/api/recommendations");
    expect(res.statusCode).toBe(401);
  });

  test("rejects GET /api/recommendations/cached without JWT with 401", async () => {
    const res = await request(app).get("/api/recommendations/cached");
    expect(res.statusCode).toBe(401);
  });

  test("accepts valid authenticated request to recommendations", async () => {
    const { token, userId } = await setup("a");
    await UserGame.create({ userId, appId: "570", name: "Dota 2", playtimeForever: 1200 });
    await UserGame.create({ userId, appId: "730", name: "CS2", playtimeForever: 600 });
    await UserGame.create({ userId, appId: "440", name: "TF2", playtimeForever: 300 });
    const res = await request(app).post("/api/recommendations").set("Authorization", `Bearer ${token}`);
    expect([200, 503]).toContain(res.statusCode); 
  });

  test("recommendationLimiter is exported from rateLimiter", () => {
    const { recommendationLimiter } = require("../middleware/rateLimiter");
    expect(typeof recommendationLimiter).toBe("function");
  });

  test("assistantLimiter is exported from rateLimiter", () => {
    const { assistantLimiter } = require("../middleware/rateLimiter");
    expect(typeof assistantLimiter).toBe("function");
  });

  test("returns 200 with fallback when user has fewer than 3 games", async () => {
    const { token, userId } = await setup("b");
    await UserGame.create({ userId, appId: "570", name: "Dota 2", playtimeForever: 100 });
    const res = await request(app).post("/api/recommendations").set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.source).toBe("fallback");
    expect(res.body.recommendations).toEqual([]);
  });

  test("returns 200 from cache on second call within 24 hours", async () => {
    const { token, userId } = await setup("c");
    await UserGame.create({ userId, appId: "570", name: "G1", playtimeForever: 1000 });
    await UserGame.create({ userId, appId: "730", name: "G2", playtimeForever: 800 });
    await UserGame.create({ userId, appId: "440", name: "G3", playtimeForever: 600 });
    await Recommendation.upsertForUser(userId, [{ name: "Cached Game", reason: "Cached", matchPercent: 80, genre: "RPG" }]);
    const res = await request(app).post("/api/recommendations").set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.source).toBe("cache");
  });
});
