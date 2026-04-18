import express from "express";

import {
  createNode,
  getNodesByRoom,
  updateNode,
  deleteNode
} from "../controllers/nodeController.js";

import { verifyToken } from "../middleware/authMiddleware.js";
const router = express.Router();

/*
POST /nodes
Create Node
*/
router.post("/nodes", verifyToken, createNode);

/*
GET /nodes/:roomId
Get Nodes By Room
*/
router.get("/nodes/:roomId", verifyToken, getNodesByRoom);

/*
PUT /nodes/:nodeId
Update Node
*/
router.put("/nodes/:nodeId", verifyToken, updateNode);

/*
DELETE /nodes/:nodeId
Delete Node
*/
router.delete("/nodes/:nodeId", verifyToken, deleteNode);

export default router;