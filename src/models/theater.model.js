const mongoose = require("mongoose");

const TheaterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Theater name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
      maxlength: [50, "City name too long"],
      index: true, // helps filter theaters by city quickly
    },
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
      maxlength: [200, "Address too long"],
    },
    totalScreens: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Index for better search performance
TheaterSchema.index({ name: 1, city: 1 });

module.exports = mongoose.model("Theater", TheaterSchema);
