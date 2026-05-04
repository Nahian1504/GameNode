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
const ErrorLog = require("../../models/ErrorLog");

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  await mongoose.connect(process.env.MONGODB_URI_TEST || "mongodb://localhost:27017/gamenode_test");
});
afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); server.close(); });
beforeEach(async () => { await User.deleteMany({}); await ErrorLog.deleteMany({}); jest.clearAllMocks(); });

describe("Error Message Backend Test", () => {

  test("returns standard error shape for 404 routes", async () => {
    const res = await request(app).get("/api/nonexistent-route");
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body).toHaveProperty("message");
    expect(res.body).toHaveProperty("statusCode", 404);
  });

  test("returns 400 with clean message for invalid MongoDB ObjectId", async () => {
    const res = await request(app).get("/api/steam/game/notanid").set("Authorization", "Bearer fakejwt");
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("returns 401 for invalid JWT token", async () => {
    const res = await request(app).get("/api/steam/dashboard").set("Authorization", "Bearer invalid.jwt.token");
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid token/i);
  });

  test("returns 401 with specific message for expired token", async () => {
    // Craft an expired JWT manually
    const jwt = require("jsonwebtoken");
    const expiredToken = jwt.sign({ id: "123" }, process.env.JWT_SECRET || "testsecret", { expiresIn: "0s" });
    await new Promise((r) => setTimeout(r, 10));
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${expiredToken}`);
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toMatch(/expired/i);
  });

  test("returns 400 for validation errors with clean message", async () => {
    const res = await request(app).post("/api/auth/register").send({ username: "ab", email: "notanemail", password: "weak" });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(typeof res.body.message).toBe("string");
  });

  test("returns 409 for duplicate email registration", async () => {
    await request(app).post("/api/auth/register").send({ username: "user1", email: "dup@test.com", password: "SecurePass1!" });
    const res = await request(app).post("/api/auth/register").send({ username: "user2", email: "dup@test.com", password: "SecurePass1!" });
    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test("all error responses have consistent shape with success, message, statusCode", async () => {
    const responses = await Promise.all([
      request(app).get("/api/nonexistent"),
      request(app).get("/api/auth/me"),
      request(app).post("/api/auth/login").send({ email: "x", password: "" }),
    ]);
    responses.forEach((res) => {
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("message");
      expect(res.body).toHaveProperty("statusCode");
    });
  });

  test("does not expose stack trace in production", async () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    const res = await request(app).get("/api/nonexistent");
    expect(res.body.stack).toBeUndefined();
    process.env.NODE_ENV = origEnv;
  });

  test("error events are saved to ErrorLog collection", async () => {
    await request(app).get("/api/nonexistent-logged-route");
    await new Promise((r) => setTimeout(r, 100)); // allow async log to complete
    const log = await ErrorLog.findOne({ route: "/api/nonexistent-logged-route" });
    expect(log).not.toBeNull();
    expect(log.statusCode).toBe(404);
  });
});
