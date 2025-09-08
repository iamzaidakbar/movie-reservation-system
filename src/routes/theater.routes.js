const express = require("express");
const {
  getTheaters,
  createTheater,
  getTheaterById,
  updateTheater,
} = require("../controllers/theater.controller");
const authenticate = require("../middleware/authenticate");
const {
  validateTheaterInput,
  validateTheaterId,
  validateTheaterUpdateInput,
} = require("../utils/validations/theater.valiation");

const router = express.Router();

router.post(
  "/theater/create",
  authenticate,
  validateTheaterInput,
  createTheater
);

router.get("/theaters/view", getTheaters);
router.get("/theater/:id", authenticate, validateTheaterId, getTheaterById);
router.put(
  "/theater/:id",
  authenticate,
  validateTheaterUpdateInput,
  updateTheater
);
// router.delete("/theater/:id", authMiddleware, deleteTheater);

module.exports = router;
