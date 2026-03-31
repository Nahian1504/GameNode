const mongoose = require("mongoose");

const newsItemSchema = new mongoose.Schema({
  gid: { type: String, required: true },
  title: { type: String, required: true },
  url: { type: String, required: true },
  author: { type: String, default: "Unknown" },
  feedName: { type: String, default: "" },
  date: { type: String, required: true },
  dateReadable: { type: String, default: "" },
}, { _id: false });

const newsCacheSchema = new mongoose.Schema(
  {
    appId: { type: String, required: true, unique: true },
    newsItems: [newsItemSchema],
    fetchedAt: { type: Date, default: Date.now },
    ttlSeconds: { type: Number, default: 900 },
  },
  { timestamps: true }
);

newsCacheSchema.index({ appId: 1 });

newsCacheSchema.methods.isExpired = function () {
  return (Date.now() - this.fetchedAt.getTime()) > this.ttlSeconds * 1000;
};

newsCacheSchema.methods.ageSeconds = function () {
  return Math.round((Date.now() - this.fetchedAt.getTime()) / 1000);
};

newsCacheSchema.statics.getValid = async function (appId) {
  const doc = await this.findOne({ appId });
  if (!doc || doc.isExpired()) return null;
  return doc;
};

newsCacheSchema.statics.upsertCache = async function (appId, newsItems, ttlSeconds = 900) {
  return this.findOneAndUpdate(
    { appId },
    { $set: { newsItems, fetchedAt: new Date(), ttlSeconds } },
    { upsert: true, new: true }
  );
};

module.exports = mongoose.model("NewsCache", newsCacheSchema);
