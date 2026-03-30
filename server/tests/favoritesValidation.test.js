jest.mock("../utils/steamService", () => ({
  getOwnedGames: jest.fn(), getCurrentPlayerCount: jest.fn(), getPlayerSummary: jest.fn(),
  getGameNews: jest.fn(), clearUserCache: jest.fn(), getGameDetail: jest.fn(),
  getPlayerAchievements: jest.fn(), getGlobalAchievementPercentages: jest.fn(),
}));
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const request = require("supertest");
const mongoose = require("mongoose");
const { app, server } = require("../index");
const User = require("../models/User");
const { UserGame } = require("../models/Game");

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  await mongoose.connect(process.env.MONGODB_URI_TEST || "mongodb://localhost:27017/gamenode_test");
});
afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); server.close(); });
beforeEach(async () => { await User.deleteMany({}); await UserGame.deleteMany({}); jest.clearAllMocks(); });

const getToken = async (n="9a") => {
  const r = await request(app).post("/api/auth/register").send({ username: `u${n}`, email: `${n}@t.com`, password: "SecurePass1!" });
  return r.body.token;
};

describe("Favorites Validation Test", () => {
  test("POST /api/favorites rejects empty appId with 400", async () => {
    const token = await getToken("9a1");
    const res = await request(app).post("/api/favorites").set("Authorization", `Bearer ${token}`).send({ appId: "" });
    expect(res.statusCode).toBe(400);
  });
  test("POST /api/favorites rejects non-numeric appId with 400", async () => {
    const token = await getToken("9a2");
    const res = await request(app).post("/api/favorites").set("Authorization", `Bearer ${token}`).send({ appId: "abc" });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/numeric/i);
  });
  test("DELETE /api/favorites/:appId rejects non-numeric appId with 400", async () => {
    const token = await getToken("9a3");
    const res = await request(app).delete("/api/favorites/notanumber").set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(400);
  });
  test("POST /api/favorites requires JWT", async () => {
    const res = await request(app).post("/api/favorites").send({ appId: "570" });
    expect(res.statusCode).toBe(401);
  });
  test("DELETE /api/favorites/:appId requires JWT", async () => {
    const res = await request(app).delete("/api/favorites/570");
    expect(res.statusCode).toBe(401);
  });
  test("GET /api/favorites requires JWT", async () => {
    const res = await request(app).get("/api/favorites");
    expect(res.statusCode).toBe(401);
  });
  test("POST /api/favorites accepts valid numeric appId", async () => {
    const token = await getToken("9a4");
    const res = await request(app).post("/api/favorites").set("Authorization", `Bearer ${token}`).send({ appId: "570" });
    expect([201, 409]).toContain(res.statusCode);
  });
});
