const rateLimit = require("express-rate-limit");

const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  limit: parseInt(process.env.RATE_LIMIT_MAX) || 100, 
  standardHeaders: "draft-7", 
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});
 
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 10, 
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please wait 15 minutes.",
  },
  skipSuccessfulRequests: true,
});
<<<<<<< HEAD
=======
 
>>>>>>> 12f9879e32170c9ae83809ec489d583cf9670908

const steamLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: parseInt(process.env.STEAM_RATE_LIMIT_MAX) || 30, 
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many Steam API requests. Please wait before trying again.",
  },
});

<<<<<<< HEAD
=======

>>>>>>> 12f9879e32170c9ae83809ec489d583cf9670908
const dashboardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: parseInt(process.env.DASHBOARD_RATE_LIMIT_MAX) || 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many dashboard requests. Please wait before refreshing." },
});
 
<<<<<<< HEAD

const leaderboardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: parseInt(process.env.LEADERBOARD_RATE_LIMIT_MAX) || 25,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many leaderboard requests. Please wait." },
});
 
module.exports = { globalLimiter, authLimiter, steamLimiter, dashboardLimiter, leaderboardLimiter };
=======
 
module.exports = { globalLimiter, authLimiter, steamLimiter, dashboardLimiter };
>>>>>>> 12f9879e32170c9ae83809ec489d583cf9670908
