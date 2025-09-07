const express = require("express");
const { getHealth } = require("../controllers/health.controller");

const router = express.Router();

// Health check route
router.get("/", getHealth);

module.exports = router;
