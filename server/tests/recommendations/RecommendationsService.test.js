jest.mock("axios");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const axios = require("axios");
const { generateRecommendations } = require("../utils/genAIService");

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  await mongoose.connect(process.env.MONGODB_URI_TEST || "mongodb://localhost:27017/gamenode_test");
  process.env.GROQ_API_KEY = "test-key";
});
afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
beforeEach(() => jest.clearAllMocks());

const MOCK_BEHAVIOR = {
  topGames: [{ name: "Dota 2", hours: 20 }, { name: "CS2", hours: 10 }],
  totalGames: 15,
  totalPlaytimeHours: 30,
  topAchievementGames: [{ name: "Portal 2" }],
  favoriteGames: [{ name: "Half-Life 2" }],
};

const mockGenAIResponse = (text) => {
  axios.post.mockResolvedValueOnce({
    data: {
      choices: [{ message: { content: text } }],
    },
  });
};

describe("GenAI recommendation service Test", () => {

  test("returns array of 5 recommendations", async () => {
    mockGenAIResponse(MOCK_RECS_JSON);
    const result = await generateRecommendations(MOCK_BEHAVIOR);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(5);
  });

  test("each recommendation has name, reason, matchPercent, genre", async () => {
    mockGenAIResponse(MOCK_RECS_JSON);
    const result = await generateRecommendations(MOCK_BEHAVIOR);
    result.forEach((rec) => {
      expect(rec).toHaveProperty("name");
      expect(rec).toHaveProperty("reason");
      expect(rec).toHaveProperty("matchPercent");
      expect(rec).toHaveProperty("genre");
    });
  });

  test("includes user's top games in the prompt", async () => {
    mockGenAIResponse(MOCK_RECS_JSON);
    await generateRecommendations(MOCK_BEHAVIOR);
    const callBody = axios.post.mock.calls[0][1];
    expect(callBody.contents[0].parts[0].text).toContain("Dota 2");
    expect(callBody.contents[0].parts[0].text).toContain("CS2");
  });

  test("throws error when API returns invalid JSON", async () => {
    mockGenAIResponse("Not valid JSON at all");
    await expect(generateRecommendations(MOCK_BEHAVIOR)).rejects.toThrow("invalid recommendation format");
  });

  test("throws error when API returns non-array JSON", async () => {
    mockGenAIResponse('{"name": "test"}');
    await expect(generateRecommendations(MOCK_BEHAVIOR)).rejects.toThrow("not an array");
  });

  test("strips markdown code fences before parsing", async () => {
    const wrapped = "```json\n" + MOCK_RECS_JSON + "\n```";
    mockGenAIResponse(wrapped);
    const result = await generateRecommendations(MOCK_BEHAVIOR);
    expect(result.length).toBe(5);
  });

  test("limits response to max 5 recommendations", async () => {
    const sixRecs = JSON.stringify([...JSON.parse(MOCK_RECS_JSON), { name: "Extra", reason: "Extra", matchPercent: 70, genre: "Action" }]);
    mockGenAIResponse(sixRecs);
    const result = await generateRecommendations(MOCK_BEHAVIOR);
    expect(result.length).toBe(5);
  });

  test("throws when API call fails with network error", async () => {
    axios.post.mockRejectedValueOnce(new Error("Network error"));
    await expect(generateRecommendations(MOCK_BEHAVIOR)).rejects.toThrow();
  });

  test("calls Gemini API with correct endpoint", async () => {
    mockGenAIResponse(MOCK_RECS_JSON);
    await generateRecommendations(MOCK_BEHAVIOR);
    expect(axios.post.mock.calls[0][0]).toContain("api.groq.com");
    expect(axios.post.mock.calls[0][1].messages).toBeDefined();
  });

  test("throws when GEMINI_API_KEY is not set", async () => {
    const orig = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    await expect(generateRecommendations(MOCK_BEHAVIOR)).rejects.toThrow("GROQ_API_KEY is not configured");
    process.env.GEMINI_API_KEY = orig;
  });
});
