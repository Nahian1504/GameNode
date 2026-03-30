require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const mongoose = require("mongoose");
const { UserGame } = require("../models/Game");
const User = require("../models/User");

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  await mongoose.connect(process.env.MONGODB_URI_TEST || "mongodb://localhost:27017/gamenode_test");
});
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
beforeEach(async () => {
  await UserGame.deleteMany({});
  await User.deleteMany({});
});

// Helper: A test user
const createUser = async (suffix = "1") => {
  const user = await User.create({
    username: `chatuser${suffix}`,
    email: `chathurya${suffix}@test.com`,
    passwordHash: "$2b$12$fakehash",
  });
  return user;
};

describe("UserGame schema Test", () => {

  test("UserGame stores lastPlayedAt field correctly", async () => {
    const user = await createUser("1");
    const date = new Date("2025-01-15");
    const doc = await UserGame.create({
      userId: user._id, appId: "570", name: "Dota 2",
      playtimeForever: 1200, lastPlayedAt: date,
    });
    expect(doc.lastPlayedAt).toEqual(date);
  });

  test("UserGame lastPlayedAt defaults to null", async () => {
    const user = await createUser("2");
    const doc  = await UserGame.create({
      userId: user._id, appId: "730", name: "CS2", playtimeForever: 600,
    });
    expect(doc.lastPlayedAt).toBeNull();
  });

  test("getTotalPlaytimeForUser returns correct total in hours", async () => {
    const user = await createUser("3");
    await UserGame.create({ userId: user._id, appId: "570", name: "Dota 2",  playtimeForever: 1200 });
    await UserGame.create({ userId: user._id, appId: "730", name: "CS2", playtimeForever: 600 });
    await UserGame.create({ userId: user._id, appId: "440", name: "TF2", playtimeForever: 0 });

    const total = await UserGame.getTotalPlaytimeForUser(user._id);
    expect(total).toBe(30);
  });

  test("getTotalPlaytimeForUser returns 0 when user has no games", async () => {
    const user = await createUser("4");
    const total = await UserGame.getTotalPlaytimeForUser(user._id);
    expect(total).toBe(0);
  });

  test("getTotalPlaytimeForUser rounds to nearest hour", async () => {
    const user = await createUser("5");
    await UserGame.create({ userId: user._id, appId: "999", name: "TestGame", playtimeForever: 90 });
    const total = await UserGame.getTotalPlaytimeForUser(user._id);
    expect(total).toBe(2);
  });

  test("getTotalPlaytimeForUser only sums games for the given user", async () => {
    const user1 = await createUser("6");
    const user2 = await createUser("7");
    await UserGame.create({ userId: user1._id, appId: "570", name: "Dota 2", playtimeForever: 1200 });
    await UserGame.create({ userId: user2._id, appId: "730", name: "CS2", playtimeForever: 9999 });

    const total1 = await UserGame.getTotalPlaytimeForUser(user1._id);
    expect(total1).toBe(20); 
  });

  test("UserGame compound index prevents duplicate userId+appId entries", async () => {
    const user = await createUser("8");
    await UserGame.create({ userId: user._id, appId: "570", name: "Dota 2", playtimeForever: 100 });

    await expect(
      UserGame.create({ userId: user._id, appId: "570", name: "Dota 2 Duplicate", playtimeForever: 200 })
    ).rejects.toThrow();
  });

  test("bulkWrite upsert updates playtime correctly", async () => {
    const user = await createUser("9");
    const ops  = [{
      updateOne: {
        filter: { userId: user._id, appId: "570" },
        update: { $set: { name: "Dota 2", playtimeForever: 1200, lastSynced: new Date() } },
        upsert: true,
      },
    }];
    await UserGame.bulkWrite(ops);

    const doc = await UserGame.findOne({ userId: user._id, appId: "570" });
    expect(doc.playtimeForever).toBe(1200);

    const ops2 = [{
      updateOne: {
        filter: { userId: user._id, appId: "570" },
        update: { $set: { playtimeForever: 1500, lastSynced: new Date() } },
        upsert: true,
      },
    }];
    await UserGame.bulkWrite(ops2);

    const updated = await UserGame.findOne({ userId: user._id, appId: "570" });
    expect(updated.playtimeForever).toBe(1500);
  });
});
