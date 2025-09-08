const mongoose = require("mongoose");
const { parseISO, isValid, set, isBefore, addHours, startOfDay } = require("date-fns");
const Show = require("../models/show.model");
const Screen = require("../models/screen.model");
const Seat = require("../models/seat.model");
const Movie = require("../models/movie.model");

// Helper: map timeSlot to hour ranges
const slotToRange = (slot) => {
  // morning: 06:00-12:00, afternoon: 12:00-17:00, evening: 17:00-24:00
  const map = {
    morning: { start: 6, end: 12 },
    afternoon: { start: 12, end: 17 },
    evening: { start: 17, end: 24 },
  };
  return map[slot];
};

// GET /shows/schedule?theaterId=...&movieId=...&date=YYYY-MM-DD&timeSlot=morning|afternoon|evening
// Auto-selects a screen with the most available seats for the requested slot/date
const getShowSuggestion = async (req, res) => {
  try {
    const { theaterId, movieId, date, timeSlot } = req.query;
    if (!theaterId || !movieId || !date || !timeSlot) {
      return res
        .status(400)
        .json({ message: "theaterId, movieId, date, timeSlot are required" });
    }

    const range = slotToRange(timeSlot);
    if (!range) {
      return res.status(400).json({ message: "Invalid timeSlot" });
    }

    const day = parseISO(date);
    if (!isValid(day)) {
      return res.status(400).json({ message: "Invalid date" });
    }
    const start = set(startOfDay(day), { hours: range.start, minutes: 0, seconds: 0, milliseconds: 0 });
    const end = set(startOfDay(day), { hours: range.end, minutes: 0, seconds: 0, milliseconds: 0 });

    // find screens for theater
    const screens = await Screen.find({ theaterId }).select("_id name rows cols");
    if (screens.length === 0) {
      return res.status(404).json({ message: "No screens for theater" });
    }
    const screenIds = screens.map((s) => s._id);

    // shows for movie on those screens within time range
    const shows = await Show.find({
      movieId: movieId,
      screenId: { $in: screenIds },
      startTime: { $gte: start, $lt: end },
    })
      .populate({ path: "screenId", select: "name theaterId rows cols" })
      .select("_id startTime endTime price screenId");

    if (shows.length === 0) {
      return res.status(200).json({ message: "No shows in this slot", shows: [] });
    }

    // compute availability per show
    const withAvailability = await Promise.all(
      shows.map(async (show) => {
        const totalSeats = show.screenId.rows * show.screenId.cols;
        const bookedCount = await Seat.countDocuments({ show: show._id, status: { $in: ["held", "booked"] } });
        const available = totalSeats - bookedCount;
        return { show, available };
      })
    );

    // pick show with max availability
    withAvailability.sort((a, b) => b.available - a.available);
    const best = withAvailability[0];

    res.status(200).json({
      message: "Show suggestion computed",
      suggestion: {
        showId: best.show._id,
        screen: best.show.screenId,
        startTime: best.show.startTime,
        endTime: best.show.endTime,
        price: best.show.price,
        availableSeats: best.available,
      },
      shows: withAvailability.map((x) => ({
        showId: x.show._id,
        screen: x.show.screenId,
        startTime: x.show.startTime,
        endTime: x.show.endTime,
        price: x.show.price,
        availableSeats: x.available,
      })),
    });
  } catch (err) {
    console.error("getShowSuggestion error:", err);
    res.status(500).json({ message: "Failed to fetch shows", error: err.message });
  }
};

// GET /shows/:showId/seats -> returns seat grid with statuses
const getSeatAvailability = async (req, res) => {
  try {
    const { showId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(showId)) {
      return res.status(400).json({ message: "Invalid showId" });
    }

    const show = await Show.findById(showId).populate({ path: "screenId", select: "rows cols name" });
    if (!show) return res.status(404).json({ message: "Show not found" });

    const { rows, cols } = show.screenId;
    const seats = await Seat.find({ show: showId }).select("row col status seatNumber");
    const map = new Map();
    seats.forEach((s) => map.set(`${s.row}-${s.col}`, s.status));

    const grid = [];
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let r = 0; r < rows; r++) {
      const rowLabel = letters[r];
      const rowArr = [];
      for (let c = 1; c <= cols; c++) {
        const key = `${rowLabel}-${c}`;
        rowArr.push({ row: rowLabel, col: c, status: map.get(`${rowLabel}-${c}`) || "available" });
      }
      grid.push(rowArr);
    }

    res.status(200).json({
      message: "Seat availability fetched",
      screen: { name: show.screenId.name, rows, cols },
      grid,
    });
  } catch (err) {
    console.error("getSeatAvailability error:", err);
    res.status(500).json({ message: "Failed to fetch seats", error: err.message });
  }
};

module.exports = { getShowSuggestion, getSeatAvailability };

// POST /shows/create (admin only)
const createShow = async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    const { movieId, screenId, startTime, endTime, price } = req.body;

    if (!mongoose.Types.ObjectId.isValid(movieId) || !mongoose.Types.ObjectId.isValid(screenId)) {
      return res.status(400).json({ message: "Invalid movie or screen id" });
    }

    const [movieDoc, screenDoc] = await Promise.all([
      Movie.findById(movieId).select("_id title"),
      Screen.findById(screenId).select("_id name"),
    ]);
    if (!movieDoc) return res.status(404).json({ message: "Movie not found" });
    if (!screenDoc) return res.status(404).json({ message: "Screen not found" });

    // Check for duplicate show on the same screen
    const existing = await Show.findOne({ screenId, startTime, endTime });
    if (existing) {
      return res.status(400).json({ message: "Show already exists on this screen" });
    }

    const st = parseISO(startTime);
    const et = parseISO(endTime);
    if (!isValid(st) || !isValid(et) || !isBefore(st, et)) {
      return res.status(400).json({ message: "Invalid start/end time" });
    }

    const show = await Show.create({ movieId, screenId, startTime: st, endTime: et, price });
    res.status(201).json({ message: "Show created", show });
  } catch (err) {
    console.error("createShow error:", err);
    res.status(500).json({ message: "Failed to create show", error: err.message });
  }
};

module.exports.createShow = createShow;


