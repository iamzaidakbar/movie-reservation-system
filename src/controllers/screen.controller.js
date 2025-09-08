const Screen = require("../models/screen.model");
const Theater = require("../models/theater.model");

/**
 * Create Screen (admin only)
 * POST /screen/create
 */
const createScreen = async (req, res) => {
  try {
    const loggedinUser = req.user;
    // Check if logged-in user is admin
    if (loggedinUser.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    const { theaterId, name, rows, cols } = req.body;

    // Check if theater exists
    const theater = await Theater.findById(theaterId);
    if (!theater) {
      return res.status(404).json({
        message: "Theater not found.",
        errors: { theaterId: "No theater found with this ID." },
      });
    }

    // Check for duplicate screen in same theater
    const existing = await Screen.findOne({
      theaterId,
      name: name.trim(),
    });
    if (existing) {
      return res.status(400).json({
        message: "Screen with this name already exists in this theater.",
        errors: { name: "Duplicate screen name in this theater." },
      });
    }

    const screen = await Screen.create({
      theaterId,
      name: name.trim(),
      rows,
      cols,
    });

    res.status(201).json({
      message: "Screen created successfully.",
      screen,
    });
  } catch (err) {
    console.error("Create screen error:", err);
    res.status(500).json({
      message: "Failed to create screen.",
      error: err.message,
    });
  }
};

// ===== GET SCREENS =====
const getScreens = async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * limit;

  try {
    const { theaterId, name } = req.query;
    const filter = {};

    if (theaterId && mongoose.Types.ObjectId.isValid(theaterId)) {
      filter.theaterId = theaterId;
    }

    if (name && name.trim()) {
      filter.name = { $regex: new RegExp(name.trim(), "i") };
    }

    const screens = await Screen.find(filter)
      .select("-__v -createdAt -updatedAt")
      .skip(skip)
      .limit(limit);

    const total = await Screen.countDocuments(filter);

    res.status(200).json({
      message: screens.length
        ? "Screens retrieved successfully."
        : "No screens found with the given filters.",
      screens,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("Get screens error:", err);
    res
      .status(500)
      .json({ message: "Failed to retrieve screens.", error: err.message });
  }
};

// ===== UPDATE SCREEN =====
const updateScreen = async (req, res) => {
  try {
    const loggedinUser = req.user;
    // Check if logged-in user is admin
    if (loggedinUser.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    const { id } = req.params;
    const updateData = {};

    const allowedFields = ["name", "rows", "cols"];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    });

    if (Object.keys(updateData).length === 0) {
      return res
        .status(400)
        .json({ message: "No valid fields provided to update." });
    }

    // Check duplicate name within the same theater
    const screen = await Screen.findById(id).select(
      "-__v -createdAt -updatedAt"
    );
    if (!screen) {
      return res.status(404).json({ message: "Screen not found." });
    }

    if (updateData.name) {
      const duplicate = await Screen.findOne({
        _id: { $ne: id },
        theaterId: screen.theaterId,
        name: updateData.name.trim(),
      });

      if (duplicate) {
        return res.status(400).json({
          message: "Duplicate screen name in this theater.",
          errors: { name: "Screen name already exists in this theater." },
        });
      }
    }

    Object.assign(screen, updateData);
    await screen.save();

    res.status(200).json({ message: "Screen updated successfully.", screen });
  } catch (err) {
    console.error("Update screen error:", err);
    res
      .status(500)
      .json({ message: "Failed to update screen.", error: err.message });
  }
};

module.exports = { createScreen, getScreens, updateScreen };
