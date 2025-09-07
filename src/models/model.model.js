const mongoose = require("mongoose");

const MovieSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Movie title is required"],
      trim: true,
      minlength: [2, "Title must be at least 2 characters"],
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Movie description is required"],
      trim: true,
      maxlength: [1000, "Description too long"],
    },
    duration: {
      type: Number,
      required: [true, "Movie duration is required"],
      min: [1, "Duration must be at least 1 minute"],
      max: [500, "Duration seems too long"],
    },
    genres: {
      type: [String],
      required: true,
      validate: {
        validator: (arr) => arr.length > 0,
        message: "At least one genre is required",
      },
    },
    posterUrl: {
      type: String,
      required: [true, "Poster URL is required"],
      trim: true,
      validate: {
        validator: (url) =>
          /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)$/i.test(url),
        message: "Invalid poster URL format",
      },
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster searches by title & genre
MovieSchema.index({ title: 1, genres: 1 });

module.exports = mongoose.model("Movie", MovieSchema);
