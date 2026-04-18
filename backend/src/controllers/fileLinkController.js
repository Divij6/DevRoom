import FileNodeLink from "../models/FileNodeLink.js";
import HistoryLog from "../models/HistoryLog.js";

/*
LINK FILE TO NODE
POST /files/link
*/

export const linkFileToNode = async (req, res) => {
  try {
    const {
      nodeId,
      fileId,
      linkedBy,
      roomId
    } = req.body;

    if (!nodeId || !fileId) {
      return res.status(400).json({
        message: "NodeId and FileId required"
      });
    }

    const link = new FileNodeLink({
      nodeId,
      fileId,
      linkedBy
    });

    await link.save();

    // Log history
    try {
      await HistoryLog.create({
        roomId,
        userId: linkedBy,
        actionType: "LINK_FILE",
        message: "File linked to node",
        entityId: link._id
      });
    } catch (err) {
      console.log("History skipped");
    }

    res.status(201).json({
      message: "File linked successfully",
      linkId: link._id
    });

  } catch (error) {

    console.error(
      "Link File Error:",
      error
    );

    res.status(500).json({
      message: "Server error"
    });
  }
};


/*
GET FILES FOR NODE
GET /files/node/:nodeId
*/

export const getFilesForNode = async (req, res) => {

  try {

    const { nodeId } = req.params;

    const files =
      await FileNodeLink.find({
        nodeId
      });

    res.status(200).json(files);

  } catch (error) {

    console.error(
      "Get Files Error:",
      error
    );

    res.status(500).json({
      message: "Server error"
    });
  }
};


/*
UNLINK FILE
DELETE /files/unlink
*/

export const unlinkFile = async (req, res) => {

  try {

    const { linkId } = req.body;

    const link =
      await FileNodeLink.findById(
        linkId
      );

    if (!link) {
      return res.status(404).json({
        message: "Link not found"
      });
    }

    await FileNodeLink.findByIdAndDelete(
      linkId
    );

    res.status(200).json({
      message: "File unlinked successfully"
    });

  } catch (error) {

    console.error(
      "Unlink File Error:",
      error
    );

    res.status(500).json({
      message: "Server error"
    });
  }
};