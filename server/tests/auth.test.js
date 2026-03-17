// Mock steamService so tests never call the real Steam API
jest.mock("../utils/steamService", () => ({
  getOwnedGames: jest.fn(),
  getCurrentPlayerCount: jest.fn(),
  getPlayerSummary: jest.fn(),
  getGameNews: jest.fn(),
  clearUserCache: jest.fn(),
}));

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const request = require("supertest");
const mongoose = require("mongoose");
const { app, server } = require("../index");
const User = require("../models/User");
const { UserGame } = require("../models/Game");

const {
  getOwnedGames,
  getCurrentPlayerCount,
  getPlayerSummary,
  getGameNews,
  clearUserCache,
} = require("../utils/steamService");

// Sample mock data — mimics real Steam API responses
const MOCK_STEAM_ID = "76561198000000001";

const MOCK_PLAYER_SUMMARY = {
  steamid: MOCK_STEAM_ID,
  personaname: "TestGamer",
  avatarfull: "https://steamcdn.com/avatar.jpg",
  profileurl: "https://steamcommunity.com/id/testgamer",
  communityvisibilitystate: 3, 
};

const MOCK_GAMES = [
  {
    appid: 570,
    name: "Dota 2",
    playtime_forever: 1200,
    img_icon_url: "abc123",
  },
  {
    appid: 730,
    name: "Counter-Strike 2",
    playtime_forever: 600,
    img_icon_url: "def456",
  },
  {
    appid: 440,
    name: "Team Fortress 2",
    playtime_forever: 0,
    img_icon_url: "ghi789",
  },
];

const MOCK_NEWS = [
  {
    gid: "1001",
    title: "Dota 2 Major Update Patch Notes",
    url: "https://store.steampowered.com/news/app/570",
    author: "Valve",
    feedname: "steam_community_announcements",
    date: 1700000000,
  },
  {
    gid: "1002",
    title: "New Hero Arrives in Dota 2",
    url: "https://store.steampowered.com/news/app/570/2",
    author: "Valve",
    feedname: "steam_community_announcements",
    date: 1699000000,
  },
];

// Use a separate test database
beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await mongoose.connect(
    process.env.MONGODB_URI_TEST ||
      "mongodb://localhost:27017/gamenode_test"
  );
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  server.close();
});

// Clean collections and reset mocks between tests
beforeEach(async () => {
  await User.deleteMany({});
  await UserGame.deleteMany({});
  jest.clearAllMocks();
});

// User story 1: User Registration Tests
describe("POST /api/auth/register", () => {
  const validUser = {
    username: "testgamer",
    email: "test@gamenode.com",
    password: "SecurePass1!",
  };

  test("should register a new user and return JWT token", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send(validUser);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(validUser.email);
    expect(res.body.user.username).toBe(validUser.username);
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  test("should save hashed password in MongoDB (not plain text)", async () => {
    await request(app).post("/api/auth/register").send(validUser);

    const userInDB = await User.findOne({ email: validUser.email }).select("+passwordHash");
    expect(userInDB).toBeTruthy();
    expect(userInDB.passwordHash).toBeDefined();
    expect(userInDB.passwordHash).not.toBe(validUser.password);
    expect(userInDB.passwordHash).toMatch(/^\$2b\$/);
  });

  test("should reject duplicate email with 409", async () => {
    await request(app).post("/api/auth/register").send(validUser);
    const res = await request(app).post("/api/auth/register").send(validUser);

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("email");
  });

  test("should reject duplicate username with 409", async () => {
    await request(app).post("/api/auth/register").send(validUser);
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...validUser, email: "other@gamenode.com" });

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("username");
  });

  test("should reject weak password (no number) with 400", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...validUser, password: "NoNumbers!" });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });

  test("should reject weak password (too short) with 400", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...validUser, password: "Ab1!" });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  test("should reject invalid email format with 400", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...validUser, email: "not-an-email" });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  test("should reject missing username with 400", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: validUser.email, password: validUser.password });

    expect(res.statusCode).toBe(400);
  });

  test("should store user in MongoDB with correct fields", async () => {
    await request(app).post("/api/auth/register").send(validUser);

    const user = await User.findOne({ email: validUser.email });
    expect(user).toBeTruthy();
    expect(user.username).toBe(validUser.username);
    expect(user.email).toBe(validUser.email);
    expect(user.role).toBe("user");
    expect(user.steamId).toBeNull();
  });
});

