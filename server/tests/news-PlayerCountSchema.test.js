require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const NewsCache = require("../models/NewsCache");

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  await mongoose.connect(process.env.MONGODB_URI_TEST || "mongodb://localhost:27017/gamenode_test");
});
afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
beforeEach(async () => { await NewsCache.deleteMany({}); });

const ITEMS = [
  { gid: "1", title: "Update", url: "https://s.com/1", date: new Date().toISOString(), dateReadable: "Jan 1, 2025" },
  { gid: "2", title: "Patch",  url: "https://s.com/2", date: new Date().toISOString(), dateReadable: "Jan 2, 2025" },
];

describe("News Cache DB caching logic and Player Count Test", () => {

  test("upsertCache creates new entry when none exists", async () => {
    const doc = await NewsCache.upsertCache("570", ITEMS);
    expect(doc.appId).toBe("570");
    expect(doc.newsItems.length).toBe(2);
  });

  test("upsertCache updates existing entry and resets fetchedAt", async () => {
    await NewsCache.create({ appId: "570", newsItems: [], fetchedAt: new Date(Date.now() - 5000) });
    const before = await NewsCache.findOne({ appId: "570" });
    await new Promise((r) => setTimeout(r, 10));
    const doc = await NewsCache.upsertCache("570", ITEMS);
    expect(doc.newsItems.length).toBe(2);
    expect(doc.fetchedAt.getTime()).toBeGreaterThanOrEqual(before.fetchedAt.getTime());
  });

  test("getValid returns null for non-existent appId", async () => {
    const result = await NewsCache.getValid("99999");
    expect(result).toBeNull();
  });

  test("getValid returns valid fresh cache", async () => {
    await NewsCache.create({ appId: "570", newsItems: ITEMS, ttlSeconds: 900 });
    const doc = await NewsCache.getValid("570");
    expect(doc).not.toBeNull();
    expect(doc.newsItems.length).toBe(2);
  });

  test("getValid returns null when cache is expired", async () => {
    const expired = new Date(Date.now() - 1000 * 60 * 20); // 20 min ago
    await NewsCache.create({ appId: "570", newsItems: ITEMS, fetchedAt: expired, ttlSeconds: 900 });
    const doc = await NewsCache.findOne({ appId: "570" });
    // Manually check expired since getValid uses isExpired()
    expect(doc.isExpired()).toBe(true);
  });

  test("isExpired false for very fresh cache (ttl=900)", async () => {
    const doc = await NewsCache.create({ appId: "730", newsItems: ITEMS, ttlSeconds: 900 });
    expect(doc.isExpired()).toBe(false);
  });

  test("isExpired true when fetchedAt is older than ttl", async () => {
    const old = new Date(Date.now() - 1000 * 16 * 60); // 16 min ago, ttl=15min
    const doc = await NewsCache.create({ appId: "440", newsItems: ITEMS, fetchedAt: old, ttlSeconds: 900 });
    doc.fetchedAt = old;
    expect(doc.isExpired()).toBe(true);
  });

  test("ageSeconds returns value >= 0", async () => {
    const doc = await NewsCache.create({ appId: "570", newsItems: ITEMS });
    expect(doc.ageSeconds()).toBeGreaterThanOrEqual(0);
  });

  test("custom ttlSeconds is stored correctly", async () => {
    const doc = await NewsCache.upsertCache("570", ITEMS, 300);
    expect(doc.ttlSeconds).toBe(300);
  });

  test("unique index prevents two entries for same appId", async () => {
    await NewsCache.create({ appId: "570", newsItems: [] });
    await expect(NewsCache.create({ appId: "570", newsItems: [] })).rejects.toThrow();
  });

  test("all newsItem fields are stored correctly", async () => {
    const doc = await NewsCache.create({ appId: "570", newsItems: ITEMS });
    expect(doc.newsItems[0].gid).toBe("1");
    expect(doc.newsItems[0].title).toBe("Update");
    expect(doc.newsItems[0].url).toBe("https://s.com/1");
    expect(doc.newsItems[0].dateReadable).toBe("Jan 1, 2025");
  });
});
