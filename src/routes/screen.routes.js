const express = require("express");
const authenticate = require("../middleware/authenticate");
const {
  createScreen,
  getScreens,
  updateScreen,
} = require("../controllers/screen.controller");
const {
  validateCreateScreen,
  validateUpdateScreen,
} = require("../utils/validations/screen.validation");

const router = express.Router();

router.post("/screen/create", authenticate, validateCreateScreen, createScreen);
router.get("/screens/view", getScreens);
router.put("/screen/:id", authenticate, validateUpdateScreen, updateScreen);

// router.delete("/theater/:id", authMiddleware, deleteTheater);

module.exports = router;
