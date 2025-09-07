const mongoose = require("mongoose");

const SeatSchema = new mongoose.Schema(
  {
    show: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Show",
      required: [true, "Show reference is required"],
      index: true,
    },
    seatNumber: {
      type: String,
      required: [true, "Seat number is required"],
      trim: true,
    },
    row: {
      type: String,
      required: [true, "Row is required"],
      trim: true,
      minlength: [1, "Row must have at least 1 character"],
      maxlength: [5, "Row too long"],
    },
    col: {
      type: Number,
      required: [true, "Column number is required"],
      min: [1, "Column must be at least 1"],
      max: [100, "Column number too large"],
    },
    type: {
      type: String,
      enum: ["regular", "premium"],
      default: "regular",
    },
    status: {
      type: String,
      enum: ["available", "held", "booked"],
      default: "available",
    },
    heldBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },
    bookedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure no duplicate seat in the same show
SeatSchema.index({ show: 1, row: 1, col: 1 }, { unique: true });

// Quick queries by status (useful for availability checks)
SeatSchema.index({ show: 1, status: 1 });

module.exports = mongoose.model("Seat", SeatSchema);
