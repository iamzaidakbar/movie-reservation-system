const User = require("../models/user.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
    algorithm: "HS256",
  });
};

// Cookie options
const cookieOptions = {
  httpOnly: true, // JS can't access cookies
  secure: process.env.NODE_ENV === "production", // only HTTPS in prod
  sameSite: "strict", // protect CSRF
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// ===== SIGNUP =====
exports.signup = async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).json({ error: "Request body is missing" });
    }

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: "Name, email, and password are required" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res
        .status(400)
        .json({ error: "User already exists with this email" });
    }

    const hash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password: hash }); // ✅ password field

    const token = generateToken(user._id);

    res.cookie("token", token, cookieOptions);

    res.status(201).json({
      message: "Signup successful",
      user: { id: user._id, name: user.name, email: user.email },
      token,
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Signup failed" });
  }
};

// ===== LOGIN =====
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password); // ✅ compare with stored hash
    if (!ok) return res.status(400).json({ error: "Invalid credentials" });

    const token = generateToken(user._id);

    res.cookie("token", token, cookieOptions);

    res.json({
      message: "Login successful",
      user: { id: user._id, name: user.name, email: user.email },
      token,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
};

// ===== LOGOUT =====
exports.logout = async (req, res) => {
  try {
    res.clearCookie("token", cookieOptions);
    res.json({ message: "Logout successful" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ error: "Logout failed" });
  }
};
