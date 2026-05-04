const mongoose = require("mongoose");

const errorLogSchema = new mongoose.Schema({
  route: { type: String, required: true },
  method: { type: String, required: true, uppercase: true },
  statusCode: { type: Number, required: true },
  message: { type: String, required: true },
  stack: { type: String, default: null },
  ip: { type: String, default: null },
}, { timestamps: true });

errorLogSchema.index({ createdAt: -1 });
errorLogSchema.index({ statusCode: 1 });
errorLogSchema.index({ route: 1 });

errorLogSchema.statics.logError = async function ({ route, method, statusCode, message, stack, ip }) {
  try {
    await this.create({
      route,
      method,
      statusCode,
      message: message?.slice(0, 500) || "Unknown error",
      stack: process.env.NODE_ENV === "development" ? stack : null,
      ip: ip || null,
    });
  } catch {
    console.error("ErrorLog: failed to save error log entry");
  }
};

module.exports = mongoose.model("ErrorLog", errorLogSchema);
