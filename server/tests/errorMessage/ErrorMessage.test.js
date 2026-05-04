jest.mock("../../utils/steamService", () => ({
  getOwnedGames: jest.fn(), getCurrentPlayerCount: jest.fn(),
  getPlayerSummary: jest.fn(), getGameNews: jest.fn(),
  clearUserCache: jest.fn(), getGameDetail: jest.fn(),
  getPlayerAchievements: jest.fn(), getGlobalAchievementPercentages: jest.fn(),
}));

jest.mock("../../utils/genAIService", () => ({
  generateComplaintResolution: jest.fn(), generateRecommendations: jest.fn(), generateAssistantResponse: jest.fn(),
}));

require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const request = require("supertest");
const mongoose = require("mongoose");
const { app, server } = require("../../index");
const User = require("../../models/User");
const { getOwnedGames } = require("../../utils/steamService");

const MOCK_STEAM_ID = "76561198000000099";

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  await mongoose.connect(process.env.MONGODB_URI_TEST || "mongodb://localhost:27017/gamenode_test");
});
afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); server.close(); });
beforeEach(async () => { await User.deleteMany({}); jest.clearAllMocks(); });

const setup = async (s = "1") => {
  const r = await request(app).post("/api/auth/register").send({ username: `aksh13${s}`, email: `aksh13${s}@t.com`, password: "SecurePass1!" });
  return { token: r.body.token, userId: r.body.user._id };
};

describe("End to end error scenarios Test", () => {

  test("401 returned for request with no Authorization header", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBeTruthy();
  });

  test("401 returned for malformed Bearer token", async () => {
    const res = await request(app).get("/api/auth/me").set("Authorization", "NotBearer abc123");
    expect(res.statusCode).toBe(401);
  });

  test("401 returned for invalid JWT signature", async () => {
    const res = await request(app).get("/api/auth/me").set("Authorization", "Bearer this.is.not.valid");
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toMatch(/invalid token/i);
  });

  test("409 returned for duplicate email on register", async () => {
    await request(app).post("/api/auth/register").send({ username: "u1", email: "same@t.com", password: "SecurePass1!" });
    const res = await request(app).post("/api/auth/register").send({ username: "u2", email: "same@t.com", password: "SecurePass1!" });
    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test("401 returned for wrong password on login", async () => {
    await request(app).post("/api/auth/register").send({ username: "logintest", email: "login@t.com", password: "SecurePass1!" });
    const res = await request(app).post("/api/auth/login").send({ email: "login@t.com", password: "WrongPass1!" });
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test("503 returned when Steam API is unavailable", async () => {
    const { token, userId } = await setup("a");
    await User.findByIdAndUpdate(userId, { steamId: MOCK_STEAM_ID });
    getOwnedGames.mockRejectedValueOnce(new Error("Steam down"));
    const res = await request(app).get("/api/steam/dashboard").set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/unavailable/i);
  });

  test("404 returned for completely unknown route", async () => {
    const res = await request(app).get("/api/this/does/not/exist");
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test("400 returned for invalid ObjectId in route param", async () => {
    const { token } = await setup("b");
    const res = await request(app).delete("/api/leaderboard/notavalidobjectid").set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(400);
  });

  test("error response never exposes passwordHash or internal fields", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "noone@t.com", password: "SecurePass1!" });
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
    expect(JSON.stringify(res.body)).not.toContain("__v");
  });
});
