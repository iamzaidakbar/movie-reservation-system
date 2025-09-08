const Theater = require("../../models/theater.model");
const mongoose = require("mongoose");

const validateTheaterInput = async (req, res, next) => {
  if (req.body === undefined) {
    return res.status(400).json({ message: "Request body is missing." });
  }
  const { name, city, address, totalScreens } = req.body;
  const errors = {};

  // Required checks
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    errors.name = "Theater name is required and must be at least 2 characters.";
  }

  if (!city || typeof city !== "string" || city.trim().length < 2) {
    errors.city = "City is required and must be at least 2 characters.";
  }

  if (!address || typeof address !== "string" || address.trim().length < 5) {
    errors.address = "Address is required and must be at least 5 characters.";
  }

  if (
    totalScreens === undefined ||
    typeof totalScreens !== "number" ||
    totalScreens < 1
  ) {
    errors.totalScreens = "Total screens must be a positive number.";
  }

  // If any validation errors → return
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      message: "Validation failed",
      errors,
    });
  }

  // Check if theater already exists (same name + city)
  const existingTheater = await Theater.findOne({
    name: name.trim(),
    city: city.trim(),
  });
  if (existingTheater) {
    return res.status(400).json({
      message: "A theater with the same name already exists in this city.",
      errors: {
        name: "Theater name already exists in this city.",
        city: "City already has a theater with this name.",
      },
    });
  }
  // Attach validated data to request object
  req.theater = {
    name: name.trim(),
    city: city.trim(),
    address: address.trim(),
    totalScreens,
  };

  next();
};

// Middleware to validate theater ID in route params
const validateTheaterId = (req, res, next) => {
  const { id } = req.params;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      message: "Invalid theater ID.",
      errors: { id: "Please provide a valid MongoDB ObjectId." },
    });
  }

  next();
};
// Middleware to validate theater update input
const validateTheaterUpdateInput = (req, res, next) => {
  if (!req.body) {
    return res.status(400).json({ message: "Request body is missing." });
  }

  validateTheaterId(req, res, () => {}); // Validate ID first

  const { name, city, address, totalScreens } = req.body;
  const errors = {};

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters.";
    }
  }

  if (city !== undefined) {
    if (typeof city !== "string" || city.trim().length < 2) {
      errors.city = "City must be at least 2 characters.";
    }
  }

  if (address !== undefined) {
    if (typeof address !== "string" || address.trim().length < 5) {
      errors.address = "Address must be at least 5 characters.";
    }
  }

  if (totalScreens !== undefined) {
    if (typeof totalScreens !== "number" || totalScreens < 1) {
      errors.totalScreens = "Total screens must be a positive number.";
    }
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      message: "Validation failed.",
      errors,
    });
  }
  next();
};

module.exports = {
  validateTheaterInput,
  validateTheaterId,
  validateTheaterUpdateInput,
};
