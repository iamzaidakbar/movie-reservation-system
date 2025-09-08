const express = require("express");
const authenticate = require("../middleware/authenticate");
const { createScreen } = require("../controllers/screen.controller");

const router = express.Router();

router.post("/screen/create", authenticate, createScreen);

// router.delete("/theater/:id", authMiddleware, deleteTheater);

module.exports = router;
