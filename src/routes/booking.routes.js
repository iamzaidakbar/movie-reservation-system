const express = require("express");
const authenticate = require("../middleware/authenticate");
const { holdSeats, confirmBooking } = require("../controllers/booking.controller");

const router = express.Router();

router.post("/bookings/hold", authenticate, holdSeats);
router.post("/bookings/confirm", authenticate, confirmBooking);

module.exports = router;


