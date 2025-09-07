// Global error handler
const errorHandler = (err, req, res, next) => {
  console.error("🔥 Error:", err.stack);

  res.status(err.statusCode || 500).json({
    status: "error",
    message: err.message || "Internal Server Error",
  });
};

module.exports = errorHandler;
