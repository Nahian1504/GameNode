jest.mock("../utils/genAIService", () => ({
  generateComplaintResolution: jest.fn(),
  generateRecommendations: jest.fn().mockResolvedValue([
    { name: "Hollow Knight", reason: "Matches your playstyle", matchPercent: 92, genre: "Metroidvania" },
    { name: "Hades", reason: "Fast paced like CS2", matchPercent: 88, genre: "Roguelike" },
    { name: "Dead Cells", reason: "Action platformer", matchPercent: 84, genre: "Roguelike" },
    { name: "Celeste", reason: "Precision platformer", matchPercent: 80, genre: "Platformer" },
    { name: "Ori", reason: "Beautiful exploration", matchPercent: 76, genre: "Platformer" },
  ]),
  generateAssistantResponse: jest.fn(),
}));

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const request = require("supertest");
const mongoose = require("mongoose");
const { app, server } = require("../index");
const User = require("../models/User");
const Recommendation = require("../models/Recommendation");
const { UserGame } = require("../models/Game");
const { generateRecommendations } = require("../utils/genAIService");

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  await mongoose.connect(process.env.MONGODB_URI_TEST || "mongodb://localhost:27017/gamenode_test");
});
afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); server.close(); });
beforeEach(async () => { await User.deleteMany({}); await Recommendation.deleteMany({}); await UserGame.deleteMany({}); jest.clearAllMocks(); });

const setup = async (s = "1") => {
  const r = await request(app).post("/api/auth/register").send({ username: `dhruv14${s}`, email: `dhruv14${s}@t.com`, password: "SecurePass1!" });
  return { token: r.body.token, userId: r.body.user._id };
};

const seedGames = async (userId) => {
  await UserGame.insertMany([
    { userId, appId: "570", name: "Dota 2", playtimeForever: 1200 },
    { userId, appId: "730", name: "Counter-Strike 2", playtimeForever: 600 },
    { userId, appId: "440", name: "Team Fortress 2", playtimeForever: 300 },
  ]);
};

describe("Recommendation Backend Test", () => {

  test("POST /api/recommendations generates and returns 5 recommendations", async () => {
    const { token, userId } = await setup("a");
    await seedGames(userId);
    const res = await request(app).post("/api/recommendations").set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.recommendations.length).toBe(5);
    expect(res.body.source).toBe("generated");
  });

  test("POST /api/recommendations calls generateRecommendations with user behavior", async () => {
    const { token, userId } = await setup("b");
    await seedGames(userId);
    await request(app).post("/api/recommendations").set("Authorization", `Bearer ${token}`);
    expect(generateRecommendations).toHaveBeenCalledWith(
      expect.objectContaining({ topGames: expect.any(Array), totalGames: expect.any(Number) })
    );
  });

  test("POST /api/recommendations saves result to DB cache", async () => {
    const { token, userId } = await setup("c");
    await seedGames(userId);
    await request(app).post("/api/recommendations").set("Authorization", `Bearer ${token}`);
    const cached = await Recommendation.findOne({ userId });
    expect(cached).not.toBeNull();
    expect(cached.recommendations.length).toBe(5);
  });

  test("POST /api/recommendations returns cache on second call without hitting GenAI", async () => {
    const { token, userId } = await setup("d");
    await seedGames(userId);
    await request(app).post("/api/recommendations").set("Authorization", `Bearer ${token}`);
    jest.clearAllMocks();
    const res = await request(app).post("/api/recommendations").set("Authorization", `Bearer ${token}`);
    expect(res.body.source).toBe("cache");
    expect(generateRecommendations).not.toHaveBeenCalled();
  });

  test("POST /api/recommendations response has generatedAt and expiresAt", async () => {
    const { token, userId } = await setup("e");
    await seedGames(userId);
    const res = await request(app).post("/api/recommendations").set("Authorization", `Bearer ${token}`);
    expect(res.body).toHaveProperty("generatedAt");
    expect(res.body).toHaveProperty("expiresAt");
  });

  test("POST returns 503 when GenAI API fails", async () => {
    generateRecommendations.mockRejectedValueOnce(new Error("GenAI down"));
    const { token, userId } = await setup("f");
    await seedGames(userId);
    const res = await request(app).post("/api/recommendations").set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(503);
    expect(res.body.success).toBe(false);
  });

  test("GET /api/recommendations/cached returns 404 when no cache", async () => {
    const { token } = await setup("g");
    const res = await request(app).get("/api/recommendations/cached").set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(404);
  });

  test("GET /api/recommendations/cached returns recs when cache exists", async () => {
    const { token, userId } = await setup("h");
    await Recommendation.upsertForUser(userId, [{ name: "Celeste", reason: "Great match", matchPercent: 85, genre: "Platformer" }]);
    const res = await request(app).get("/api/recommendations/cached").set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.recommendations[0].name).toBe("Celeste");
  });
});
