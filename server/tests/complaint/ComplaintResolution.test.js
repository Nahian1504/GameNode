jest.mock("axios");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const axios = require("axios");
const { generateComplaintResolution } = require("../utils/genAIService");

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  await mongoose.connect(process.env.MONGODB_URI_TEST || "mongodb://localhost:27017/gamenode_test");
  process.env.GEMINI_API_KEY = "test-key-placeholder";
});
afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
beforeEach(() => { jest.clearAllMocks(); });

const mockGenAIResponse = (text) => {
  axios.post.mockResolvedValueOnce({
    data: {
      candidates: [
        {
          content: {
            parts: [{ text }],
          },
        },
      ],
    },
  });
};

describe("GenAI complaint resolution service Test", () => {

  test("returns AI resolution text for Technical Issue", async () => {
    mockGenAIResponse("Please try clearing your browser cache and reloading the dashboard. If the issue persists, try disconnecting and reconnecting your Steam account.");
    const result = await generateComplaintResolution("Technical Issue", "Dashboard is not loading my Steam games.");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(10);
  });

  test("calls Gemini API with correct endpoint and API key", async () => {
    mockGenAIResponse("Here is a resolution for your issue.");
    await generateComplaintResolution("AI Problem", "The AI assistant is not working.");
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining("generativelanguage.googleapis.com"),
      expect.objectContaining({
        contents: expect.any(Array),
        generationConfig: expect.any(Object),
      }),
      expect.objectContaining({
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      })
    );
  });

  test("includes category and description in the prompt", async () => {
    mockGenAIResponse("Resolution text here.");
    await generateComplaintResolution("Inappropriate Content", "Someone is posting offensive content.");
    const callArgs = axios.post.mock.calls[0][1];
    expect(callArgs.messages[0].content).toContain("Inappropriate Content");
    expect(callArgs.messages[0].content).toContain("Someone is posting offensive content.");
  });

  test("throws error when API returns empty content", async () => {
    axios.post.mockResolvedValueOnce({ data: { content: [] } });
    await expect(generateComplaintResolution("Other", "Valid description here.")).rejects.toThrow("Empty response from GenAI API");
  });

  test("throws error when API call fails with network error", async () => {
    axios.post.mockRejectedValueOnce(new Error("Network error"));
    await expect(generateComplaintResolution("Other", "Valid description here.")).rejects.toThrow();
  });

  test("throws when GEMINI_API_KEY is not set", async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    await expect(
      generateComplaintResolution("Other", "Valid description here.")
    ).rejects.toThrow("GEMINI_API_KEY is not configured");
    process.env.GEMINI_API_KEY = originalKey;
  });

  test("trims whitespace from response text", async () => {
    mockGenAIResponse("   Resolution with whitespace.   ");
    const result = await generateComplaintResolution("Other", "Valid complaint description here.");
    expect(result).toBe("Resolution with whitespace.");
  });

  test("uses 15 second timeout for API call", async () => {
    mockGenAIResponse("Response text.");
    await generateComplaintResolution("Other", "Valid description.");
    const callConfig = axios.post.mock.calls[0][2];
    expect(callConfig.timeout).toBe(15000);
  });
});
