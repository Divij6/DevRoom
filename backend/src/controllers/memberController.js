import RoomMember from "../models/RoomMember.js";
import User from "../models/User.js";

export const inviteMember = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { email, role } = req.body;

    const inviterMembership = await RoomMember.findOne({
      roomId,
      userId: req.user.userId
    });

    if (
      !inviterMembership ||
      (inviterMembership.role !== "owner" &&
        inviterMembership.role !== "editor")
    ) {
      return res.status(403).json({ message: "Not allowed to invite" });
    }

    const userToInvite = await User.findOne({ email });

    if (!userToInvite) {
      return res.status(404).json({ message: "User not found" });
    }

    const alreadyMember = await RoomMember.findOne({
      roomId,
      userId: userToInvite._id
    });

    if (alreadyMember) {
      return res.status(400).json({ message: "User is already a member" });
    }

    if (role && !["owner", "editor", "viewer"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const member = await RoomMember.create({
      roomId,
      userId: userToInvite._id,
      role: role || "viewer"
    });

    const populatedMember = await RoomMember.findById(member._id).populate(
      "userId",
      "name email profileImage"
    );

    res.status(201).json({ message: "Member invited", member: populatedMember });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getRoomMembers = async (req, res) => {
  try {
    const { roomId } = req.params;

    const membership = await RoomMember.findOne({
      roomId,
      userId: req.user.userId
    });

    if (!membership) {
      return res.status(403).json({ message: "Access denied" });
    }

    const members = await RoomMember.find({ roomId }).populate(
      "userId",
      "name email profileImage"
    );

    res.status(200).json({ members });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateMemberRole = async (req, res) => {
  try {
    const { roomId, memberId } = req.params;
    const { role } = req.body;

    const requesterMembership = await RoomMember.findOne({
      roomId,
      userId: req.user.userId
    });

    if (!requesterMembership || requesterMembership.role !== "owner") {
      return res.status(403).json({ message: "Only owner can change roles" });
    }

    if (!["owner", "editor", "viewer"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const member = await RoomMember.findOne({
      _id: memberId,
      roomId
    });

    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    if (String(member.userId) === String(req.user.userId) && role !== "owner") {
      return res.status(400).json({ message: "Owner cannot change their own role" });
    }

    const updated = await RoomMember.findByIdAndUpdate(
      memberId,
      { role },
      { new: true }
    ).populate("userId", "name email profileImage");

    res.status(200).json({ message: "Role updated", updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const removeMember = async (req, res) => {
  try {
    const { roomId, memberId } = req.params;

    const requesterMembership = await RoomMember.findOne({
      roomId,
      userId: req.user.userId
    });

    if (!requesterMembership || requesterMembership.role !== "owner") {
      return res.status(403).json({ message: "Only owner can remove members" });
    }

    const member = await RoomMember.findOne({
      _id: memberId,
      roomId
    });

    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    if (String(member.userId) === String(req.user.userId)) {
      return res.status(400).json({ message: "Owner cannot remove themselves" });
    }

    await RoomMember.findByIdAndDelete(memberId);

    res.status(200).json({ message: "Member removed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
