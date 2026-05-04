jest.mock("axios");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const axios = require("axios");
const { generateAssistantResponse } = require("../utils/genAIService");

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  await mongoose.connect(process.env.MONGODB_URI_TEST || "mongodb://localhost:27017/gamenode_test");
  process.env.GROQ_API_KEY = "test-key";
});
afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
beforeEach(() => jest.clearAllMocks());

const MOCK_CONTEXT = {
  topGames: [{ name: "Dota 2", hours: 20 }, { name: "CS2", hours: 10 }],
  totalGames: 15,
  totalPlaytimeHours: 30,
  recentAchievements: [{ name: "First Win" }],
};

const mockResponse = (text) => {
  axios.post.mockResolvedValueOnce({
    data: {
      choices: [{ message: { content: text } }],
    },
  });
};

describe("GenAI Assistant Service Test", () => {

  test("returns assistant response text", async () => {
    mockResponse("Focus on last hitting creeps in the early game.");
    const result = await generateAssistantResponse("Dota 2 tips?", MOCK_CONTEXT, []);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(5);
  });

  test("includes user context in the prompt text", async () => {
    mockResponse("Here is my response.");
    await generateAssistantResponse("What game should I play?", MOCK_CONTEXT, []);
    const callBody = axios.post.mock.calls[0][1];
    expect(callBody.contents[0].parts[0].text).toContain("Dota 2");
    expect(callBody.contents[0].parts[0].text).toContain("20");
  });

  test("includes session history in the prompt tesxt", async () => {
    mockResponse("Follow-up response here.");
    const history = [
      { role: "user", content: "Hi there" },
      { role: "assistant", content: "Hello! How can I help?" },
    ];
    await generateAssistantResponse("What next?", MOCK_CONTEXT, history);
    const callBody = axios.post.mock.calls[0][1];
    expect(callBody.contents[0].parts[0].text).toContain("Hi there");
    expect(callBody.contents[0].parts[0].text).toContain("What next?");
  });

  test("limits session history to last 6 messages", async () => {
    mockResponse("Response.");
    const longHistory = Array.from({ length: 10 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `Message ${i}`,
    }));
    await generateAssistantResponse("New message.", MOCK_CONTEXT, longHistory);
    const callBody = axios.post.mock.calls[0][1];
    const promptText = callBody.contents[0].parts[0].text;
    // Only last 6 messages included 
    expect(promptText).not.toContain("Message 0");
    expect(promptText).toContain("Message 4");
  });

  test("works with empty session history", async () => {
    mockResponse("First response.");
    const result = await generateAssistantResponse("First question.", MOCK_CONTEXT, []);
    expect(result).toBe("First response.");
  });

  test("throws when API returns empty content", async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        choices: [{ message: { content: text } }],
      },
    });
    await expect(
      generateAssistantResponse("Question?", MOCK_CONTEXT, [])
    ).rejects.toThrow("Empty response from GenAI API");
  });

  test("throws when GEMINI_API_KEY is not set", async () => {
    const orig = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    await expect(
      generateAssistantResponse("Question?", MOCK_CONTEXT, [])
    ).rejects.toThrow("GROQ_API_KEY is not configured");
    process.env.GEMINI_API_KEY = orig;
  });

  test("throws when API key is missing", async () => {
    const orig = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    await expect(generateAssistantResponse("Question?", MOCK_CONTEXT, [])).rejects.toThrow("ANTHROPIC_API_KEY is not configured");
    process.env.ANTHROPIC_API_KEY = orig;
  });

  test("uses 15 second timeout", async () => {
    mockResponse("Response.");
    await generateAssistantResponse("Question?", MOCK_CONTEXT, []);
    expect(axios.post.mock.calls[0][2].timeout).toBe(15000);
  });

  test("calls Gemini API with correct endpoint", async () => {
    mockResponse("Response.");
    await generateAssistantResponse("Question?", MOCK_CONTEXT, []);
    expect(axios.post.mock.calls[0][0]).toContain("api.groq.com");
    expect(axios.post.mock.calls[0][1].messages).toBeDefined();
  });
});
