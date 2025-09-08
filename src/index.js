require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const healthRoutes = require("./routes/health.routes");
const errorHandler = require("./middleware/error.middleware");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const { setupHoldCleanup } = require("./jobs/holds.cleanup");
const mongoose = require("mongoose");

const app = express();
app.use(bodyParser.json());
app.use(cookieParser());

// Middlewares
app.use(express.json());
app.use(cors());

// Database connection
connectDB();
setupHoldCleanup();

// Drop legacy unique index on bookings (show_1_seats_1) if present
mongoose.connection.once("open", async () => {
  try {
    const has = await mongoose.connection.db
      .collection("bookings")
      .indexExists("show_1_seats_1");
    if (has) {
      await mongoose.connection.db.collection("bookings").dropIndex("show_1_seats_1");
      console.log("Dropped legacy index show_1_seats_1 on bookings");
    }
  } catch (e) {
    console.warn("Index cleanup warning:", e.message);
  }
});

const app_version = process.env.APP_VERSION;

// Routes
app.use("/api/health", healthRoutes);
app.use(`/${app_version}/auth`, require("./routes/auth.routes"));
app.use(`/${app_version}/api`, require("./routes/theater.routes"));
app.use(`/${app_version}/api`, require("./routes/screen.routes"));
app.use(`/${app_version}/api`, require("./routes/movie.routes"));
app.use(`/${app_version}/api`, require("./routes/show.routes"));
app.use(`/${app_version}/api`, require("./routes/booking.routes"));

// Error Handler (last middleware)
app.use(errorHandler);

app.listen(process.env.PORT, () => {
  console.log(`🚀 Server running on http://localhost:${process.env.PORT}`);
});

module.exports = app;
