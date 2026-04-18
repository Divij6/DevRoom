import express from "express";
import {
  createRoom,
  getMyRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
  validateMembership
} from "../controllers/roomController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(protect);
router.post("/", createRoom);
router.get("/", getMyRooms);
router.get("/:roomId", getRoomById);
router.put("/:roomId", updateRoom);
router.delete("/:roomId", deleteRoom);
router.get("/:roomId/validate", validateMembership);

export default router;