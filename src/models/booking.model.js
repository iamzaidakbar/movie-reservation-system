const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
      index: true,
    },
    show: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Show",
      required: [true, "Show reference is required"],
      index: true,
    },
    seats: {
      type: [String],
      validate: {
        validator: (arr) => arr.length > 0,
        message: "At least one seat must be selected",
      },
    },
    seatDocs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Seat",
        required: true,
      },
    ],
    status: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "CANCELLED", "FAILED"],
      default: "PENDING",
      index: true,
    },
    totalAmount: {
      type: Number,
      required: [true, "Total amount is required"],
      min: [1, "Total amount must be at least 1"],
    },
    paymentStatus: {
      type: String,
      enum: ["NOT_INITIATED", "PAID", "FAILED", "REFUNDED"],
      default: "NOT_INITIATED",
      index: true,
    },
    holdExpiresAt: {
      type: Date,
      default: null,
      index: true, // helps auto-expire pending bookings
    },
  },
  {
    timestamps: true,
  }
);

// Compound index: ensure same seats in the same show can’t be booked twice
BookingSchema.index({ show: 1, seats: 1 }, { unique: true });

// Expire bookings automatically if hold time passes (MongoDB TTL)
BookingSchema.index({ holdExpiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Booking", BookingSchema);
