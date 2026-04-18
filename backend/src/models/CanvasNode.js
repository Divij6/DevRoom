import mongoose from "mongoose";

const canvasNodeSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room"
    },

    title: {
      type: String
    },

    type: {
      type: String
      // frontend | backend | database
    },

    position: {
      x: Number,
      y: Number
    },

    width: {
      type: Number
    },

    height: {
      type: Number
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

const CanvasNode = 
mongoose.models.CanvasNode ||
mongoose.model(
  "CanvasNode",
  canvasNodeSchema
);

export default CanvasNode;