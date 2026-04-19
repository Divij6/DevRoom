import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room"
    },

    fileName: {
      type: String
    },

    fileType: {
      type: String
    },

    fileSize: {
      type: Number
    },

    filePath: {
      type: String
    },

    fileContent: {
      type: String,
      default: ""
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

const File =
mongoose.models.File ||
mongoose.model("File", fileSchema);

export default File;
