const express = require("express");
const authenticate = require("../middleware/authenticate");
const { getShowSuggestion, getSeatAvailability, createShow } = require("../controllers/show.controller");

const router = express.Router();

router.get("/shows/schedule", getShowSuggestion);
router.get("/shows/:showId/seats", getSeatAvailability);
router.post("/shows/create", authenticate, createShow);

module.exports = router;


