const mongoose = require("mongoose");

const validateCreateScreen = async (req, res, next) => {
  const { theaterId, name, rows, cols } = req.body;
  const errors = {};

  if (!theaterId || !mongoose.Types.ObjectId.isValid(theaterId)) {
    errors.theaterId = "Valid theater ID is required.";
  }

  if (!name || typeof name !== "string" || name.trim().length < 1) {
    errors.name = "Screen name is required and must be at least 1 character.";
  }

  if (rows === undefined || typeof rows !== "number" || rows < 5 || rows > 30) {
    errors.rows = "Rows must be a number between 5 and 30.";
  }

  if (cols === undefined || typeof cols !== "number" || cols < 5 || cols > 30) {
    errors.cols = "Columns must be a number between 5 and 30.";
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      message: "Validation failed",
      errors,
    });
  }

  next();
};

// Validate update screen
const validateUpdateScreen = (req, res, next) => {
  const { name, rows, cols } = req.body;
  const errors = {};

  if (
    name !== undefined &&
    (typeof name !== "string" || name.trim().length < 1)
  ) {
    errors.name = "Screen name must be at least 1 character.";
  }

  if (
    rows !== undefined &&
    (typeof rows !== "number" || rows < 5 || rows > 30)
  ) {
    errors.rows = "Rows must be a number between 5 and 30.";
  }

  if (
    cols !== undefined &&
    (typeof cols !== "number" || cols < 5 || cols > 30)
  ) {
    errors.cols = "Columns must be a number between 5 and 30.";
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ message: "Validation failed", errors });
  }

  next();
};

module.exports = { validateCreateScreen, validateUpdateScreen };
