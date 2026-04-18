import express from "express";

import {
  linkFileToNode,
  getFilesForNode,
  unlinkFile
} from "../controllers/fileLinkController.js";

import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

/*
POST /files/link
*/
router.post(
  "/files/link",
  verifyToken,
  linkFileToNode
);

/*
GET /files/node/:nodeId
*/
router.get(
  "/files/node/:nodeId",
  verifyToken,
  getFilesForNode
);

/*
DELETE /files/unlink
*/
router.delete(
  "/files/unlink",
  verifyToken,
  unlinkFile
);

export default router;