jest.mock("../utils/steamService", () => ({
  getOwnedGames: jest.fn(),
  getCurrentPlayerCount: jest.fn(),
  getPlayerSummary: jest.fn(),
  getGameNews: jest.fn(),
  clearUserCache: jest.fn(),
  getGameDetail: jest.fn(),
  getPlayerAchievements: jest.fn(),
  getGlobalAchievementPercentages: jest.fn(),
}));

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const request = require("supertest");
const mongoose = require("mongoose");
const { app, server } = require("../index");
const User  = require("../models/User");
const { UserGame } = require("../models/Game");
const { getOwnedGames } = require("../utils/steamService");

const MOCK_STEAM_ID = "76561198000000001";
const MOCK_GAMES = [
  { appid: 570, name: "Dota 2", playtime_forever: 1200, img_icon_url: "a" },
  { appid: 730, name: "Counter-Strike 2", playtime_forever: 600,  img_icon_url: "b" },
];

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
  const res = await request(app).post("/api/auth/register").send({
    username: "akshattest", email: "akshat@test.com", password: "SecurePass1!",
  });
  const token = res.body.token;
  const userId = res.body.user._id;
  await User.findByIdAndUpdate(userId, { steamId: MOCK_STEAM_ID });
  return { token, userId };
};

describe("Dashboard Validation Middleware Test", () => {

  test("should accept valid sort=playtime param", async () => {
    const { token } = await setupUser();
    getOwnedGames.mockResolvedValueOnce(MOCK_GAMES);
    const res = await request(app)
      .get("/api/steam/dashboard?sort=playtime")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
  });

  test("should accept valid sort=name param", async () => {
    const { token } = await setupUser();
    getOwnedGames.mockResolvedValueOnce(MOCK_GAMES);
    const res = await request(app)
      .get("/api/steam/dashboard?sort=name")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.sort).toBe("name");
  });

  test("should accept valid sort=recent param", async () => {
    const { token } = await setupUser();
    getOwnedGames.mockResolvedValueOnce(MOCK_GAMES);
    const res = await request(app)
      .get("/api/steam/dashboard?sort=recent")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
  });

  test("should reject invalid sort value with 400", async () => {
    const { token } = await setupUser();
    const res = await request(app)
      .get("/api/steam/dashboard?sort=invalid_value")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/sort must be one of/i);
  });

  test("should reject sort=random with 400", async () => {
    const { token } = await setupUser();
    const res = await request(app)
      .get("/api/steam/dashboard?sort=random")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(400);
  });

  test("should reject page=-1 with 400", async () => {
    const { token } = await setupUser();
    const res = await request(app)
      .get("/api/steam/dashboard?page=-1")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/positive integer/i);
  });

  test("should reject page=0 with 400", async () => {
    const { token } = await setupUser();
    const res = await request(app)
      .get("/api/steam/dashboard?page=0")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(400);
  });

  test("should reject limit=0 with 400", async () => {
    const { token } = await setupUser();
    const res = await request(app)
      .get("/api/steam/dashboard?limit=0")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(400);
  });

  test("should reject limit=100 (over max 50) with 400", async () => {
    const { token } = await setupUser();
    const res = await request(app)
      .get("/api/steam/dashboard?limit=100")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/limit must be between/i);
  });

  test("should accept limit=50 (boundary value)", async () => {
    const { token } = await setupUser();
    getOwnedGames.mockResolvedValueOnce(MOCK_GAMES);
    const res = await request(app)
      .get("/api/steam/dashboard?limit=50")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
  });

  test("should accept valid combined params page=1&limit=12&sort=name", async () => {
    const { token } = await setupUser();
    getOwnedGames.mockResolvedValueOnce(MOCK_GAMES);
    const res = await request(app)
      .get("/api/steam/dashboard?page=1&limit=12&sort=name")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
  });

  test("should return 400 with errors array on invalid input", async () => {
    const { token } = await setupUser();
    const res = await request(app)
      .get("/api/steam/dashboard?sort=bad&page=-1")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("errors");
    expect(Array.isArray(res.body.errors)).toBe(true);
  });
});
