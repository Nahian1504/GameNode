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
const Leaderboard = require("../models/Leaderboard");

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  await mongoose.connect(process.env.MONGODB_URI_TEST || "mongodb://localhost:27017/gamenode_test");
});
afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); server.close(); });
beforeEach(async () => { await User.deleteMany({}); await Leaderboard.deleteMany({}); jest.clearAllMocks(); });

const setup = async (suffix = "1") => {
  const res = await request(app).post("/api/auth/register").send({ username: `akshat10${suffix}`, email: `akshat10${suffix}@test.com`, password: "SecurePass1!" });
  return { token: res.body.token, userId: res.body.user._id };
};

describe("Leaderboard validation Test", () => {

  test("should reject empty playerName with 400", async () => {
    const { token } = await setup("a");
    const res = await request(app).post("/api/leaderboard").set("Authorization", `Bearer ${token}`).send({ playerName: "", game: "Dota 2", score: 100 });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/playerName is required/i);
  });

  test("should reject empty game with 400", async () => {
    const { token } = await setup("b");
    const res = await request(app).post("/api/leaderboard").set("Authorization", `Bearer ${token}`).send({ playerName: "Pro", game: "", score: 100 });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/game is required/i);
  });

  test("should reject missing score with 400", async () => {
    const { token } = await setup("c");
    const res = await request(app).post("/api/leaderboard").set("Authorization", `Bearer ${token}`).send({ playerName: "Pro", game: "CS2" });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/score is required/i);
  });

  test("should reject non-numeric score with 400", async () => {
    const { token } = await setup("d");
    const res = await request(app).post("/api/leaderboard").set("Authorization", `Bearer ${token}`).send({ playerName: "Pro", game: "CS2", score: "notanumber" });
    expect(res.statusCode).toBe(400);
  });

  test("should reject negative score with 400", async () => {
    const { token } = await setup("e");
    const res = await request(app).post("/api/leaderboard").set("Authorization", `Bearer ${token}`).send({ playerName: "Pro", game: "CS2", score: -10 });
    expect(res.statusCode).toBe(400);
  });

  test("should reject playerName over 50 characters with 400", async () => {
    const { token } = await setup("f");
    const res = await request(app).post("/api/leaderboard").set("Authorization", `Bearer ${token}`).send({ playerName: "A".repeat(51), game: "CS2", score: 100 });
    expect(res.statusCode).toBe(400);
  });

  test("should reject invalid MongoDB ID on PUT with 400", async () => {
    const { token } = await setup("g");
    const res = await request(app).put("/api/leaderboard/notavalidid").set("Authorization", `Bearer ${token}`).send({ playerName: "Pro", game: "CS2", score: 100 });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/valid MongoDB ID/i);
  });

  test("should reject DELETE by a different user — 403 ownership check", async () => {
    const { token: t1, userId: u1 } = await setup("h");
    const { token: t2 } = await setup("i");
    const entry = await Leaderboard.create({ userId: u1, playerName: "User1", game: "Dota 2", score: 100 });
    const res = await request(app).delete(`/api/leaderboard/${entry._id}`).set("Authorization", `Bearer ${t2}`);
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/access denied/i);
  });

  test("should reject PUT by a different user — 403 ownership check", async () => {
    const { token: t1, userId: u1 } = await setup("j");
    const { token: t2 } = await setup("k");
    const entry = await Leaderboard.create({ userId: u1, playerName: "User1", game: "Dota 2", score: 100 });
    const res = await request(app).put(`/api/leaderboard/${entry._id}`).set("Authorization", `Bearer ${t2}`).send({ playerName: "Hacker", game: "Dota 2", score: 99999 });
    expect(res.statusCode).toBe(403);
  });

  test("should reject request with no JWT — 401", async () => {
    const res = await request(app).post("/api/leaderboard").send({ playerName: "Pro", game: "CS2", score: 100 });
    expect(res.statusCode).toBe(401);
  });

  test("should accept valid entry and create it", async () => {
    const { token } = await setup("l");
    const res = await request(app).post("/api/leaderboard").set("Authorization", `Bearer ${token}`).send({ playerName: "Akshat", game: "Dota 2", score: 5000, notes: "Season finale", isPublic: true });
    expect(res.statusCode).toBe(201);
    expect(res.body.entry.playerName).toBe("Akshat");
    expect(res.body.entry.score).toBe(5000);
  });
});