// User story 2: User Login Tests
describe("POST /api/auth/login", () => {
  const user = {
    username: "logingamer",
    email: "login@gamenode.com",
    password: "SecurePass1!",
  };

  beforeEach(async () => {
    await request(app).post("/api/auth/register").send(user);
  });

  test("should login with valid credentials and return JWT", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: user.password });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(user.email);
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  test("should reject wrong password with 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "WrongPassword1!" });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Invalid email or password.");
  });

  test("should reject non-existent email with 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@gamenode.com", password: user.password });

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Invalid email or password.");
  });

  test("should reject empty password with 400", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "" });

    expect(res.statusCode).toBe(400);
  });
});

// User story 3: Protected Routes Tests (JWT Middleware)
describe("GET /api/auth/me (protected route)", () => {
  let token;

  beforeEach(async () => {
    const res = await request(app).post("/api/auth/register").send({
      username: "authtester",
      email: "auth@gamenode.com",
      password: "SecurePass1!",
    });
    token = res.body.token;
  });

  test("should return user data with valid JWT", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe("auth@gamenode.com");
  });

  test("should reject request with no token (401)", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test("should reject request with invalid token (401)", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer this.is.not.valid");
    expect(res.statusCode).toBe(401);
  });

  test("should reject request with malformed Authorization header", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "NotBearer sometoken");
    expect(res.statusCode).toBe(401);
  });
});

// User story 4: Steam API test
describe("POST /api/steam/connect", () => {
  let token;

  // Register and get a token before each test
  beforeEach(async () => {
    const res = await request(app).post("/api/auth/register").send({
      username: "steamtester",
      email: "steam@gamenode.com",
      password: "SecurePass1!",
    });
    token = res.body.token;
  });

  test("should connect valid public Steam account and save to DB", async () => {
    // Mock steamService to return valid public profile
    getPlayerSummary.mockResolvedValueOnce(MOCK_PLAYER_SUMMARY);

    const res = await request(app)
      .post("/api/steam/connect")
      .set("Authorization", `Bearer ${token}`)
      .send({ steamId: MOCK_STEAM_ID });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.steamProfile.steamId).toBe(MOCK_STEAM_ID);
    expect(res.body.steamProfile.personaName).toBe("TestGamer");

    // Verify steamId was saved in MongoDB 
    const user = await User.findOne({ email: "steam@gamenode.com" });
    expect(user.steamId).toBe(MOCK_STEAM_ID);
  });

  test("should reject invalid Steam ID format (not 17 digits) with 400", async () => {
    const res = await request(app)
      .post("/api/steam/connect")
      .set("Authorization", `Bearer ${token}`)
      .send({ steamId: "12345" }); 

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/17 digits/i);
  });

  test("should reject Steam ID with letters with 400", async () => {
    const res = await request(app)
      .post("/api/steam/connect")
      .set("Authorization", `Bearer ${token}`)
      .send({ steamId: "7656119800000000X" }); 

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/17 digits/i);
  });

  test("should reject private Steam profile with 400", async () => {
    getPlayerSummary.mockRejectedValueOnce(
      new Error("Steam profile is private. Please make it public to use GameNode.")
    );

    const res = await request(app)
      .post("/api/steam/connect")
      .set("Authorization", `Bearer ${token}`)
      .send({ steamId: MOCK_STEAM_ID });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/private/i);
  });

  test("should reject non-existent Steam ID with 400", async () => {
    getPlayerSummary.mockRejectedValueOnce(new Error("Steam ID not found"));

    const res = await request(app)
      .post("/api/steam/connect")
      .set("Authorization", `Bearer ${token}`)
      .send({ steamId: "76561198999999999" });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/not found/i);
  });

  test("should reject duplicate Steam ID already linked to another account with 409", async () => {
    // Register a second user and link the Steam ID to them first
    const secondUserRes = await request(app).post("/api/auth/register").send({
      username: "secondgamer",
      email: "second@gamenode.com",
      password: "SecurePass1!",
    });
    await User.findByIdAndUpdate(secondUserRes.body.user._id, { steamId: MOCK_STEAM_ID });

    const res = await request(app)
      .post("/api/steam/connect")
      .set("Authorization", `Bearer ${token}`)
      .send({ steamId: MOCK_STEAM_ID });

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already linked/i);
  });

  test("should reject request with no JWT token with 401", async () => {
    const res = await request(app)
      .post("/api/steam/connect")
      .send({ steamId: MOCK_STEAM_ID });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test("should reject missing steamId field with 400", async () => {
    const res = await request(app)
      .post("/api/steam/connect")
      .set("Authorization", `Bearer ${token}`)
      .send({}); 

    expect(res.statusCode).toBe(400);
  });
});

