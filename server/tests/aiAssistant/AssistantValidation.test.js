jest.mock("../../utils/genAIService", () => ({
  generateComplaintResolution: jest.fn(),
  generateRecommendations: jest.fn(),
  generateAssistantResponse: jest.fn().mockResolvedValue("Here are some tips for your game!"),
}));

jest.mock("../../utils/assistantContext", () => ({
  getUserContextForAssistant: jest.fn().mockResolvedValue({ topGames: [], totalGames: 5, totalPlaytimeHours: 20, recentAchievements: [] }),
}));

require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const request = require("supertest");
const mongoose = require("mongoose");
const { app, server } = require("../../index");
const User = require("../../models/User");

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  await mongoose.connect(process.env.MONGODB_URI_TEST || "mongodb://localhost:27017/gamenode_test");
});
afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); server.close(); });
beforeEach(async () => { await User.deleteMany({}); jest.clearAllMocks(); });

const setup = async (s = "1") => {
  const r = await request(app).post("/api/auth/register").send({ username: `akshat15${s}`, email: `akshat15${s}@t.com`, password: "SecurePass1!" });
  return r.body.token;
};

describe("AI Assistant Validation Test", () => {

  test("rejects request without JWT with 401", async () => {
    const res = await request(app).post("/api/assistant").send({ message: "What game should I play next?" });
    expect(res.statusCode).toBe(401);
  });

  test("rejects empty message with 400", async () => {
    const token = await setup("a");
    const res = await request(app).post("/api/assistant").set("Authorization", `Bearer ${token}`).send({ message: "" });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/message is required/i);
  });

  test("rejects message over 300 characters with 400", async () => {
    const token = await setup("b");
    const res = await request(app).post("/api/assistant").set("Authorization", `Bearer ${token}`).send({ message: "A".repeat(301) });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/300 characters/i);
  });

  test("strips HTML tags from message before processing", async () => {
    const token = await setup("c");
    const res = await request(app).post("/api/assistant").set("Authorization", `Bearer ${token}`)
      .send({ message: "<script>alert('xss')</script>What game should I play?" });
    expect(res.statusCode).toBe(200);
    const { generateAssistantResponse } = require("../../utils/genAIService");
    const calledMsg = generateAssistantResponse.mock.calls[0][0];
    expect(calledMsg).not.toContain("<script>");
  });

  test("accepts valid message and returns response", async () => {
    const token = await setup("d");
    const res = await request(app).post("/api/assistant").set("Authorization", `Bearer ${token}`).send({ message: "What achievements should I focus on in Dota 2?" });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.response).toBeTruthy();
  });

  test("accepts optional sessionHistory array", async () => {
    const token = await setup("e");
    const history = [{ role: "user", content: "Hi" }, { role: "assistant", content: "Hello!" }];
    const res = await request(app).post("/api/assistant").set("Authorization", `Bearer ${token}`)
      .send({ message: "Follow up question here", sessionHistory: history });
    expect(res.statusCode).toBe(200);
  });

  test("rejects non-array sessionHistory with 400", async () => {
    const token = await setup("f");
    const res = await request(app).post("/api/assistant").set("Authorization", `Bearer ${token}`)
      .send({ message: "Valid message here", sessionHistory: "not an array" });
    expect(res.statusCode).toBe(400);
  });
});
