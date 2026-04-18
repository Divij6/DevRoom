import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      default: ""
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    isArchived: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

/*
Index for faster room lookup
Very important for performance
*/
roomSchema.index({ createdBy: 1 });

const Room = 
mongoose.models.Room ||
mongoose.model("Room", roomSchema);

export default Room;