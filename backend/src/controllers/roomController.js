import Room from "../models/Room.js";
import RoomMember from "../models/RoomMember.js";

// ─── CREATE ROOM ────────────────────────────────────────────
export const createRoom = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Room name is required" });
    }

    // 1. Create the room
    const room = await Room.create({
      name,
      description,
      createdBy: req.user.userId
    });

    // 2. IMPORTANT: Also add creator as owner in room_members
    await RoomMember.create({
      roomId: room._id,
      userId: req.user.userId,
      role: "owner"
    });

    res.status(201).json({ message: "Room created", room });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── GET ALL MY ROOMS ────────────────────────────────────────
export const getMyRooms = async (req, res) => {
  try {
    // 1. Find all room memberships for this user
    const memberships = await RoomMember.find({ userId: req.user.userId });

    // 2. Extract the room IDs
    const roomIds = memberships.map((m) => m.roomId);

    // 3. Fetch those rooms (only non-archived)
    const rooms = await Room.find({
      _id: { $in: roomIds },
      isArchived: false
    });

    res.status(200).json({ rooms });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── GET SINGLE ROOM ─────────────────────────────────────────
export const getRoomById = async (req, res) => {
  try {
    const { roomId } = req.params;

    // 1. Check user is a member
    const membership = await RoomMember.findOne({
      roomId,
      userId: req.user.userId
    });
    if (!membership) {
      return res.status(403).json({ message: "Access denied" });
    }

    // 2. Get the room
    const room = await Room.findById(roomId);
    if (!room || room.isArchived) {
      return res.status(404).json({ message: "Room not found" });
    }

    res.status(200).json({ room });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── UPDATE ROOM ─────────────────────────────────────────────
export const updateRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { name, description } = req.body;

    // 1. Only owner can update
    const membership = await RoomMember.findOne({
      roomId,
      userId: req.user.userId
    });
    if (!membership || membership.role !== "owner") {
      return res.status(403).json({ message: "Only owner can update room" });
    }

    // 2. Update
    const room = await Room.findByIdAndUpdate(
      roomId,
      { name, description },
      { new: true } // return the updated document
    );

    res.status(200).json({ message: "Room updated", room });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── DELETE ROOM (soft delete) ───────────────────────────────
export const deleteRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    // 1. Only owner can delete
    const membership = await RoomMember.findOne({
      roomId,
      userId: req.user.userId
    });
    if (!membership || membership.role !== "owner") {
      return res.status(403).json({ message: "Only owner can delete room" });
    }

    // 2. Soft delete — just set isArchived to true
    await Room.findByIdAndUpdate(roomId, { isArchived: true });

    res.status(200).json({ message: "Room archived" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const validateMembership = async (req, res) => {
  try {
    const { roomId } = req.params;

    const membership = await RoomMember.findOne({
      roomId,
      userId: req.user.userId
    });

    if (!membership) {
      return res.status(403).json({ 
        valid: false, 
        message: "Not a member" 
      });
    }

    res.status(200).json({
      valid: true,
      role: membership.role,
      userId: req.user.userId,
      roomId
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};