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
const User = require("../models/User");
const { UserGame } = require("../models/Game");
const { getOwnedGames, getGameNews, getCurrentPlayerCount } = require("../utils/steamService");

const MOCK_STEAM_ID = "76561198000000002";
const MOCK_GAMES = [
  { appid: 570,  name: "Dota 2", playtime_forever: 1200, img_icon_url: "a", rtime_last_played: 1700000000 },
  { appid: 730,  name: "Counter-Strike 2", playtime_forever: 600,  img_icon_url: "b", rtime_last_played: 1699000000 },
  { appid: 440,  name: "Team Fortress 2", playtime_forever: 0,    img_icon_url: "c", rtime_last_played: 0 },
];
const MOCK_NEWS = [
  { gid: "1001", title: "Patch 7.35", url: "https://steam.com/news/570/1", author: "Valve", feedname: "steam_community_announcements", feedlabel: "Community", date: 1700000000 },
  { gid: "1002", title: "New Hero", url: "https://steam.com/news/570/2", author: "Valve", feedname: "steam_community_announcements", feedlabel: "Community", date: 1699000000 },
  { gid: "1003", title: "Balance", url: "https://steam.com/news/570/3", author: "Valve", feedname: "steam_community_announcements", feedlabel: "Community", date: 1698000000 },
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
  const res    = await request(app).post("/api/auth/register").send({ username: "dhruv7", email: "dhruv7@test.com", password: "SecurePass1!" });
  const token  = res.body.token;
  const userId = res.body.user._id;
  await User.findByIdAndUpdate(userId, { steamId: MOCK_STEAM_ID });
  return { token, userId };
};

describe("Enhanced dashboard endpoint Test", () => {

  test("should sort games alphabetically when sort=name", async () => {
    const { token } = await setupUser();
    getOwnedGames.mockResolvedValueOnce(MOCK_GAMES);
    const res = await request(app)
      .get("/api/steam/dashboard?sort=name")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.games[0].name).toBe("Counter-Strike 2");
    expect(res.body.games[1].name).toBe("Dota 2");
    expect(res.body.games[2].name).toBe("Team Fortress 2");
  });

  test("should sort by playtime (default) — most played first", async () => {
    const { token } = await setupUser();
    getOwnedGames.mockResolvedValueOnce(MOCK_GAMES);
    const res = await request(app)
      .get("/api/steam/dashboard")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.games[0].name).toBe("Dota 2");
    expect(res.body.games[1].name).toBe("Counter-Strike 2");
    expect(res.body.games[2].name).toBe("Team Fortress 2");
  });

  test("should sort by recent play when sort=recent", async () => {
    const { token } = await setupUser();
    getOwnedGames.mockResolvedValueOnce(MOCK_GAMES);
    const res = await request(app)
      .get("/api/steam/dashboard?sort=recent")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.games[0].name).toBe("Dota 2");
  });

  test("should include sort field in response", async () => {
    const { token } = await setupUser();
    getOwnedGames.mockResolvedValueOnce(MOCK_GAMES);
    const res = await request(app)
      .get("/api/steam/dashboard?sort=name")
      .set("Authorization", `Bearer ${token}`);
    expect(res.body).toHaveProperty("sort", "name");
  });

  test("should return totalPlaytimeHours in response", async () => {
    const { token, userId } = await setupUser();
    // Pre-seed UserGame records for aggregation
    await UserGame.create({ userId, appId: "570", name: "Dota 2",  playtimeForever: 1200 });
    await UserGame.create({ userId, appId: "730", name: "CS2",     playtimeForever: 600  });
    getOwnedGames.mockResolvedValueOnce(MOCK_GAMES);

    const res = await request(app)
      .get("/api/steam/dashboard")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("totalPlaytimeHours");
    expect(res.body.totalPlaytimeHours).toBe(30); 
  });

  test("should return 503 when Steam API fails", async () => {
    const { token } = await setupUser();
    getOwnedGames.mockRejectedValueOnce(new Error("Steam down"));
    const res = await request(app)
      .get("/api/steam/dashboard")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(503);
  });

  test("should paginate correctly with page=1&limit=2", async () => {
    const { token } = await setupUser();
    getOwnedGames.mockResolvedValueOnce(MOCK_GAMES);
    const res = await request(app)
      .get("/api/steam/dashboard?page=1&limit=2")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.games.length).toBe(2);
    expect(res.body.totalPages).toBe(2);
  });
});

describe("Enhanced news endpoint Test", () => {
  let token;
  beforeEach(async () => {
    const res = await request(app).post("/api/auth/register").send({ username: "dhnews7", email: "dhnews7@test.com", password: "SecurePass1!" });
    token = res.body.token;
  });

  test("should accept count param and call getGameNews with that count", async () => {
    getGameNews.mockResolvedValueOnce(MOCK_NEWS.slice(0, 3));
    const res = await request(app)
      .get("/api/steam/news/570?count=3")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.news.length).toBe(3);
    expect(res.body.count).toBe(3);
  });

  test("should include dateReadable in each news item", async () => {
    getGameNews.mockResolvedValueOnce(MOCK_NEWS.slice(0, 1));
    const res = await request(app)
      .get("/api/steam/news/570")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.news[0]).toHaveProperty("dateReadable");
    expect(typeof res.body.news[0].dateReadable).toBe("string");
  });

  test("should include feedLabel in each news item", async () => {
    getGameNews.mockResolvedValueOnce(MOCK_NEWS.slice(0, 1));
    const res = await request(app)
      .get("/api/steam/news/570")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.news[0]).toHaveProperty("feedLabel");
  });

  test("should reject count=0 with 400", async () => {
    const res = await request(app)
      .get("/api/steam/news/570?count=0")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(400);
  });

  test("should reject count=25 (over max 20) with 400", async () => {
    const res = await request(app)
      .get("/api/steam/news/570?count=25")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/1 and 20/i);
  });

  test("should return count field in response body", async () => {
    getGameNews.mockResolvedValueOnce(MOCK_NEWS);
    const res = await request(app)
      .get("/api/steam/news/570")
      .set("Authorization", `Bearer ${token}`);
    expect(res.body).toHaveProperty("count");
    expect(typeof res.body.count).toBe("number");
  });
});
