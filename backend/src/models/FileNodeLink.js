import mongoose from "mongoose";

const fileNodeLinkSchema = new mongoose.Schema(
  {
    nodeId: {
      type: mongoose.Schema.Types.ObjectId
    },

    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "File"
    },

    linkedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  {
    timestamps: true
  }
);

const FileNodeLink =
mongoose.models.FileNodeLink ||
mongoose.model(
  "FileNodeLink",
  fileNodeLinkSchema
);

export default FileNodeLink;