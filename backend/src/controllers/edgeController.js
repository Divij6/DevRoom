import CanvasEdge from "../models/CanvasEdge.js";
import HistoryLog from "../models/HistoryLog.js";

/*
CREATE EDGE
POST /edges
*/
export const createEdge = async (req, res) => {
  try {
    const {
      sourceNodeId,
      targetNodeId,
      roomId,
      createdBy
    } = req.body;

    if (!sourceNodeId || !targetNodeId) {
      return res.status(400).json({
        message: "Source and Target nodes required"
      });
    }

    const edge = new CanvasEdge({
      roomId,
      sourceNodeId,
      targetNodeId,
      createdBy
    });

    await edge.save();

    // Log history
    try {
      await HistoryLog.create({
        roomId,
        userId: createdBy,
        actionType: "CREATE_EDGE",
        message: "Connection created",
        entityId: edge._id
      });
    } catch (err) {
      console.log("History log skipped");
    }

    // Emit realtime event
    try {
      if (global.io) {
        global.io.to(String(roomId)).emit('edge-created', edge);
      }
    } catch (e) {
      console.warn('Realtime emit failed (edge-created)', e);
    }

    res.status(201).json({
      message: "Edge created successfully",
      edgeId: edge._id
    });

  } catch (error) {
    console.error("Create Edge Error:", error);

    res.status(500).json({
      message: "Server error"
    });
  }
};


/*
DELETE EDGE
DELETE /edges/:edgeId
*/
export const deleteEdge = async (req, res) => {
  try {
    const { edgeId } = req.params;

    const edge = await CanvasEdge.findById(edgeId);

    if (!edge) {
      return res.status(404).json({
        message: "Edge not found"
      });
    }

    await CanvasEdge.findByIdAndDelete(edgeId);

    // Log history
    try {
      await HistoryLog.create({
        roomId: edge.roomId,
        userId: edge.createdBy,
        actionType: "DELETE_EDGE",
        message: "Connection deleted",
        entityId: edgeId
      });
    } catch (err) {
      console.log("History log skipped");
    }

    // Emit realtime delete
    try {
      if (global.io) {
        global.io.to(String(edge.roomId)).emit('edge-deleted', { edgeId });
      }
    } catch (e) {
      console.warn('Realtime emit failed (edge-deleted)', e);
    }

    res.status(200).json({
      message: "Edge deleted successfully"
    });

  } catch (error) {
    console.error("Delete Edge Error:", error);

    res.status(500).json({
      message: "Server error"
    });
  }
};