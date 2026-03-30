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
const { generateCSV } = require("../utils/csvExport");

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  await mongoose.connect(process.env.MONGODB_URI_TEST || "mongodb://localhost:27017/gamenode_test");
});
afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); server.close(); });
beforeEach(async () => { await User.deleteMany({}); await Leaderboard.deleteMany({}); jest.clearAllMocks(); });

const setup = async (suffix = "1") => {
  const res = await request(app).post("/api/auth/register").send({ username: `aksh10${suffix}`, email: `aksh10${suffix}@test.com`, password: "SecurePass1!" });
  return { token: res.body.token, userId: res.body.user._id };
};

describe("Public leaderboard endpoint Test", () => {

  test("GET /api/leaderboard/public/:userId — no JWT required", async () => {
    const { userId } = await setup("a");
    await Leaderboard.create({ userId, playerName: "PublicPro", game: "Dota 2", score: 9000, isPublic: true });
    const res = await request(app).get(`/api/leaderboard/public/${userId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.entries.length).toBe(1);
    expect(res.body.entries[0].playerName).toBe("PublicPro");
  });

  test("should return only public entries in public endpoint", async () => {
    const { userId } = await setup("b");
    await Leaderboard.create({ userId, playerName: "Public",  game: "Dota 2", score: 100, isPublic: true  });
    await Leaderboard.create({ userId, playerName: "Private", game: "CS2", score: 200, isPublic: false });
    const res = await request(app).get(`/api/leaderboard/public/${userId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.entries.length).toBe(1);
    expect(res.body.entries[0].playerName).toBe("Public");
  });

  test("should return empty array when user has no public entries", async () => {
    const { userId } = await setup("c");
    await Leaderboard.create({ userId, playerName: "Secret", game: "CS2", score: 500, isPublic: false });
    const res = await request(app).get(`/api/leaderboard/public/${userId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.entries).toEqual([]);
  });

  test("should return 400 for invalid userId format", async () => {
    const res = await request(app).get("/api/leaderboard/public/not-a-valid-id");
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/valid ID/i);
  });

  test("should return userId in response body", async () => {
    const { userId } = await setup("d");
    const res = await request(app).get(`/api/leaderboard/public/${userId}`);
    expect(res.body.userId).toBe(userId);
  });

  test("GET /api/leaderboard/public/:userId/csv — returns CSV file", async () => {
    const { userId } = await setup("e");
    await Leaderboard.create({ userId, playerName: "CsvPro", game: "Dota 2", score: 7500, isPublic: true });
    const res = await request(app).get(`/api/leaderboard/public/${userId}/csv`);
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/csv/);
    expect(res.text).toContain("Player Name");
    expect(res.text).toContain("CsvPro");
    expect(res.text).toContain("7500");
  });

  test("CSV download contains correct headers", async () => {
    const { userId } = await setup("f");
    const res = await request(app).get(`/api/leaderboard/public/${userId}/csv`);
    expect(res.text).toContain("Rank");
    expect(res.text).toContain("Player Name");
    expect(res.text).toContain("Game");
    expect(res.text).toContain("Score");
    expect(res.text).toContain("Notes");
  });
});

describe("Story 10 — generateCSV utility (Akshitha)", () => {

  test("generates CSV with header row", () => {
    const csv = generateCSV([]);
    expect(csv).toContain("Rank,Player Name,Game,Score,Notes,Date");
  });

  test("generates CSV with one data row", () => {
    const entries = [{ playerName: "Pro", game: "CS2", score: 5000, notes: "Win", createdAt: new Date("2025-01-01") }];
    const csv = generateCSV(entries);
    expect(csv).toContain("Pro");
    expect(csv).toContain("CS2");
    expect(csv).toContain("5000");
    expect(csv).toContain("Win");
  });

  test("escapes double quotes in fields", () => {
    const entries = [{ playerName: 'He said "hello"', game: "Dota 2", score: 100, notes: "", createdAt: new Date() }];
    const csv = generateCSV(entries);
    expect(csv).toContain('""hello""');
  });

  test("generates correct rank numbers", () => {
    const entries = [
      { playerName: "A", game: "CS2", score: 100, notes: "", createdAt: new Date() },
      { playerName: "B", game: "CS2", score: 50,  notes: "", createdAt: new Date() },
    ];
    const csv   = generateCSV(entries);
    const lines = csv.split("\n");
    expect(lines[1]).toStartWith("1,");
    expect(lines[2]).toStartWith("2,");
  });
});
