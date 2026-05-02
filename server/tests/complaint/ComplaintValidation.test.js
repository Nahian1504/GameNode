jest.mock("../utils/genAIService", () => ({
  generateComplaintResolution: jest.fn().mockResolvedValue("Try clearing your browser cache and reloading the page."),
  generateRecommendations: jest.fn(),
  generateAssistantResponse: jest.fn(),
}));

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const request = require("supertest");
const mongoose = require("mongoose");
const { app, server } = require("../index");
const User = require("../models/User");
const Complaint = require("../models/Complaint");

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  await mongoose.connect(process.env.MONGODB_URI_TEST || "mongodb://localhost:27017/gamenode_test");
});
afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); server.close(); });
beforeEach(async () => { await User.deleteMany({}); await Complaint.deleteMany({}); jest.clearAllMocks(); });

const setup = async (suffix = "1") => {
  const res = await request(app).post("/api/auth/register").send({ username: `akshat12${suffix}`, email: `akshat12${suffix}@test.com`, password: "SecurePass1!" });
  return res.body.token;
};

describe("Complaint validation middleware Test", () => {

  test("rejects missing category with 400", async () => {
    const token = await setup("a");
    const res = await request(app).post("/api/complaints").set("Authorization", `Bearer ${token}`).send({ description: "This is a valid description." });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/category is required/i);
  });

  test("rejects invalid category value with 400", async () => {
    const token = await setup("b");
    const res = await request(app).post("/api/complaints").set("Authorization", `Bearer ${token}`).send({ category: "Random Category", description: "This is a valid description." });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/category must be one of/i);
  });

  test("rejects description under 10 characters with 400", async () => {
    const token = await setup("c");
    const res = await request(app).post("/api/complaints").set("Authorization", `Bearer ${token}`).send({ category: "Other", description: "Short" });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/10 characters/i);
  });

  test("rejects description over 500 characters with 400", async () => {
    const token = await setup("d");
    const res = await request(app).post("/api/complaints").set("Authorization", `Bearer ${token}`).send({ category: "Other", description: "A".repeat(501) });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/500 characters/i);
  });

  test("strips HTML tags from description before saving", async () => {
    const token = await setup("e");
    const res = await request(app).post("/api/complaints").set("Authorization", `Bearer ${token}`)
      .send({ category: "Other", description: "<script>alert('xss')</script>This is my real complaint." });
    expect(res.statusCode).toBe(201);
    expect(res.body.complaint.description).not.toContain("<script>");
  });

  test("rejects complaint without JWT with 401", async () => {
    const res = await request(app).post("/api/complaints").send({ category: "Other", description: "Valid description here." });
    expect(res.statusCode).toBe(401);
  });

  test("rejects status update with invalid status value with 400", async () => {
    const token = await setup("f");
    const complaint = await require("../models/Complaint").create({ userId: new mongoose.Types.ObjectId(), category: "Other", description: "Valid description for this test." });
    const res = await request(app).patch(`/api/complaints/${complaint._id}/status`).set("Authorization", `Bearer ${token}`).send({ status: "deleted" });
    expect(res.statusCode).toBe(400);
  });

  test("rejects status update with invalid MongoDB ID with 400", async () => {
    const token = await setup("g");
    const res = await request(app).patch("/api/complaints/notanid/status").set("Authorization", `Bearer ${token}`).send({ status: "resolved" });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/invalid complaint id/i);
  });

  test("accepts all valid complaint categories", async () => {
    const token = await setup("h");
    const cats = ["Technical Issue", "AI Problem", "Inappropriate Content", "Account Issue", "Other"];
    for (const cat of cats) {
      const res = await request(app).post("/api/complaints").set("Authorization", `Bearer ${token}`)
        .send({ category: cat, description: "Valid description for this complaint." });
      expect(res.statusCode).toBe(201);
    }
  });
});
