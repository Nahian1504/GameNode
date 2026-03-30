require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const steamRoutes = require("./routes/steamRoutes");
const achievementRoutes = require("./routes/achievementRoutes");
const newsRoutes = require("./routes/newsRoutes");
const favoritesRoutes = require("./routes/favoritesRoutes");
const leaderboardRoutes = require("./routes/leaderboardRoutes");
const { globalLimiter } = require("./middleware/rateLimiter");
const { errorHandler, notFound } = require("./middleware/errorHandler");

const app = express();

// Connect to MongoDB 
connectDB();

// Global Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Parse JSON request bodies
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Request logging in development
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Global rate limiter 
app.use(globalLimiter);

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "GameNode API is running",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Auth routes
app.use("/api/auth", authRoutes);

// Steam routes
app.use("/api/steam", steamRoutes);

// Achievements
app.use("/api/achievements", achievementRoutes);

// Game News
app.use("/api/news", newsRoutes);

// Favorites
app.use("/api/favorites", favoritesRoutes);

// Leaderboard
app.use("/api/leaderboard", leaderboardRoutes);

// Error Handling 
app.use(notFound);
app.use(errorHandler);

// Start Server
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`\n🎮 GameNode API running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health\n`);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err.message);
  server.close(() => process.exit(1));
});

module.exports = { app, server };
