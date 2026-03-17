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
