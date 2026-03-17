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
