jest.mock("../utils/steamService", () => ({
  getOwnedGames: jest.fn(), getCurrentPlayerCount: jest.fn(),
  getPlayerSummary: jest.fn(), getGameNews: jest.fn(),
  clearUserCache: jest.fn(), getGameDetail: jest.fn(),
  getPlayerAchievements: jest.fn(), getGlobalAchievementPercentages: jest.fn(),
}));

jest.mock("../utils/genAIService", () => ({
  generateComplaintResolution: jest.fn(), generateRecommendations: jest.fn(), generateAssistantResponse: jest.fn(),
}));

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const request = require("supertest");
const mongoose = require("mongoose");
const { app, server } = require("../index");
const User = require("../models/User");

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  await mongoose.connect(process.env.MONGODB_URI_TEST || "mongodb://localhost:27017/gamenode_test");
});
afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); server.close(); });
beforeEach(async () => { await User.deleteMany({}); jest.clearAllMocks(); });

const setup = async (s = "1") => {
  const r = await request(app).post("/api/auth/register").send({ username: `akshat13${s}`, email: `akshat13${s}@t.com`, password: "SecurePass1!" });
  return { token: r.body.token, userId: r.body.user._id };
};

describe("Validation Error Message Test", () => {

  test("auth register validation returns standard shape", async () => {
    const res = await request(app).post("/api/auth/register").send({ username: "x" });
    expect(res.body).toMatchObject({ success: false, message: expect.any(String), statusCode: 400 });
  });

  test("auth login validation returns standard shape", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "bad" });
    expect(res.body).toMatchObject({ success: false, message: expect.any(String), statusCode: 400 });
  });

  test("steam connect validation returns standard shape", async () => {
    const { token } = await setup("a");
    const res = await request(app).post("/api/steam/connect").set("Authorization", `Bearer ${token}`).send({ steamId: "123" });
    expect(res.body).toMatchObject({ success: false, message: expect.any(String) });
    expect(res.statusCode).toBe(400);
  });

  test("dashboard query validation returns standard shape", async () => {
    const { token } = await setup("b");
    const res = await request(app).get("/api/steam/dashboard?sort=invalid").set("Authorization", `Bearer ${token}`);
    expect(res.body).toMatchObject({ success: false, message: expect.any(String) });
    expect(res.statusCode).toBe(400);
  });

  test("achievement param validation returns standard shape", async () => {
    const { token } = await setup("c");
    const res = await request(app).get("/api/achievements/notanumber").set("Authorization", `Bearer ${token}`);
    expect(res.body).toMatchObject({ success: false, message: expect.any(String) });
    expect(res.statusCode).toBe(400);
  });

  test("favorites validation returns standard shape", async () => {
    const { token } = await setup("d");
    const res = await request(app).post("/api/favorites").set("Authorization", `Bearer ${token}`).send({ appId: "notanumber" });
    expect(res.body).toMatchObject({ success: false, message: expect.any(String) });
    expect(res.statusCode).toBe(400);
  });

  test("leaderboard validation returns standard shape", async () => {
    const { token } = await setup("e");
    const res = await request(app).post("/api/leaderboard").set("Authorization", `Bearer ${token}`).send({ playerName: "" });
    expect(res.body).toMatchObject({ success: false, message: expect.any(String) });
    expect(res.statusCode).toBe(400);
  });

  test("complaint validation returns standard shape", async () => {
    const { token } = await setup("f");
    const res = await request(app).post("/api/complaints").set("Authorization", `Bearer ${token}`).send({ category: "Invalid" });
    expect(res.body).toMatchObject({ success: false, message: expect.any(String) });
    expect(res.statusCode).toBe(400);
  });

  test("news validation returns standard shape", async () => {
    const { token } = await setup("g");
    const res = await request(app).get("/api/news/notanumber").set("Authorization", `Bearer ${token}`);
    expect(res.body).toMatchObject({ success: false, message: expect.any(String) });
    expect(res.statusCode).toBe(400);
  });

  test("no raw Mongoose errors reach client — no _message or errors array exposed", async () => {
    const res = await request(app).post("/api/auth/register").send({ username: "x" });
    expect(res.body._message).toBeUndefined();
    expect(res.body.errors).toBeUndefined(); 
  });
});
