const Theater = require("../models/theater.model");
const Show = require("../models/show.model");
const Movie = require("../models/movie.model");

// POST /movies/create (admin only)
const createMovie = async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    const { title, description, duration, genres, posterUrl } = req.body;

    const existing = await Movie.findOne({ title: title.trim() });
    if (existing) {
      return res.status(400).json({ message: "Movie title already exists" });
    }

    const movie = await Movie.create({ title: title.trim(), description, duration, genres, posterUrl });
    res.status(201).json({ message: "Movie created", movie });
  } catch (err) {
    console.error("createMovie error:", err);
    res.status(500).json({ message: "Failed to create movie", error: err.message });
  }
};

// GET /movies/current?city=...&theaterId=...
// Returns distinct movies that have future shows in the specified scope
const listCurrentMovies = async (req, res) => {
  try {
    const { city, theaterId } = req.query;

    let theaterFilter = {};
    if (theaterId) {
      theaterFilter._id = theaterId;
    } else if (city) {
      theaterFilter.city = { $regex: new RegExp(`^${city.trim()}$`, "i") };
    }

    let theaterIds = [];
    if (Object.keys(theaterFilter).length > 0) {
      const theaters = await Theater.find(theaterFilter).select("_id");
      theaterIds = theaters.map((t) => t._id);
      if (theaterIds.length === 0) {
        return res.status(200).json({ message: "No movies found.", movies: [] });
      }
    }

    const now = new Date();
    const match = { startTime: { $gte: now } };
    if (theaterIds.length > 0) {
      // join via screens in aggregation, but simpler: find shows for screens of those theaters via $lookup isn't here.
      // We instead query shows and populate screen to filter theater.
      const shows = await Show.find(match)
        .populate({ path: "screenId", select: "theaterId", model: "Screen" })
        .select("movieId screenId");

      const movieIds = Array.from(
        new Set(
          shows
            .filter((s) => !theaterIds.length || theaterIds.some((id) => id.equals(s.screenId?.theaterId)))
            .map((s) => String(s.movieId))
        )
      );

      if (movieIds.length === 0) {
        return res.status(200).json({ message: "No movies found.", movies: [] });
      }

      const movies = await Movie.find({ _id: { $in: movieIds } }).select(
        "title posterUrl genres duration description"
      );
      return res.status(200).json({ message: "Movies retrieved.", movies });
    }

    // Fallback: all future shows
    const futureShows = await Show.find(match).select("movieId");
    const movieIds = Array.from(new Set(futureShows.map((s) => String(s.movieId))));
    if (movieIds.length === 0) {
      return res.status(200).json({ message: "No movies found.", movies: [] });
    }
    const movies = await Movie.find({ _id: { $in: movieIds } }).select(
      "title posterUrl genres duration description"
    );
    return res.status(200).json({ message: "Movies retrieved.", movies });
  } catch (err) {
    console.error("listCurrentMovies error:", err);
    res.status(500).json({ message: "Failed to fetch movies.", error: err.message });
  }
};

module.exports = { listCurrentMovies, createMovie };


