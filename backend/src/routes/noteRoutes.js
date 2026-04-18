import express from "express";

import {
  createNote,
  updateNote,
  deleteNote
} from "../controllers/noteController.js";

import { verifyToken } from "../middleware/authMiddleware.js";
const router = express.Router();

/*
POST /notes
*/
router.post("/notes", verifyToken, createNote);

/*
PUT /notes/:noteId
*/
router.put("/notes/:noteId", verifyToken, updateNote);

/*
DELETE /notes/:noteId
*/
router.delete("/notes/:noteId", verifyToken, deleteNote);

export default router;