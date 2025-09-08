require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const healthRoutes = require("./routes/health.routes");
const errorHandler = require("./middleware/error.middleware");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");

const app = express();
app.use(bodyParser.json());
app.use(cookieParser());

// Middlewares
app.use(express.json());
app.use(cors());

// Database connection
connectDB();

// Routes
app.use("/api/health", healthRoutes);
app.use(`/${process.env.APP_VERSION}/auth`, require("./routes/auth.routes"));
app.use(`/${process.env.APP_VERSION}/api`, require("./routes/theater.routes"));

// Error Handler (last middleware)
app.use(errorHandler);

app.listen(process.env.PORT, () => {
  console.log(`🚀 Server running on http://localhost:${process.env.PORT}`);
});

module.exports = app;
