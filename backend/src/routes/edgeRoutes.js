import express from "express";

import {
  createEdge,
  deleteEdge
} from "../controllers/edgeController.js";

import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

/*
POST /edges
*/
router.post("/edges", verifyToken, createEdge);

/*
DELETE /edges/:edgeId
*/
router.delete("/edges/:edgeId", verifyToken, deleteEdge);

export default router;