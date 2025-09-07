const express = require("express");
const cors = require("cors");
const healthRoutes = require("./routes/health.routes");
const errorHandler = require("./middleware/error.middleware");
const connectDB = require("./config/db");

require("dotenv").config();
const app = express();

// Middlewares
app.use(express.json());
app.use(cors());

// Database connection
connectDB();
// Routes
app.use("/api/health", healthRoutes);

// Error Handler (last middleware)
app.use(errorHandler);

app.listen(process.env.PORT, () => {
  console.log(`🚀 Server running on http://localhost:${process.env.PORT}`);
});

module.exports = app;