describe("GET /api/steam/dashboard", () => {
  let token;
  let userId;

  beforeEach(async () => {
    const res = await request(app).post("/api/auth/register").send({
      username: "dashboardtester",
      email: "dashboard@gamenode.com",
      password: "SecurePass1!",
    });
    token = res.body.token;
    userId = res.body.user._id;
  });

  test("should return 400 when no Steam account is linked", async () => {
    const res = await request(app)
      .get("/api/steam/dashboard")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/no steam account/i);
  });

  test("should return paginated game library when Steam is linked", async () => {
    await User.findByIdAndUpdate(userId, { steamId: MOCK_STEAM_ID });

    // Mock Steam service with game list
    getOwnedGames.mockResolvedValueOnce(MOCK_GAMES);

    const res = await request(app)
      .get("/api/steam/dashboard?page=1&limit=12")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.games).toBeInstanceOf(Array);
    expect(res.body.games.length).toBe(3); 
    expect(res.body.total).toBe(3);
    expect(res.body.page).toBe(1);
    expect(res.body.totalPages).toBe(1);
  });

  test("should return correctly formatted game objects", async () => {
    await User.findByIdAndUpdate(userId, { steamId: MOCK_STEAM_ID });
    getOwnedGames.mockResolvedValueOnce(MOCK_GAMES);

    const res = await request(app)
      .get("/api/steam/dashboard")
      .set("Authorization", `Bearer ${token}`);

    const game = res.body.games[0];
    // Verify all required fields are present for the frontend
    expect(game).toHaveProperty("appId");
    expect(game).toHaveProperty("name");
    expect(game).toHaveProperty("playtimeHours");
    expect(game).toHaveProperty("headerImageUrl");
    // playtime should be in hours 
    expect(game.playtimeHours).toBe(20);
  });

  test("should sort games by playtime (most played first)", async () => {
    await User.findByIdAndUpdate(userId, { steamId: MOCK_STEAM_ID });
    getOwnedGames.mockResolvedValueOnce(MOCK_GAMES);

    const res = await request(app)
      .get("/api/steam/dashboard")
      .set("Authorization", `Bearer ${token}`);

    const games = res.body.games;
    expect(games[0].name).toBe("Dota 2");
    expect(games[1].name).toBe("Counter-Strike 2");
    expect(games[2].name).toBe("Team Fortress 2");
  });

  test("should paginate correctly — page 1 of 2 with limit 2", async () => {
    await User.findByIdAndUpdate(userId, { steamId: MOCK_STEAM_ID });
    getOwnedGames.mockResolvedValueOnce(MOCK_GAMES);

    const res = await request(app)
      .get("/api/steam/dashboard?page=1&limit=2")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.games.length).toBe(2);
    expect(res.body.totalPages).toBe(2);
    expect(res.body.page).toBe(1);
  });

  test("should return page 2 with remaining games", async () => {
    await User.findByIdAndUpdate(userId, { steamId: MOCK_STEAM_ID });
    getOwnedGames.mockResolvedValueOnce(MOCK_GAMES);

    const res = await request(app)
      .get("/api/steam/dashboard?page=2&limit=2")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.games.length).toBe(1);
    expect(res.body.page).toBe(2);
  });

  test("should return empty array with message when library is empty", async () => {
    await User.findByIdAndUpdate(userId, { steamId: MOCK_STEAM_ID });
    getOwnedGames.mockResolvedValueOnce([]); 

    const res = await request(app)
      .get("/api/steam/dashboard")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.games).toEqual([]);
    expect(res.body.total).toBe(0);
    expect(res.body.message).toMatch(/no games found/i);
  });

  test("should return 503 when Steam API is unreachable", async () => {
    await User.findByIdAndUpdate(userId, { steamId: MOCK_STEAM_ID });
    getOwnedGames.mockRejectedValueOnce(new Error("Steam API unreachable"));

    const res = await request(app)
      .get("/api/steam/dashboard")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/temporarily unavailable/i);
  });

  test("should reject request with no token with 401", async () => {
    const res = await request(app).get("/api/steam/dashboard");
    expect(res.statusCode).toBe(401);
  });

  test("should reject invalid pagination params with 400", async () => {
    await User.findByIdAndUpdate(userId, { steamId: MOCK_STEAM_ID });

    const res = await request(app)
      .get("/api/steam/dashboard?page=-1&limit=200")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/invalid pagination/i);
  });
});


