jest.mock("../utils/genAIService", () => ({
  generateComplaintResolution: jest.fn(),
  generateRecommendations: jest.fn(),
  generateAssistantResponse: jest.fn().mockResolvedValue("Focus on early game objectives and map control in Dota 2."),
}));

jest.mock("../utils/assistantContext", () => ({
  getUserContextForAssistant: jest.fn().mockResolvedValue({ topGames: [{ name: "Dota 2", hours: 20 }], totalGames: 5, totalPlaytimeHours: 30, recentAchievements: [] }),
}));

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const request = require("supertest");
const mongoose = require("mongoose");
const { app, server } = require("../index");
const User = require("../models/User");
const { generateAssistantResponse } = require("../utils/genAIService");
const { getUserContextForAssistant } = require("../utils/assistantContext");

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  await mongoose.connect(process.env.MONGODB_URI_TEST || "mongodb://localhost:27017/gamenode_test");
});
afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); server.close(); });
beforeEach(async () => { await User.deleteMany({}); jest.clearAllMocks(); });

const setup = async (s = "1") => {
  const r = await request(app).post("/api/auth/register").send({ username: `dhruv15${s}`, email: `dhruv15${s}@t.com`, password: "SecurePass1!" });
  return r.body.token;
};

describe("AI Assistant Backend Test", () => {

  test("POST /api/assistant returns AI response for valid message", async () => {
    const token = await setup("a");
    const res = await request(app).post("/api/assistant").set("Authorization", `Bearer ${token}`)
      .send({ message: "Give me some tips for Dota 2." });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.response).toBe("Focus on early game objectives and map control in Dota 2.");
    expect(res.body.role).toBe("assistant");
  });

  test("calls getUserContextForAssistant with user ID", async () => {
    const token = await setup("b");
    await request(app).post("/api/assistant").set("Authorization", `Bearer ${token}`).send({ message: "What should I play next?" });
    expect(getUserContextForAssistant).toHaveBeenCalledTimes(1);
  });

  test("passes sessionHistory to generateAssistantResponse", async () => {
    const token = await setup("c");
    const history = [{ role: "user", content: "Hi" }, { role: "assistant", content: "Hello!" }];
    await request(app).post("/api/assistant").set("Authorization", `Bearer ${token}`)
      .send({ message: "Follow up question.", sessionHistory: history });
    expect(generateAssistantResponse).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
      history
    );
  });

  test("passes empty array as sessionHistory when not provided", async () => {
    const token = await setup("d");
    await request(app).post("/api/assistant").set("Authorization", `Bearer ${token}`).send({ message: "First message." });
    expect(generateAssistantResponse).toHaveBeenCalledWith(expect.any(String), expect.any(Object), []);
  });

  test("returns 503 when GenAI assistant fails", async () => {
    generateAssistantResponse.mockRejectedValueOnce(new Error("GenAI down"));
    const token = await setup("e");
    const res = await request(app).post("/api/assistant").set("Authorization", `Bearer ${token}`).send({ message: "Valid question here." });
    expect(res.statusCode).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/temporarily unavailable/i);
  });

  test("response includes role field set to assistant", async () => {
    const token = await setup("f");
    const res = await request(app).post("/api/assistant").set("Authorization", `Bearer ${token}`).send({ message: "What is the best strategy?" });
    expect(res.body.role).toBe("assistant");
  });
});
