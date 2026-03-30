require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const mongoose = require("mongoose");
const Achievement = require("../models/Achievement");
const NewsCache = require("../models/NewsCache");
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
  await Achievement.deleteMany({});
  await NewsCache.deleteMany({});
  await User.deleteMany({});
});

const createUser = async (n = "1") => User.create({ username: `chat8u${n}`, email: `c8${n}@test.com`, passwordHash: "$2b$12$x" });

const SAMPLE_ACHIEVEMENTS = [
  { apiName: "WIN_1", displayName: "First Win", achieved: true, unlockTime: 1700000000, globalPercent: 80 },
  { apiName: "WIN_10", displayName: "Ten Wins", achieved: true, unlockTime: 1699000000, globalPercent: 40 },
  { apiName: "WIN_100", displayName: "Hundred Wins", achieved: false, unlockTime: 0, globalPercent: 5  },
];

describe("Achievement schema Test", () => {

  test("creates Achievement document with all required fields", async () => {
    const user = await createUser("1");
    const doc  = await Achievement.create({ userId: user._id, appId: "570", achievements: SAMPLE_ACHIEVEMENTS });
    expect(doc.userId.toString()).toBe(user._id.toString());
    expect(doc.appId).toBe("570");
    expect(doc.achievements.length).toBe(3);
  });

  test("getSummary returns correct total, unlocked, locked, percent", async () => {
    const user = await createUser("2");
    const doc  = await Achievement.create({ userId: user._id, appId: "570", achievements: SAMPLE_ACHIEVEMENTS });
    const summary = doc.getSummary();
    expect(summary.total).toBe(3);
    expect(summary.unlocked).toBe(2);
    expect(summary.locked).toBe(1);
    expect(summary.percent).toBe(67);
  });

  test("getSummary returns 0% when no achievements unlocked", async () => {
    const user = await createUser("3");
    const doc  = await Achievement.create({
      userId: user._id, appId: "570",
      achievements: [{ apiName: "A1", achieved: false }, { apiName: "A2", achieved: false }],
    });
    const summary = doc.getSummary();
    expect(summary.percent).toBe(0);
    expect(summary.unlocked).toBe(0);
  });

  test("getSummary returns 100% when all achievements unlocked", async () => {
    const user = await createUser("4");
    const doc  = await Achievement.create({
      userId: user._id, appId: "570",
      achievements: [{ apiName: "A1", achieved: true, unlockTime: 1 }, { apiName: "A2", achieved: true, unlockTime: 2 }],
    });
    const summary = doc.getSummary();
    expect(summary.percent).toBe(100);
  });

  test("getNewUnlocks returns correct delta from snapshot", async () => {
    const user = await createUser("5");
    const doc  = await Achievement.create({
      userId: user._id, appId: "570",
      achievements: SAMPLE_ACHIEVEMENTS,
      unlockedCountSnapshot: 1, 
    });
    expect(doc.getNewUnlocks()).toBe(1);
  });

  test("getNewUnlocks returns 0 when no new unlocks", async () => {
    const user = await createUser("6");
    const doc  = await Achievement.create({
      userId: user._id, appId: "570",
      achievements: SAMPLE_ACHIEVEMENTS,
      unlockedCountSnapshot: 2,
    });
    expect(doc.getNewUnlocks()).toBe(0);
  });

  test("compound index prevents duplicate userId+appId", async () => {
    const user = await createUser("7");
    await Achievement.create({ userId: user._id, appId: "570", achievements: [] });
    await expect(Achievement.create({ userId: user._id, appId: "570", achievements: [] })).rejects.toThrow();
  });

  test("updates achievement snapshot correctly on second save", async () => {
    const user = await createUser("8");
    const doc  = await Achievement.create({ userId: user._id, appId: "570", achievements: SAMPLE_ACHIEVEMENTS, unlockedCountSnapshot: 0 });
    doc.unlockedCountSnapshot = 2;
    await doc.save();
    const updated = await Achievement.findOne({ userId: user._id, appId: "570" });
    expect(updated.unlockedCountSnapshot).toBe(2);
  });
});

describe("NewsCache schema Test", () => {

  const MOCK_NEWS = [
    { gid: "1", title: "Update 7.35", url: "https://steam.com/1", date: new Date().toISOString(), dateReadable: "Nov 14, 2023" },
    { gid: "2", title: "New Hero",    url: "https://steam.com/2", date: new Date().toISOString(), dateReadable: "Nov 13, 2023" },
  ];

  test("creates NewsCache document with newsItems", async () => {
    const doc = await NewsCache.create({ appId: "570", newsItems: MOCK_NEWS });
    expect(doc.appId).toBe("570");
    expect(doc.newsItems.length).toBe(2);
  });

  test("isExpired returns false for fresh cache", async () => {
    const doc = await NewsCache.create({ appId: "570", newsItems: MOCK_NEWS, ttlSeconds: 900 });
    expect(doc.isExpired()).toBe(false);
  });

  test("isExpired returns true for old cache", async () => {
    const oldDate = new Date(Date.now() - 20 * 60 * 1000); 
    const doc = await NewsCache.create({ appId: "570", newsItems: MOCK_NEWS, fetchedAt: oldDate, ttlSeconds: 900 });
    expect(doc.isExpired()).toBe(true);
  });

  test("ageSeconds returns approximate age", async () => {
    const doc = await NewsCache.create({ appId: "570", newsItems: MOCK_NEWS });
    expect(doc.ageSeconds()).toBeLessThan(5);
  });

  test("getFresh returns null when cache is expired", async () => {
    const oldDate = new Date(Date.now() - 20 * 60 * 1000);
    await NewsCache.create({ appId: "570", newsItems: MOCK_NEWS, fetchedAt: oldDate, ttlSeconds: 900 });
    const result = await NewsCache.getFresh("570");
    expect(result).toBeNull();
  });

  test("getFresh returns document when cache is fresh", async () => {
    await NewsCache.create({ appId: "570", newsItems: MOCK_NEWS });
    const result = await NewsCache.getFresh("570");
    expect(result).not.toBeNull();
    expect(result.appId).toBe("570");
  });

  test("upsertCache creates new record if none exists", async () => {
    await NewsCache.upsertCache("730", MOCK_NEWS);
    const doc = await NewsCache.findOne({ appId: "730" });
    expect(doc).not.toBeNull();
    expect(doc.newsItems.length).toBe(2);
  });

  test("upsertCache updates existing record", async () => {
    await NewsCache.create({ appId: "730", newsItems: MOCK_NEWS });
    const newNews = [{ gid: "99", title: "New Article", url: "https://steam.com/99", date: new Date().toISOString(), dateReadable: "Today" }];
    await NewsCache.upsertCache("730", newNews);
    const doc = await NewsCache.findOne({ appId: "730" });
    expect(doc.newsItems.length).toBe(1);
    expect(doc.newsItems[0].gid).toBe("99");
  });
});
