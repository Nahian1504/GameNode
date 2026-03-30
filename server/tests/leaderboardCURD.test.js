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
  const res = await request(app).post("/api/auth/register").send({ username: `dhruv10${suffix}`, email: `dhruv10${suffix}@test.com`, password: "SecurePass1!" });
  return { token: res.body.token, userId: res.body.user._id };
};

describe("Leaderboard CRUD endpoints Test", () => {

  test("POST /api/leaderboard — creates entry successfully", async () => {
    const { token } = await setup("a");
    const res = await request(app).post("/api/leaderboard").set("Authorization", `Bearer ${token}`).send({ playerName: "Dhruvkumar", game: "Dota 2", score: 8800 });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.entry._id).toBeDefined();
    expect(res.body.entry.score).toBe(8800);
  });

  test("GET /api/leaderboard — returns all entries for user", async () => {
    const { token, userId } = await setup("b");
    await Leaderboard.create({ userId, playerName: "A", game: "Dota 2", score: 100 });
    await Leaderboard.create({ userId, playerName: "B", game: "CS2", score: 200 });
    const res = await request(app).get("/api/leaderboard").set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.entries.length).toBe(2);
    expect(res.body.total).toBe(2);
  });

  test("GET /api/leaderboard?game=Dota 2 — filters by game", async () => {
    const { token, userId } = await setup("c");
    await Leaderboard.create({ userId, playerName: "A", game: "Dota 2", score: 100 });
    await Leaderboard.create({ userId, playerName: "B", game: "CS2", score: 200 });
    const res = await request(app).get("/api/leaderboard?game=Dota 2").set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.entries.length).toBe(1);
    expect(res.body.entries[0].game).toBe("Dota 2");
  });

  test("GET /api/leaderboard — returns empty array when no entries", async () => {
    const { token } = await setup("d");
    const res = await request(app).get("/api/leaderboard").set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.entries).toEqual([]);
  });

  test("GET /api/leaderboard — returns entries sorted by score desc", async () => {
    const { token, userId } = await setup("e");
    await Leaderboard.create({ userId, playerName: "Low",  game: "Dota 2", score: 50 });
    await Leaderboard.create({ userId, playerName: "High", game: "Dota 2", score: 999 });
    const res = await request(app).get("/api/leaderboard").set("Authorization", `Bearer ${token}`);
    expect(res.body.entries[0].score).toBe(999);
    expect(res.body.entries[1].score).toBe(50);
  });

  test("PUT /api/leaderboard/:id — updates entry score", async () => {
    const { token, userId } = await setup("f");
    const entry = await Leaderboard.create({ userId, playerName: "Pro", game: "Dota 2", score: 100 });
    const res = await request(app).put(`/api/leaderboard/${entry._id}`).set("Authorization", `Bearer ${token}`).send({ playerName: "Pro", game: "Dota 2", score: 9999, notes: "Personal best" });
    expect(res.statusCode).toBe(200);
    expect(res.body.entry.score).toBe(9999);
    expect(res.body.entry.notes).toBe("Personal best");
  });

  test("DELETE /api/leaderboard/:id — deletes entry", async () => {
    const { token, userId } = await setup("g");
    const entry = await Leaderboard.create({ userId, playerName: "Pro", game: "CS2", score: 500 });
    const res = await request(app).delete(`/api/leaderboard/${entry._id}`).set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    const gone = await Leaderboard.findById(entry._id);
    expect(gone).toBeNull();
  });

  test("PUT returns 404 when entry does not exist", async () => {
    const { token } = await setup("h");
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).put(`/api/leaderboard/${fakeId}`).set("Authorization", `Bearer ${token}`).send({ playerName: "Pro", game: "CS2", score: 100 });
    expect(res.statusCode).toBe(404);
  });

  test("DELETE returns 404 when entry does not exist", async () => {
    const { token } = await setup("i");
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).delete(`/api/leaderboard/${fakeId}`).set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(404);
  });
});
