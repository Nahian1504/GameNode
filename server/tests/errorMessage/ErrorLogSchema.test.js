require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const ErrorLog = require("../models/ErrorLog");

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  await mongoose.connect(process.env.MONGODB_URI_TEST || "mongodb://localhost:27017/gamenode_test");
});
afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
beforeEach(async () => { await ErrorLog.deleteMany({}); });

describe("ErrorLog Schema Test", () => {

  test("creates log entry with all required fields", async () => {
    const doc = await ErrorLog.create({ route: "/api/steam/dashboard", method: "GET", statusCode: 503, message: "Steam API unavailable" });
    expect(doc.route).toBe("/api/steam/dashboard");
    expect(doc.method).toBe("GET");
    expect(doc.statusCode).toBe(503);
    expect(doc.createdAt).toBeDefined();
  });

  test("rejects entry with missing route", async () => {
    await expect(ErrorLog.create({ method: "GET", statusCode: 500, message: "Error" })).rejects.toThrow();
  });

  test("rejects entry with missing method", async () => {
    await expect(ErrorLog.create({ route: "/api/test", statusCode: 500, message: "Error" })).rejects.toThrow();
  });

  test("rejects entry with missing statusCode", async () => {
    await expect(ErrorLog.create({ route: "/api/test", method: "GET", message: "Error" })).rejects.toThrow();
  });

  test("logError static method saves entry without throwing", async () => {
    await expect(
      ErrorLog.logError({ route: "/api/auth/login", method: "POST", statusCode: 401, message: "Invalid credentials", stack: "Error stack here", ip: "127.0.0.1" })
    ).resolves.not.toThrow();
    const saved = await ErrorLog.findOne({ route: "/api/auth/login" });
    expect(saved).not.toBeNull();
    expect(saved.statusCode).toBe(401);
  });

  test("logError does not store stack in production", async () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    await ErrorLog.logError({ route: "/api/test", method: "GET", statusCode: 500, message: "Error", stack: "Should not be saved", ip: null });
    const saved = await ErrorLog.findOne({ route: "/api/test" });
    expect(saved.stack).toBeNull();
    process.env.NODE_ENV = origEnv;
  });

  test("logError stores stack in development", async () => {
    process.env.NODE_ENV = "development";
    await ErrorLog.logError({ route: "/api/dev", method: "GET", statusCode: 500, message: "Error", stack: "Error: at line 1", ip: null });
    const saved = await ErrorLog.findOne({ route: "/api/dev" });
    expect(saved.stack).toBe("Error: at line 1");
    process.env.NODE_ENV = "test";
  });

  test("logError truncates message over 500 characters", async () => {
    const longMsg = "A".repeat(600);
    await ErrorLog.logError({ route: "/api/test", method: "POST", statusCode: 400, message: longMsg, stack: null, ip: null });
    const saved = await ErrorLog.findOne({ route: "/api/test" });
    expect(saved.message.length).toBeLessThanOrEqual(500);
  });

  test("logError never throws even when database fails", async () => {
    await expect(ErrorLog.logError({})).resolves.not.toThrow();
  });
});
