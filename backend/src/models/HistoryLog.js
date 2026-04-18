import mongoose, { mongo } from "mongoose";

const historyLogSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room"
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    actionType: {
      type: String
    },

    message: {
      type: String
    },

    entityId: {
      type: mongoose.Schema.Types.ObjectId
    }
  },
  {
    timestamps: true
  }
);

const HistoryLog =
mongoose.models.HistoryLog ||
mongoose.model(
  "HistoryLog",
  historyLogSchema
);

export default HistoryLog;