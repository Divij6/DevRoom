import mongoose from "mongoose";

const roomMemberSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    role: {
      type: String,
      enum: ["owner", "editor", "viewer"],
      default: "viewer"
    },

    joinedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

/*
Very Important Rule:

One user cannot join
same room twice.

So we enforce:

(roomId + userId) UNIQUE
*/

roomMemberSchema.index(
  { roomId: 1, userId: 1 },
  { unique: true }
);

/*
Useful Index:
Get all members of a room fast
*/

roomMemberSchema.index({ roomId: 1 });

const RoomMember =
mongoose.models.RoomMember ||
mongoose.model(
  "RoomMember",
  roomMemberSchema
);

export default RoomMember;