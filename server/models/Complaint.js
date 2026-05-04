const mongoose = require("mongoose");

const COMPLAINT_CATEGORIES = [
  "Technical Issue",
  "AI Problem",
  "Inappropriate Content",
  "Account Issue",
  "Other",
];

const COMPLAINT_STATUSES = ["pending", "resolved", "escalated"];

const complaintSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    category: {
      type: String,
      enum: COMPLAINT_CATEGORIES,
      required: true,
    },
    description: {
      type: String,
      required: true,
      minlength: [10, "Description must be at least 10 characters"],
      maxlength: [500, "Description must not exceed 500 characters"],
      trim: true,
    },
    // AI-generated resolution suggestion
    aiResponse: {
      type: String,
      default: null,
    },
    // pending = submitted, resolved = user accepted AI fix,
    // escalated = user still needs help
    status: {
      type: String,
      enum: COMPLAINT_STATUSES,
      default: "pending",
    },
  },
  { timestamps: true }
);


complaintSchema.index({ userId: 1 });
complaintSchema.index({ status: 1 });
complaintSchema.index({ createdAt: -1 });

// Get all complaints for a user sorted by newest first
complaintSchema.statics.getByUser = function (userId) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

// All escalated complaints 
complaintSchema.statics.getEscalated = function () {
  return this.find({ status: "escalated" }).sort({ createdAt: -1 });
};

// Transition status — only valid transitions allowed
complaintSchema.methods.resolve = function () {
  this.status = "resolved";
};
complaintSchema.methods.escalate = function () {
  this.status = "escalated";
};

module.exports = mongoose.model("Complaint", complaintSchema);
module.exports.COMPLAINT_CATEGORIES = COMPLAINT_CATEGORIES;
