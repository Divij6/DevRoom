import CanvasNode from "../models/CanvasNode.js";
import CanvasEdge from "../models/CanvasEdge.js";
import CanvasNote from "../models/CanvasNote.js";
import FileNodeLink from "../models/FileNodeLink.js";
import HistoryLog from "../models/HistoryLog.js";

/*
GET FULL CANVAS
GET /canvas/:roomId
*/
export const getFullCanvas = async (req, res) => {
  try {
    const { roomId } = req.params;

    // Step 1 — fetch nodes first
    const nodes = await CanvasNode.find({
      roomId
    });

    // Extract node IDs
    const nodeIds = nodes.map(
      node => node._id
    );

    // Step 2 — fetch remaining data
    const [
      edges,
      notes,
      fileLinks
    ] = await Promise.all([

      CanvasEdge.find({ roomId }),

      CanvasNote.find({ roomId }),

      FileNodeLink.find({
        nodeId: { $in: nodeIds }
      })

    ]);

    res.status(200).json({
      nodes,
      edges,
      notes,
      fileLinks
    });

  } catch (error) {
    console.error(
      "Load Canvas Error:",
      error
    );

    res.status(500).json({
      message: "Server error"
    });
  }
};

// export const saveFullCanvas = async (req, res) => {
//   try {
//     const {
//       roomId,
//       nodes,
//       edges,
//       notes
//     } = req.body;

//     if (!roomId) {
//       return res.status(400).json({
//         message: "RoomId required"
//       });
//     }

//     // Remove old data
//     await CanvasNode.deleteMany({
//       roomId
//     });

//     await CanvasEdge.deleteMany({
//       roomId
//     });

//     await CanvasNote.deleteMany({
//       roomId
//     });

//     // Insert new data
//     if (nodes?.length) {
//       await CanvasNode.insertMany(
//         nodes
//       );
//     }

//     if (edges?.length) {
//       await CanvasEdge.insertMany(
//         edges
//       );
//     }

//     if (notes?.length) {
//       await CanvasNote.insertMany(
//         notes
//       );
//     }

//     res.status(200).json({
//       message:
//         "Canvas saved successfully"
//     });

//   } catch (error) {
//     console.error(
//       "Save Canvas Error:",
//       error
//     );

//     res.status(500).json({
//       message: "Server error"
//     });
//   }
// };
export const saveFullCanvas = async (req, res) => {

  try {

    const {
      roomId,
      nodes,
      edges,
      notes
    } = req.body;

    // Remove old
    await CanvasNode.deleteMany({ roomId });
    await CanvasEdge.deleteMany({ roomId });
    await CanvasNote.deleteMany({ roomId });

const savedNodes =
  await CanvasNode.insertMany(

    nodes.map(node => {

      const {
        tempShapeId,
        ...rest
      } = node;

      return rest;

    })

  );

// Create mapping

const shapeIdMap = {};

nodes.forEach(
  (node, index) => {

    shapeIdMap[
      node.tempShapeId
    ] = savedNodes[index]._id;

  }
);

console.log(
  "ShapeIdMap:",
  shapeIdMap
);



// Map edges using Mongo IDs (prefer temp shape ID mapping, fallback to proximity)
const mappedEdges = (edges || []).map((edge) => {
  let sourceNodeId = null;
  let targetNodeId = null;

  // Prefer explicit temp shape id mapping if provided by client
  if (edge.sourceTempId && shapeIdMap[edge.sourceTempId]) {
    sourceNodeId = shapeIdMap[edge.sourceTempId];
  }

  if (edge.targetTempId && shapeIdMap[edge.targetTempId]) {
    targetNodeId = shapeIdMap[edge.targetTempId];
  }

  // Fallback to proximity mapping when temp ids aren't available
  if ((!sourceNodeId || !targetNodeId) && savedNodes.length) {
    savedNodes.forEach((node) => {
      if (!sourceNodeId && edge.sourcePoint) {
        const dxStart = edge.sourcePoint.x - node.position.x;
        const dyStart = edge.sourcePoint.y - node.position.y;
        const startDistance = Math.sqrt(dxStart * dxStart + dyStart * dyStart);
        if (startDistance < 150) sourceNodeId = node._id;
      }

      if (!targetNodeId && edge.targetPoint) {
        const dxEnd = edge.targetPoint.x - node.position.x;
        const dyEnd = edge.targetPoint.y - node.position.y;
        const endDistance = Math.sqrt(dxEnd * dxEnd + dyEnd * dyEnd);
        if (endDistance < 150) targetNodeId = node._id;
      }
    });
  }

  return {
    roomId,
    sourceNodeId,
    targetNodeId,
    createdBy: edge.createdBy,
  };
}).filter((e) => e.sourceNodeId && e.targetNodeId);

// Save edges
if (mappedEdges.length > 0) {
  await CanvasEdge.insertMany(mappedEdges);
}



// Save notes
if (notes?.length) {
  await CanvasNote.insertMany(notes);
}

// Write a history log for this save operation
try {
  await HistoryLog.create({
    roomId,
    userId: req.user?.userId,
    actionType: 'canvas:save',
    message: `Saved canvas: ${savedNodes.length} nodes, ${mappedEdges.length} edges, ${notes?.length || 0} notes`,
  });
} catch (hError) {
  console.error('History save error:', hError);
}

res.status(200).json({
  message: 'Canvas saved successfully',
});

  }

  catch (error) {

    console.error(error);

    res.status(500).json({

      message: "Server error"

    });

  }

};

/*
LOAD CANVAS
POST /canvas/load
*/

export const loadCanvas = async (req, res) => {
  try {
    const {
      roomId,
      nodes,
      edges,
      notes
    } = req.body;

    if (!roomId) {
      return res.status(400).json({
        message: "RoomId required"
      });
    }

    // Step 1 — Clear existing data
    await CanvasNode.deleteMany({
      roomId
    });

    await CanvasEdge.deleteMany({
      roomId
    });

    await CanvasNote.deleteMany({
      roomId
    });

    // Step 2 — Insert incoming data

    if (nodes?.length) {
      await CanvasNode.insertMany(
        nodes
      );
    }

    if (edges?.length) {
      await CanvasEdge.insertMany(
        edges
      );
    }

    if (notes?.length) {
      await CanvasNote.insertMany(
        notes
      );
    }

    res.status(200).json({
      message: "Canvas loaded successfully"
    });

  } catch (error) {

    console.error(
      "Load Canvas Error:",
      error
    );

    res.status(500).json({
      message: "Server error"
    });
  }
};