const mongoose = require("mongoose");

const ShowSchema = new mongoose.Schema(
  {
    movieId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Movie",
      required: [true, "Movie reference is required"],
      index: true,
    },
    screenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Screen",
      required: [true, "Screen reference is required"],
      index: true,
    },
    startTime: {
      type: Date,
      required: [true, "Show start time is required"],
    },
    endTime: {
      type: Date,
      required: [true, "Show end time is required"],
      validate: {
        validator: function (val) {
          return !this.startTime || val > this.startTime;
        },
        message: "End time must be after start time",
      },
    },
    price: {
      type: Number,
      required: [true, "Ticket price is required"],
      min: [1, "Price must be at least 1"],
      max: [10000, "Price too high"],
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate show timings on the same screen
ShowSchema.index({ screenId: 1, startTime: 1, endTime: 1 }, { unique: true });

module.exports = mongoose.model("Show", ShowSchema);
