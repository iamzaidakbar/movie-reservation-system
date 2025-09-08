const Booking = require("../models/booking.model");
const Seat = require("../models/seat.model");
const { isBefore } = require("date-fns");

// Runs periodically to release seats for expired or missing holds
async function releaseExpiredHoldsOnce() {
  const now = new Date();

  // 1) Release seats for bookings whose hold has expired but still exist
  const expiredBookings = await Booking.find({ status: "PENDING" })
    .select("_id seatDocs holdExpiresAt")
    .lean();
  const due = expiredBookings.filter((b) => b.holdExpiresAt && isBefore(new Date(b.holdExpiresAt), now));

  if (due.length > 0) {
    for (const b of due) {
      if (Array.isArray(b.seatDocs) && b.seatDocs.length > 0) {
        await Seat.updateMany(
          { _id: { $in: b.seatDocs }, status: "held", heldBy: b._id },
          { $set: { status: "available", heldBy: null } }
        );
      }
      // Mark booking failed; TTL (if configured) may remove later
      b.status = "FAILED";
      b.paymentStatus = "FAILED";
      await b.save();
    }
  }

  // 2) Release seats whose heldBy references a non-active booking (e.g., TTL removed it)
  const activePendingBookings = await Booking.find({ status: "PENDING" }).select("_id");
  const activePendingIds = new Set(activePendingBookings.map((b) => String(b._id)));

  const orphanedHeldSeats = await Seat.find({ status: "held", heldBy: { $ne: null } }).select("_id heldBy");
  const toRelease = orphanedHeldSeats
    .filter((s) => !activePendingIds.has(String(s.heldBy)))
    .map((s) => s._id);

  if (toRelease.length > 0) {
    await Seat.updateMany(
      { _id: { $in: toRelease } },
      { $set: { status: "available", heldBy: null } }
    );
  }
}

function setupHoldCleanup(intervalMs = 60 * 1000) {
  // initial delay to avoid running before app is fully ready
  setTimeout(() => {
    // run immediately once
    releaseExpiredHoldsOnce().catch(() => {});
    // schedule
    setInterval(() => {
      releaseExpiredHoldsOnce().catch(() => {});
    }, intervalMs);
  }, 10 * 1000);
}

module.exports = { setupHoldCleanup };


