const mongoose = require("mongoose");
const { addMinutes, formatISO, format, formatDistanceToNowStrict } = require("date-fns");
const Show = require("../models/show.model");
const Seat = require("../models/seat.model");
const Booking = require("../models/booking.model");

// POST /bookings/hold
// body: { showId, seats: ["A-1","A-2"], holdMinutes }
const holdSeats = async (req, res) => {
  try {
    const user = req.user;

    if(!user || user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    const { showId, seats, holdMinutes = 10 } = req.body;
    if (!mongoose.Types.ObjectId.isValid(showId) || !Array.isArray(seats) || seats.length === 0) {
      return res.status(400).json({ message: "Invalid showId or seats" });
    }

    const show = await Show.findById(showId).select("price screenId").populate({ path: "screenId", select: "rows cols" });
    if (!show) return res.status(404).json({ message: "Show not found" });

    // validate seat labels inside bounds
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (const label of seats) {
      const [row, colStr] = label.split("-");
      const col = parseInt(colStr);
      if (!row || Number.isNaN(col)) {
        return res.status(400).json({ message: `Invalid seat label ${label}` });
      }
      const rowIndex = letters.indexOf(row);
      if (rowIndex < 0 || rowIndex >= show.screenId.rows || col < 1 || col > show.screenId.cols) {
        return res.status(400).json({ message: `Seat out of bounds ${label}` });
      }
    }

    // ensure seats not booked/held; if held but expired, free them lazily
    let existing = await Seat.find({ show: showId, seatNumber: { $in: seats }, status: { $in: ["held", "booked"] } });
    if (existing.length > 0) {
      // attempt lazy release for seats held by expired PENDING bookings
      const heldSeats = existing.filter((s) => s.status === "held" && s.heldBy);
      if (heldSeats.length > 0) {
        const bookingIds = [...new Set(heldSeats.map((s) => String(s.heldBy)))];
        const bookings = await Booking.find({ _id: { $in: bookingIds } }).select("_id status holdExpiresAt");
        const now = new Date();
        const expiredHeldIds = new Set(
          bookings
            .filter((b) => b.status === "PENDING" && b.holdExpiresAt && b.holdExpiresAt < now)
            .map((b) => String(b._id))
        );
        const seatsToRelease = heldSeats.filter((s) => expiredHeldIds.has(String(s.heldBy))).map((s) => s._id);
        if (seatsToRelease.length > 0) {
          await Seat.updateMany(
            { _id: { $in: seatsToRelease } },
            { $set: { status: "available", heldBy: null } }
          );
          // refresh existing after release
          existing = await Seat.find({ show: showId, seatNumber: { $in: seats }, status: { $in: ["held", "booked"] } });
        }
      }

      if (existing.length > 0) {
        return res.status(409).json({ message: "Some seats are unavailable", seats: existing.map((s) => s.seatNumber) });
      }
    }

    const expiry = addMinutes(new Date(), holdMinutes);

    // create booking PENDING
    const totalAmountAtHold = seats.length * (show.price || 0);
    if (totalAmountAtHold < 1) {
      return res.status(400).json({ message: "Invalid show price or seats for total amount" });
    }
    const booking = await Booking.create({
      user: user._id,
      show: showId,
      seats,
      seatDocs: [],
      status: "PENDING",
      totalAmount: totalAmountAtHold,
      paymentStatus: "NOT_INITIATED",
      holdExpiresAt: expiry,
    });

    // mark seats as held and link to booking (atomic updates on existing seats)
    const seatDocs = [];
    try {
      for (const label of seats) {
        const [row, colStr] = label.split("-");
        const col = parseInt(colStr);

        // 1) Try to mark existing available seat as held
        let doc = await Seat.findOneAndUpdate(
          { show: showId, row, col, status: "available", heldBy: null },
          { $set: { status: "held", heldBy: booking._id } },
          { new: true }
        );

        // 2) If seat doc doesn't exist, create it as held (upsert)
        if (!doc) {
          doc = await Seat.findOneAndUpdate(
            { show: showId, row, col },
            {
              $setOnInsert: {
                show: showId,
                seatNumber: label,
                row,
                col,
                type: "regular",
              },
              $set: { status: "held", heldBy: booking._id },
            },
            { new: true, upsert: true }
          );
        }

        // 3) If still not held by this booking, it was taken concurrently
        if (!doc || String(doc.heldBy) !== String(booking._id) || doc.status !== "held") {
          throw new Error(`Seat ${label} unavailable`);
        }

        seatDocs.push(doc._id);
      }
    } catch (err) {
      // rollback booking + any seat status changes we just made
      await Seat.updateMany(
        { _id: { $in: seatDocs }, heldBy: booking._id, status: "held" },
        { $set: { status: "available", heldBy: null } }
      );
      await Booking.deleteOne({ _id: booking._id });
      return res.status(409).json({ message: "Seats just got taken", error: err.message });
    }

    booking.seatDocs = seatDocs;
    await booking.save();

    const now = new Date();
    res.status(201).json({
      message: "Seats held",
      bookingId: booking._id,
      holdMinutes,
      holdExpiresAt: formatISO(expiry),
      holdExpiresAtLocal: format(expiry, "yyyy-MM-dd HH:mm"),
      expiresIn: Math.max(0, Math.floor((expiry.getTime() - now.getTime()) / 1000)),
      expiresInHuman: formatDistanceToNowStrict(expiry, { addSuffix: true }),
    });
  } catch (err) {
    console.error("holdSeats error:", err);
    res.status(500).json({ message: "Failed to hold seats", error: err.message });
  }
};

// POST /bookings/confirm
// body: { bookingId }
const confirmBooking = async (req, res) => {
  try {
    const user = req.user;
    const { bookingId } = req.body;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (!mongoose.Types.ObjectId.isValid(bookingId)) return res.status(400).json({ message: "Invalid bookingId" });

    const booking = await Booking.findById(bookingId).populate("show");
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.user.toString() !== user._id.toString()) return res.status(403).json({ message: "Forbidden" });
    if (booking.status !== "PENDING") return res.status(400).json({ message: "Booking not in PENDING state" });
    if (booking.holdExpiresAt && booking.holdExpiresAt < new Date()) {
      return res.status(410).json({ message: "Hold expired",  });
    }

    // compute amount by seat count * show.price
    const seatCount = booking.seats.length;
    const show = await Show.findById(booking.show).select("price");
    const total = seatCount * (show.price || 0);

    // finalize seats -> booked
    await Seat.updateMany({ _id: { $in: booking.seatDocs } }, { $set: { status: "booked", bookedBy: booking._id } });
    booking.status = "CONFIRMED";
    booking.totalAmount = total;
    booking.paymentStatus = "PAID"; // mock immediate success
    booking.holdExpiresAt = null;
    await booking.save();

    res.status(200).json({ message: "Booking confirmed", bookingId: booking._id, totalAmount: total });
  } catch (err) {
    console.error("confirmBooking error:", err);
    res.status(500).json({ message: "Failed to confirm booking", error: err.message });
  }
};

module.exports = { holdSeats, confirmBooking };


