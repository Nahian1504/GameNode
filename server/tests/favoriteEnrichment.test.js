require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const { UserGame } = require("../models/Game");
const User = require("../models/User");
const { enrichFavorites } = require("../utils/favoritesEnrichment");

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  await mongoose.connect(process.env.MONGODB_URI_TEST || "mongodb://localhost:27017/gamenode_test");
});
afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
beforeEach(async () => { await UserGame.deleteMany({}); await User.deleteMany({}); });

const makeUser = async (n="1") => User.create({ username: `eu${n}`, email: `enr${n}@t.com`, passwordHash: "$2b$12$x" });

describe("Favorites Enrichment service Test", () => {
  test("returns empty array for empty input", async () => {
    const u = await makeUser("1");
    const result = await enrichFavorites(u._id, []);
    expect(result).toEqual([]);
  });
  test("enriches with name and playtime from UserGame", async () => {
    const u = await makeUser("2");
    await UserGame.create({ userId: u._id, appId: "570", name: "Dota 2", playtimeForever: 1200 });
    const result = await enrichFavorites(u._id, [{ appId: "570", addedAt: new Date() }]);
    expect(result[0].name).toBe("Dota 2");
    expect(result[0].playtimeHours).toBe(20);
  });
  test("returns null name and 0 playtime when game not in UserGame", async () => {
    const u = await makeUser("3");
    const result = await enrichFavorites(u._id, [{ appId: "9999", addedAt: new Date() }]);
    expect(result[0].name).toBeNull();
    expect(result[0].playtimeHours).toBe(0);
  });
  test("includes headerImageUrl for all games", async () => {
    const u = await makeUser("4");
    const result = await enrichFavorites(u._id, [{ appId: "570", addedAt: new Date() }]);
    expect(result[0].headerImageUrl).toContain("570");
    expect(result[0].headerImageUrl).toContain("header.jpg");
  });
  test("enriches multiple games correctly", async () => {
    const u = await makeUser("5");
    await UserGame.create({ userId: u._id, appId: "570", name: "Dota 2", playtimeForever: 600 });
    await UserGame.create({ userId: u._id, appId: "730", name: "CS2", playtimeForever: 300 });
    const result = await enrichFavorites(u._id, [{ appId: "570", addedAt: new Date() }, { appId: "730", addedAt: new Date() }]);
    expect(result.length).toBe(2);
    expect(result.find((r) => r.appId === "570").name).toBe("Dota 2");
    expect(result.find((r) => r.appId === "730").name).toBe("CS2");
  });
  test("only enriches with data from correct user", async () => {
    const u1 = await makeUser("6");
    const u2 = await makeUser("7");
    await UserGame.create({ userId: u2._id, appId: "570", name: "Dota 2", playtimeForever: 9999 });
    const result = await enrichFavorites(u1._id, [{ appId: "570", addedAt: new Date() }]);
    expect(result[0].name).toBeNull(); 
  });
  test("preserves addedAt from input", async () => {
    const u = await makeUser("8");
    const date = new Date("2025-01-01");
    const result = await enrichFavorites(u._id, [{ appId: "570", addedAt: date }]);
    expect(new Date(result[0].addedAt).toDateString()).toBe(date.toDateString());
  });
});
