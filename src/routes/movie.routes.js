const express = require("express");
const authenticate = require("../middleware/authenticate");
const { listCurrentMovies, createMovie } = require("../controllers/movie.controller");

const router = express.Router();

router.get("/movies/current", listCurrentMovies);
router.post("/movies/create", authenticate, createMovie);

module.exports = router;


