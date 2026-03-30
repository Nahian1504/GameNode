require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Favorite = require("../models/Favorite");
const User = require("../models/User");

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  await mongoose.connect(process.env.MONGODB_URI_TEST || "mongodb://localhost:27017/gamenode_test");
});
afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
beforeEach(async () => { await Favorite.deleteMany({}); await User.deleteMany({}); });

const makeUser = async (n="1") => User.create({ username: `fu${n}`, email: `fav${n}@t.com`, passwordHash: "$2b$12$x" });

describe("Favorite Schema Test", () => {
  test("creates Favorite document with games array", async () => {
    const u = await makeUser("1");
    const doc = await Favorite.create({ userId: u._id, games: [{ appId: "570" }] });
    expect(doc.games.length).toBe(1);
  });
  test("addGame adds a new game", async () => {
    const u = await makeUser("2");
    const doc = new Favorite({ userId: u._id, games: [] });
    doc.addGame("570");
    await doc.save();
    expect(doc.hasGame("570")).toBe(true);
  });
  test("addGame throws on duplicate", async () => {
    const u = await makeUser("3");
    const doc = new Favorite({ userId: u._id, games: [{ appId: "570" }] });
    expect(() => doc.addGame("570")).toThrow(/already in favorites/i);
  });
  test("removeGame removes a game", async () => {
    const u = await makeUser("4");
    const doc = new Favorite({ userId: u._id, games: [{ appId: "570" }, { appId: "730" }] });
    doc.removeGame("570");
    await doc.save();
    expect(doc.hasGame("570")).toBe(false);
    expect(doc.hasGame("730")).toBe(true);
  });
  test("removeGame throws when game not found", async () => {
    const u = await makeUser("5");
    const doc = new Favorite({ userId: u._id, games: [] });
    expect(() => doc.removeGame("570")).toThrow(/not found/i);
  });
  test("hasGame returns false for missing game", async () => {
    const u = await makeUser("6");
    const doc = new Favorite({ userId: u._id, games: [{ appId: "730" }] });
    expect(doc.hasGame("570")).toBe(false);
  });
  test("unique index prevents two Favorite docs for same user", async () => {
    const u = await makeUser("7");
    await Favorite.create({ userId: u._id, games: [] });
    await expect(Favorite.create({ userId: u._id, games: [] })).rejects.toThrow();
  });
  test("addedAt is set automatically on addGame", async () => {
    const u = await makeUser("8");
    const doc = new Favorite({ userId: u._id, games: [] });
    doc.addGame("570");
    expect(doc.games[0].addedAt).toBeInstanceOf(Date);
  });
});
