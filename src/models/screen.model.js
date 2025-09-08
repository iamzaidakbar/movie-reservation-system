const mongoose = require("mongoose");

const ScreenSchema = new mongoose.Schema(
  {
    theaterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Theater",
      required: [true, "Theater reference is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Screen name is required"],
      trim: true,
      minlength: [1, "Screen name must have at least 1 character"],
      maxlength: [50, "Screen name cannot exceed 50 characters"],
    },
    rows: {
      type: Number,
      required: [true, "Number of rows is required"],
      min: [5, "Rows must be at least 5"], // realistic
      max: [30, "Too many rows for a single screen"],
    },
    cols: {
      type: Number,
      required: [true, "Number of columns is required"],
      min: [5, "Columns must be at least 5"], // realistic
      max: [30, "Too many columns for a single screen"],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index: unique screen name per theater
ScreenSchema.index({ theaterId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Screen", ScreenSchema);
