require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Complaint = require("../models/Complaint");
const User = require("../models/User");

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  await mongoose.connect(process.env.MONGODB_URI_TEST || "mongodb://localhost:27017/gamenode_test");
});
afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
beforeEach(async () => { await Complaint.deleteMany({}); await User.deleteMany({}); });

const uid = () => new mongoose.Types.ObjectId();

describe("Complaint Schema Test", () => {

  test("creates complaint with all required fields", async () => {
    const userId = uid();
    const doc = await Complaint.create({ userId, category: "Technical Issue", description: "The dashboard is not loading my games correctly." });
    expect(doc.category).toBe("Technical Issue");
    expect(doc.status).toBe("pending");
    expect(doc.aiResponse).toBeNull();
    expect(doc.createdAt).toBeDefined();
  });

  test("rejects complaint with invalid category", async () => {
    await expect(Complaint.create({ userId: uid(), category: "Invalid Category", description: "Some valid description here." })).rejects.toThrow();
  });

  test("rejects complaint with description under 10 characters", async () => {
    await expect(Complaint.create({ userId: uid(), category: "Other", description: "Short" })).rejects.toThrow();
  });

  test("rejects complaint with description over 500 characters", async () => {
    await expect(Complaint.create({ userId: uid(), category: "Other", description: "A".repeat(501) })).rejects.toThrow();
  });

  test("rejects complaint with missing category", async () => {
    await expect(Complaint.create({ userId: uid(), description: "This is a valid description." })).rejects.toThrow();
  });

  test("rejects complaint with missing description", async () => {
    await expect(Complaint.create({ userId: uid(), category: "Other" })).rejects.toThrow();
  });

  test("resolve() method changes status to resolved", async () => {
    const doc = await Complaint.create({ userId: uid(), category: "AI Problem", description: "The AI is not responding to my questions." });
    doc.resolve();
    await doc.save();
    const updated = await Complaint.findById(doc._id);
    expect(updated.status).toBe("resolved");
  });

  test("escalate() method changes status to escalated", async () => {
    const doc = await Complaint.create({ userId: uid(), category: "AI Problem", description: "The AI is not responding to my questions." });
    doc.escalate();
    await doc.save();
    const updated = await Complaint.findById(doc._id);
    expect(updated.status).toBe("escalated");
  });

  test("getByUser returns complaints sorted by newest first", async () => {
    const userId = uid();
    await Complaint.create({ userId, category: "Other", description: "First complaint submitted here." });
    await new Promise((r) => setTimeout(r, 10));
    await Complaint.create({ userId, category: "Technical Issue", description: "Second complaint submitted here." });
    const results = await Complaint.getByUser(userId);
    expect(results[0].category).toBe("Technical Issue");
  });

  test("getByUser returns only complaints for the given user", async () => {
    const u1 = uid(); const u2 = uid();
    await Complaint.create({ userId: u1, category: "Other", description: "User one complaint here." });
    await Complaint.create({ userId: u2, category: "Other", description: "User two complaint here." });
    const results = await Complaint.getByUser(u1);
    expect(results.length).toBe(1);
  });

  test("stores aiResponse correctly when provided", async () => {
    const doc = await Complaint.create({ userId: uid(), category: "Other", description: "My issue is described here.", aiResponse: "Try restarting the application." });
    expect(doc.aiResponse).toBe("Try restarting the application.");
  });

  test("all valid complaint categories are accepted", async () => {
    const categories = ["Technical Issue", "AI Problem", "Inappropriate Content", "Account Issue", "Other"];
    for (const cat of categories) {
      const doc = await Complaint.create({ userId: uid(), category: cat, description: "Valid description for this test." });
      expect(doc.category).toBe(cat);
      await Complaint.deleteOne({ _id: doc._id });
    }
  });
});
