const Theater = require("../models/theater.model");
const Screen = require("../models/screen.model");

// Create a new theater (admin only)
const createTheater = async (req, res) => {
  const loggedinUser = req.user;
  const theater = req.theater;

  if (!loggedinUser) {
    return res.status(401).json({ message: "Unauthorized. Please log in." });
  }

  // Check if logged-in user is admin
  if (loggedinUser.role !== "admin") {
    return res.status(403).json({ message: "Access denied. Admins only." });
  }

  // Logic to create a theater
  const newTheater = await Theater.create(theater);
  res
    .status(201)
    .json({ message: "Theater created successfully", theater: newTheater });
};

// Get theaters by city
const getTheaters = async (req, res) => {
  const limit = parseInt(req.query.limit) || 20; // default 20
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * limit;

  try {
    const { city, name, minScreens, maxScreens } = req.query;

    // Build dynamic filter
    const filter = {};

    if (city && city.trim()) {
      filter.city = { $regex: new RegExp(`^${city.trim()}$`, "i") };
    }

    if (name && name.trim()) {
      filter.name = { $regex: new RegExp(name.trim(), "i") }; // partial match
    }

    if (minScreens) {
      filter.totalScreens = {
        ...filter.totalScreens,
        $gte: parseInt(minScreens),
      };
    }

    if (maxScreens) {
      filter.totalScreens = {
        ...filter.totalScreens,
        $lte: parseInt(maxScreens),
      };
    }

    // Fetch theaters
    let theaters = await Theater.find(filter)
      .select("-__v -createdAt -updatedAt")
      .skip(skip)
      .limit(limit);

    // Dynamically update totalScreens for each theater
    theaters = await Promise.all(
      theaters.map(async (theater) => {
        const screenCount = await Screen.countDocuments({
          theaterId: theater._id,
        });
        return { ...theater.toObject(), totalScreens: screenCount };
      })
    );

    const total = await Theater.countDocuments(filter);

    res.status(200).json({
      message: theaters.length
        ? "Theaters retrieved successfully."
        : "No theaters found with the given filters.",
      theaters,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Get theaters error:", err);
    res.status(500).json({
      message: "Failed to retrieve theaters.",
      error: err.message,
    });
  }
};

// Get theater by ID
const getTheaterById = async (req, res) => {
  try {
    const { id } = req.params;

    const theater = await Theater.findById(id).select(
      "-__v -createdAt -updatedAt"
    );

    if (!theater) {
      return res.status(404).json({
        message: "Theater not found.",
        errors: { id: `No theater found with ID ${id}.` },
      });
    }

    res.status(200).json({
      message: "Theater retrieved successfully.",
      theater,
    });
  } catch (err) {
    console.error("Get theater by ID error:", err);
    res.status(500).json({
      message: "Failed to retrieve theater.",
      error: err.message,
    });
  }
};

// Update theater details (admin only) - Optional
/**
 * PUT /theater/:id
 * Update theater fields (admin only)
 */
const updateTheater = async (req, res) => {
  try {
    const { id } = req.params;
    const loggedinUser = req.user;
    const updateData = {};

    // Check if logged-in user is admin
    if (loggedinUser.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    const allowedFields = ["name", "city", "address", "totalScreens"];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        message: "No valid fields provided to update.",
      });
    }

    // Optional: Check for duplicate theater (name + city)
    if (updateData.name && updateData.city) {
      const existing = await Theater.findOne({
        _id: { $ne: id },
        name: updateData.name.trim(),
        city: updateData.city.trim(),
      });
      if (existing) {
        return res.status(400).json({
          message:
            "Another theater with same name already exists in this city.",
          errors: {
            name: "Duplicate theater name.",
            city: "Duplicate city entry.",
          },
        });
      }
    }

    const theater = await Theater.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true, context: "query" }
    ).select("-__v -createdAt -updatedAt");

    if (!theater) {
      return res.status(404).json({
        message: "Theater not found.",
        errors: { id: `No theater found with ID ${id}.` },
      });
    }

    res.status(200).json({
      message: "Theater updated successfully.",
      theater,
    });
  } catch (err) {
    console.error("Update theater error:", err);
    res.status(500).json({
      message: "Failed to update theater.",
      error: err.message,
    });
  }
};

module.exports = { createTheater, getTheaters, getTheaterById, updateTheater };
