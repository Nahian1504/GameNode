const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // Mongoose duplicate key error 
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || "field";
    message = "${field.charAt(0).toUpperCase() + field.slice(1)} already exists.";
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(". ");
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token.";
  }
  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired. Please log in again.";
  }

  // Cast error (invalid MongoDB ID)
  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid ID format.";
  }

  // Log error in development
  if (process.env.NODE_ENV === "development") {
    console.error("Error:", err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

// Catch-all for unhandled routes
const notFound = (req, res, next) => {
  const error = new Error("Route not found: ${req.originalUrl}");
  error.statusCode = 404;
  next(error);
};

module.exports = { errorHandler, notFound };
