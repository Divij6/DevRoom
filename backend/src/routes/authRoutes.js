import express from "express";
import {
  register,
  login,
  getMe,
  logout
} from "../controllers/authController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// Public — no token needed
router.post("/register", register);
router.post("/login", login);

// Protected — token required
router.get("/me", protect, getMe);
router.post("/logout", protect, logout);

export default router;