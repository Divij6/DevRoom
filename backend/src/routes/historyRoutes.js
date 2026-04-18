import express from "express";

import {
  getHistoryByRoom
} from "../controllers/historyController.js";

import { verifyToken } from "../middleware/authMiddleware.js";
const router = express.Router();

/*
GET /history/:roomId
*/

router.get(
  "/history/:roomId",
    verifyToken,
  getHistoryByRoom
);

export default router;