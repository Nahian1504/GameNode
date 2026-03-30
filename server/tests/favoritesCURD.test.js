jest.mock("../utils/steamService", () => ({
  getOwnedGames: jest.fn(), getCurrentPlayerCount: jest.fn(), getPlayerSummary: jest.fn(),
  getGameNews: jest.fn(), clearUserCache: jest.fn(), getGameDetail: jest.fn(),
  getPlayerAchievements: jest.fn(), getGlobalAchievementPercentages: jest.fn(),
}));
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const request  = require("supertest");
const mongoose = require("mongoose");
const { app, server } = require("../index");
const User = require("../models/User");
const { UserGame } = require("../models/Game");
const Favorite = require("../models/Favorite");

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  await mongoose.connect(process.env.MONGODB_URI_TEST || "mongodb://localhost:27017/gamenode_test");
});
afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); server.close(); });
beforeEach(async () => { await User.deleteMany({}); await UserGame.deleteMany({}); await Favorite.deleteMany({}); jest.clearAllMocks(); });

const setup = async (n="9d") => {
  const r = await request(app).post("/api/auth/register").send({ username: `u${n}`, email: `${n}@t.com`, password: "SecurePass1!" });
  return { token: r.body.token, userId: r.body.user._id };
};

describe("Favorites CRUD endpoints Test", () => {
  test("GET /api/favorites returns empty array for new user", async () => {
    const { token } = await setup("9d1");
    const res = await request(app).get("/api/favorites").set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.favorites).toEqual([]);
    expect(res.body.total).toBe(0);
  });
  test("POST /api/favorites adds a game and returns 201", async () => {
    const { token } = await setup("9d2");
    const res = await request(app).post("/api/favorites").set("Authorization", `Bearer ${token}`).send({ appId: "570" });
    expect(res.statusCode).toBe(201);
    expect(res.body.favorite.appId).toBe("570");
  });
  test("POST /api/favorites saves to MongoDB", async () => {
    const { token, userId } = await setup("9d3");
    await request(app).post("/api/favorites").set("Authorization", `Bearer ${token}`).send({ appId: "570" });
    const doc = await Favorite.findOne({ userId });
    expect(doc.hasGame("570")).toBe(true);
  });
  test("POST /api/favorites rejects duplicate with 409", async () => {
    const { token } = await setup("9d4");
    await request(app).post("/api/favorites").set("Authorization", `Bearer ${token}`).send({ appId: "570" });
    const res = await request(app).post("/api/favorites").set("Authorization", `Bearer ${token}`).send({ appId: "570" });
    expect(res.statusCode).toBe(409);
    expect(res.body.message).toMatch(/already in favorites/i);
  });
  test("DELETE /api/favorites/:appId removes game and returns 200", async () => {
    const { token } = await setup("9d5");
    await request(app).post("/api/favorites").set("Authorization", `Bearer ${token}`).send({ appId: "570" });
    const res = await request(app).delete("/api/favorites/570").set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.appId).toBe("570");
  });
  test("DELETE /api/favorites/:appId returns 404 for non-existent game", async () => {
    const { token } = await setup("9d6");
    const res = await request(app).delete("/api/favorites/570").set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(404);
  });
  test("GET /api/favorites returns enriched games after adding", async () => {
    const { token, userId } = await setup("9d7");
    await UserGame.create({ userId, appId: "570", name: "Dota 2", playtimeForever: 1200 });
    await request(app).post("/api/favorites").set("Authorization", `Bearer ${token}`).send({ appId: "570" });
    const res = await request(app).get("/api/favorites").set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.favorites[0].name).toBe("Dota 2");
    expect(res.body.favorites[0].playtimeHours).toBe(20);
  });
});
