import mongoose from "mongoose";

const canvasNoteSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room"
    },

    text: {
      type: String
    },

    position: {
      x: Number,
      y: Number
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  {
    timestamps: true
  }
);

const CanvasNote =
mongoose.models.CanvasNote ||
mongoose.model(
  "CanvasNote",
  canvasNoteSchema
);

export default CanvasNote;