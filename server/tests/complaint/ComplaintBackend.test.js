jest.mock("../../utils/genAIService", () => ({
  generateComplaintResolution: jest.fn().mockResolvedValue("Try clearing your browser cache and reloading the page."),
  generateRecommendations: jest.fn(),
  generateAssistantResponse: jest.fn(),
}));

require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const request = require("supertest");
const mongoose  = require("mongoose");
const { app, server } = require("../../index");
const User = require("../../models/User");
const Complaint = require("../../models/Complaint");
const { generateComplaintResolution } = require("../../utils/genAIService");

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  await mongoose.connect(process.env.MONGODB_URI_TEST || "mongodb://localhost:27017/gamenode_test");
});
afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); server.close(); });
beforeEach(async () => { await User.deleteMany({}); await Complaint.deleteMany({}); jest.clearAllMocks(); });

const setup = async (suffix = "1") => {
  const res = await request(app).post("/api/auth/register").send({ username: `dhruv12${suffix}`, email: `dhruv12${suffix}@test.com`, password: "SecurePass1!" });
  return { token: res.body.token, userId: res.body.user._id };
};

describe("Complaint routes Backend Test", () => {

  test("POST /api/complaints — creates complaint and returns AI response", async () => {
    const { token } = await setup("a");
    const res = await request(app).post("/api/complaints").set("Authorization", `Bearer ${token}`)
      .send({ category: "Technical Issue", description: "The dashboard is not loading my Steam games at all." });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.complaint.aiResponse).toBe("Try clearing your browser cache and reloading the page.");
    expect(res.body.complaint.status).toBe("pending");
    expect(generateComplaintResolution).toHaveBeenCalledWith("Technical Issue", expect.any(String));
  });

  test("POST /api/complaints — saves complaint to DB", async () => {
    const { token, userId } = await setup("b");
    await request(app).post("/api/complaints").set("Authorization", `Bearer ${token}`)
      .send({ category: "Other", description: "I have an issue with the platform." });
    const saved = await Complaint.findOne({ userId });
    expect(saved).not.toBeNull();
    expect(saved.category).toBe("Other");
  });

  test("POST /api/complaints — still saves complaint when GenAI fails", async () => {
    generateComplaintResolution.mockRejectedValueOnce(new Error("GenAI unavailable"));
    const { token, userId } = await setup("c");
    const res = await request(app).post("/api/complaints").set("Authorization", `Bearer ${token}`)
      .send({ category: "AI Problem", description: "The AI assistant is not responding to anything." });
    expect(res.statusCode).toBe(201);
    expect(res.body.complaint.aiResponse).toBeTruthy(); 
    const saved = await Complaint.findOne({ userId });
    expect(saved).not.toBeNull();
  });

  test("GET /api/complaints/mine — returns user complaint history", async () => {
    const { token, userId } = await setup("d");
    await Complaint.create({ userId, category: "Other", description: "First complaint from this user." });
    await Complaint.create({ userId, category: "Technical Issue", description: "Second complaint from this user." });
    const res = await request(app).get("/api/complaints/mine").set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.complaints.length).toBe(2);
    expect(res.body.total).toBe(2);
  });

  test("GET /api/complaints/mine — returns empty array when no complaints", async () => {
    const { token } = await setup("e");
    const res = await request(app).get("/api/complaints/mine").set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.complaints).toEqual([]);
  });

  test("GET /api/complaints/mine — does not return other users complaints", async () => {
    const { userId: u1 } = await setup("f");
    const { token: t2 } = await setup("g");
    await Complaint.create({ userId: u1, category: "Other", description: "Complaint belonging to user one." });
    const res = await request(app).get("/api/complaints/mine").set("Authorization", `Bearer ${t2}`);
    expect(res.body.complaints.length).toBe(0);
  });

  test("PATCH /api/complaints/:id/status — updates to resolved", async () => {
    const { token, userId } = await setup("h");
    const complaint = await Complaint.create({ userId, category: "Other", description: "Issue description here." });
    const res = await request(app).patch(`/api/complaints/${complaint._id}/status`).set("Authorization", `Bearer ${token}`).send({ status: "resolved" });
    expect(res.statusCode).toBe(200);
    expect(res.body.complaint.status).toBe("resolved");
  });

  test("PATCH /api/complaints/:id/status — updates to escalated", async () => {
    const { token, userId } = await setup("i");
    const complaint = await Complaint.create({ userId, category: "Other", description: "Issue description here." });
    const res = await request(app).patch(`/api/complaints/${complaint._id}/status`).set("Authorization", `Bearer ${token}`).send({ status: "escalated" });
    expect(res.statusCode).toBe(200);
    expect(res.body.complaint.status).toBe("escalated");
  });

  test("PATCH /api/complaints/:id/status — 404 when complaint not found", async () => {
    const { token } = await setup("j");
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).patch(`/api/complaints/${fakeId}/status`).set("Authorization", `Bearer ${token}`).send({ status: "resolved" });
    expect(res.statusCode).toBe(404);
  });

  test("PATCH — user cannot update another user's complaint", async () => {
    const { userId: u1 } = await setup("k");
    const { token: t2 } = await setup("l");
    const complaint = await Complaint.create({ userId: u1, category: "Other", description: "Belongs to user one." });
    const res = await request(app).patch(`/api/complaints/${complaint._id}/status`).set("Authorization", `Bearer ${t2}`).send({ status: "resolved" });
    expect(res.statusCode).toBe(404); 
  });
});
