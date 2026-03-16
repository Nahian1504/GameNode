const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [20, "Username cannot exceed 20 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    passwordHash: {
      type: String,
      required: [true, "Password is required"],
      select: false,
    },

    // Steam integration 
    steamId: {
      type: String,
      default: null,
      sparse: true, 
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ steamId: 1 }, { sparse: true });

userSchema.methods.toSafeObject = function () {
  return {
    _id: this._id,
    username: this.username,
    email: this.email,
    steamId: this.steamId,
    role: this.role,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model("User", userSchema);
