import mongoose from "mongoose";

const canvasEdgeSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room"
    },

    sourceNodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CanvasNode"
    },

    targetNodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CanvasNode"
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

const CanvasEdge =
mongoose.models.CanvasEdge ||
mongoose.model(
  "CanvasEdge",
  canvasEdgeSchema
);

export default CanvasEdge;