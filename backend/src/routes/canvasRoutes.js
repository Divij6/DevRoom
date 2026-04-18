import express from "express";

import {
  getFullCanvas,
  saveFullCanvas,
  loadCanvas
} from "../controllers/canvasController.js";

import { verifyToken } from "../middleware/authMiddleware.js";
const router = express.Router();

/*
GET FULL CANVAS
*/
router.get(
  "/canvas/:roomId",
  verifyToken,
  getFullCanvas
);

router.post(
  "/canvas/save",
  verifyToken,
  saveFullCanvas
);

router.post(
  "/canvas/load",
  verifyToken,
  loadCanvas
);

export default router;