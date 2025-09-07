const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: [true, "Booking reference is required"],
      index: true,
    },
    provider: {
      type: String,
      required: [true, "Payment provider is required"],
      trim: true,
      minlength: [2, "Provider name must be at least 2 characters"],
      maxlength: [50, "Provider name too long"],
    },
    amount: {
      type: Number,
      required: [true, "Payment amount is required"],
      min: [1, "Amount must be at least 1"],
    },
    status: {
      type: String,
      enum: ["SUCCESS", "FAILED", "REFUNDED"],
      required: [true, "Payment status is required"],
      index: true,
    },
    rawResponse: {
      type: mongoose.Schema.Types.Mixed, // can store JSON, error logs, etc.
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent multiple successful payments for the same booking
PaymentSchema.index(
  { booking: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "SUCCESS" } }
);

module.exports = mongoose.model("Payment", PaymentSchema);