describe("GET /api/steam/playercount/:appId", () => {
  let token;

  beforeEach(async () => {
    const res = await request(app).post("/api/auth/register").send({
      username: "playercounttester",
      email: "playercount@gamenode.com",
      password: "SecurePass1!",
    });
    token = res.body.token;
  });

  test("should return current player count for a valid appId", async () => {
    getCurrentPlayerCount.mockResolvedValueOnce(412857);

    const res = await request(app)
      .get("/api/steam/playercount/570")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.appId).toBe("570");
    expect(res.body.playerCount).toBe(412857);
  });

  test("should return 0 player count when game has no players", async () => {
    getCurrentPlayerCount.mockResolvedValueOnce(0);

    const res = await request(app)
      .get("/api/steam/playercount/99999")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.playerCount).toBe(0);
  });

  test("should reject non-numeric appId with 400", async () => {
    const res = await request(app)
      .get("/api/steam/playercount/notanid")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/numeric/i);
  });

  test("should reject request with no token with 401", async () => {
    const res = await request(app).get("/api/steam/playercount/570");
    expect(res.statusCode).toBe(401);
  });
});

describe("GET /api/steam/news/:appId", () => {
  let token;

  beforeEach(async () => {
    const res = await request(app).post("/api/auth/register").send({
      username: "newstester",
      email: "news@gamenode.com",
      password: "SecurePass1!",
    });
    token = res.body.token;
  });

  test("should return news articles for a valid appId", async () => {
    getGameNews.mockResolvedValueOnce(MOCK_NEWS);

    const res = await request(app)
      .get("/api/steam/news/570")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.appId).toBe("570");
    expect(res.body.news).toBeInstanceOf(Array);
    expect(res.body.news.length).toBe(2);
  });

  test("should return correctly formatted news articles", async () => {
    getGameNews.mockResolvedValueOnce(MOCK_NEWS);

    const res = await request(app)
      .get("/api/steam/news/570")
      .set("Authorization", `Bearer ${token}`);

    const article = res.body.news[0];
    expect(article).toHaveProperty("gid");
    expect(article).toHaveProperty("title");
    expect(article).toHaveProperty("url");
    expect(article).toHaveProperty("author");
    expect(article).toHaveProperty("feedName");
    expect(article).toHaveProperty("date");
    expect(article.date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test("should return empty array when no news available", async () => {
    getGameNews.mockResolvedValueOnce([]);

    const res = await request(app)
      .get("/api/steam/news/570")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.news).toEqual([]);
  });

  test("should reject non-numeric appId with 400", async () => {
    const res = await request(app)
      .get("/api/steam/news/badappid")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/numeric/i);
  });

  test("should reject request with no token with 401", async () => {
    const res = await request(app).get("/api/steam/news/570");
    expect(res.statusCode).toBe(401);
  });
});

describe("POST /api/steam/sync", () => {
  let token;
  let userId;

  beforeEach(async () => {
    const res = await request(app).post("/api/auth/register").send({
      username: "synctester",
      email: "sync@gamenode.com",
      password: "SecurePass1!",
    });
    token = res.body.token;
    userId = res.body.user._id;
  });

  test("should clear cache and confirm sync when Steam is linked", async () => {
    await User.findByIdAndUpdate(userId, { steamId: MOCK_STEAM_ID });
    clearUserCache.mockImplementation(() => {});

    const res = await request(app)
      .post("/api/steam/sync")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/cache cleared/i);
    expect(clearUserCache).toHaveBeenCalledWith(MOCK_STEAM_ID);
  });

  test("should return 400 when no Steam account is linked", async () => {
    const res = await request(app)
      .post("/api/steam/sync")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/no steam account/i);
  });

  test("should reject request with no token with 401", async () => {
    const res = await request(app).post("/api/steam/sync");
    expect(res.statusCode).toBe(401);
  });
});