import CanvasNode from "../models/CanvasNode.js";
import CanvasEdge from "../models/CanvasEdge.js";
import FileNodeLink from "../models/FileNodeLink.js";
import HistoryLog from "../models/HistoryLog.js";

/*
CREATE NODE
POST /nodes
*/
export const createNode = async (req, res) => {
  try {
    const { title, type, position, roomId, createdBy } = req.body;

    if (!title || !roomId) {
      return res.status(400).json({
        message: "Title and RoomId are required"
      });
    }

    const node = new CanvasNode({
      title,
      type,
      position,
      roomId,
      createdBy
    });

    await node.save();

    // Log history
    await HistoryLog.create({
      roomId,
      userId: createdBy,
      actionType: "CREATE_NODE",
      message: `Node '${title}' created`,
      entityId: node._id
    });
    // Emit realtime event
    try {
      if (global.io) {
        global.io.to(String(roomId)).emit('node-created', node);
      }
    } catch (e) {
      console.warn('Realtime emit failed (node-created)', e);
    }

    res.status(201).json({
      message: "Node created successfully",
      nodeId: node._id
    });

  } catch (error) {
    console.error("Create Node Error:", error);

    res.status(500).json({
      message: "Server error"
    });
  }
};


/*
GET NODES BY ROOM
GET /nodes/:roomId
*/
export const getNodesByRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    const nodes = await CanvasNode.find({
      roomId
    });

    res.status(200).json(nodes);

  } catch (error) {
    console.error("Get Nodes Error:", error);

    res.status(500).json({
      message: "Server error"
    });
  }
};


/*
UPDATE NODE
PUT /nodes/:nodeId
*/
export const updateNode = async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { title, position } = req.body;

    const updatedNode = await CanvasNode.findByIdAndUpdate(
      nodeId,
      {
        title,
        position
      },
      { new: true }
    );

    if (!updatedNode) {
      return res.status(404).json({
        message: "Node not found"
      });
    }

    // Log history
    await HistoryLog.create({
      roomId: updatedNode.roomId,
      actionType: "UPDATE_NODE",
      message: `Node updated`,
      entityId: nodeId
    });

    // Emit realtime update
    try {
      if (global.io) {
        global.io.to(String(updatedNode.roomId)).emit('node-updated', updatedNode);
      }
    } catch (e) {
      console.warn('Realtime emit failed (node-updated)', e);
    }

    res.status(200).json({
      message: "Node updated successfully"
    });

  } catch (error) {
    console.error("Update Node Error:", error);

    res.status(500).json({
      message: "Server error"
    });
  }
};


/*
DELETE NODE
DELETE /nodes/:nodeId
*/
export const deleteNode = async (req, res) => {
  try {
    const { nodeId } = req.params;

    const node = await CanvasNode.findById(nodeId);

    if (!node) {
      return res.status(404).json({
        message: "Node not found"
      });
    }

    // Delete connected edges
    await CanvasEdge.deleteMany({
      $or: [
        { sourceNodeId: nodeId },
        { targetNodeId: nodeId }
      ]
    });

    // Delete file links
    await FileNodeLink.deleteMany({
      nodeId
    });

    // Delete node
    await CanvasNode.findByIdAndDelete(nodeId);

    // Log history
    await HistoryLog.create({
      roomId: node.roomId,
      actionType: "DELETE_NODE",
      message: `Node deleted`,
      entityId: nodeId
    });

    // Emit realtime delete
    try {
      if (global.io) {
        global.io.to(String(node.roomId)).emit('node-deleted', { nodeId });
      }
    } catch (e) {
      console.warn('Realtime emit failed (node-deleted)', e);
    }

    res.status(200).json({
      message: "Node deleted successfully"
    });

  } catch (error) {
    console.error("Delete Node Error:", error);

    res.status(500).json({
      message: "Server error"
    });
  }
};