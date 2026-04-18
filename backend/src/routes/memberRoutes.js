import express from "express";
import {
  inviteMember,
  getRoomMembers,
  updateMemberRole,
  removeMember
} from "../controllers/memberController.js";
import protect from "../middleware/authMiddleware.js";
const router = express.Router({ mergeParams: true });

router.use(protect);
router.get("/members", getRoomMembers);
router.post("/members", inviteMember);
router.patch("/members/:memberId", updateMemberRole);
router.delete("/members/:memberId", removeMember);

export default router;
