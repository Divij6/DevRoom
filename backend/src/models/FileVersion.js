import mongoose from "mongoose";

const fileVersionSchema = new mongoose.Schema(
  {
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "File"
    },

    versionNumber: {
      type: Number
    },

    filePath: {
      type: String
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    changeNote: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

const FileVersion =
mongoose.models.FileVersion ||
mongoose.model(
  "FileVersion",
  fileVersionSchema
);

export default FileVersion;