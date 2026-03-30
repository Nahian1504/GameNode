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
const { UserGame } = require("../models/Game");
const { getPlayerAchievements, getGlobalAchievementPercentages } = require("../utils/steamService");

const MOCK_STEAM_ID = "76561198000000010";

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  await mongoose.connect(process.env.MONGODB_URI_TEST || "mongodb://localhost:27017/gamenode_test");
});
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  server.close();
});
beforeEach(async () => {
  await User.deleteMany({});
  await UserGame.deleteMany({});
  jest.clearAllMocks();
});

const setupUser = async () => {
  const res = await request(app).post("/api/auth/register").send({ username: "aks8", email: "aks8@test.com", password: "SecurePass1!" });
  const token = res.body.token;
  const userId = res.body.user._id;
  await User.findByIdAndUpdate(userId, { steamId: MOCK_STEAM_ID });
  return { token, userId };
};

const MOCK_ACHIEVEMENTS = [
  { apiname: "ACH_WIN", name: "First Win", description: "Win a game", achieved: 1, unlocktime: 1700000000 },
];

describe("Achievement Validation middleware Test", () => {

  test("should reject non-numeric appId with 400", async () => {
    const { token } = await setupUser();
    const res = await request(app)
      .get("/api/achievements/notanumber")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/numeric/i);
  });

  test("should reject empty appId with 400", async () => {
    const { token } = await setupUser();
    const res = await request(app)
      .get("/api/achievements/ ")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(400);
  });

  test("should reject appId with letters with 400", async () => {
    const { token } = await setupUser();
    const res = await request(app)
      .get("/api/achievements/570abc")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/numeric/i);
  });

  test("should accept valid numeric appId", async () => {
    const { token } = await setupUser();
    getPlayerAchievements.mockResolvedValueOnce(MOCK_ACHIEVEMENTS);
    getGlobalAchievementPercentages.mockResolvedValueOnce({ ACH_WIN: 45.2 });
    const res = await request(app)
      .get("/api/achievements/570")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
  });

  test("should reject request with no JWT with 401", async () => {
    const res = await request(app).get("/api/achievements/570");
    expect(res.statusCode).toBe(401);
  });

  test("should return 400 when no Steam account linked", async () => {
    const res = await request(app).post("/api/auth/register").send({ username: "nosteam8", email: "nosteam8@test.com", password: "SecurePass1!" });
    const token = res.body.token;
    const apiRes = await request(app).get("/api/achievements/570").set("Authorization", `Bearer ${token}`);
    expect(apiRes.statusCode).toBe(400);
    expect(apiRes.body.message).toMatch(/no steam account/i);
  });

  test("cached endpoint also validates appId", async () => {
    const { token } = await setupUser();
    const res = await request(app)
      .get("/api/achievements/notanumber/cached")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/numeric/i);
  });

  test("cached endpoint requires JWT", async () => {
    const res = await request(app).get("/api/achievements/570/cached");
    expect(res.statusCode).toBe(401);
  });
});
