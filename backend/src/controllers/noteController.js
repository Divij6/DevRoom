import CanvasNote from "../models/CanvasNote.js";
import HistoryLog from "../models/HistoryLog.js";

/*
CREATE NOTE
POST /notes
*/
export const createNote = async (req, res) => {
  try {
    const {
      text,
      position,
      roomId,
      createdBy
    } = req.body;

    if (!roomId) {
      return res.status(400).json({
        message: "RoomId required"
      });
    }

    const noteText = typeof text === "string"
      ? text
      : "";

    const noteCreator = createdBy || req.user?.userId;

    const note = new CanvasNote({
      text: noteText,
      position,
      roomId,
      createdBy: noteCreator
    });

    await note.save();

    // Log history
    try {
      await HistoryLog.create({
        roomId,
        userId: noteCreator,
        actionType: "CREATE_NOTE",
        message: "Note created",
        entityId: note._id
      });
    } catch (err) {
      console.log("History log skipped");
    }

    res.status(201).json({
      message: "Note created successfully",
      noteId: note._id
    });

    // Emit realtime event for new note
    try {
      if (global.io) {
        global.io.to(String(roomId)).emit('note-created', note);
      }
    } catch (e) {
      console.warn('Realtime emit failed (note-created)', e);
    }

  } catch (error) {
    console.error("Create Note Error:", error);

    res.status(500).json({
      message: "Server error"
    });
  }
};


/*
UPDATE NOTE
PUT /notes/:noteId
*/
export const updateNote = async (req, res) => {
  try {
    const { noteId } = req.params;
    const { text, position } = req.body;

    const updatedNote =
      await CanvasNote.findByIdAndUpdate(
        noteId,
        {
          text,
          position
        },
        { new: true }
      );

    if (!updatedNote) {
      return res.status(404).json({
        message: "Note not found"
      });
    }

    // Log history
    try {
      await HistoryLog.create({
        roomId: updatedNote.roomId,
        userId: updatedNote.createdBy,
        actionType: "UPDATE_NOTE",
        message: "Note updated",
        entityId: noteId
      });
    } catch (err) {
      console.log("History skipped");
    }

    res.status(200).json({
      message: "Note updated successfully"
    });

    // Emit realtime update
    try {
      if (global.io) {
        global.io.to(String(updatedNote.roomId)).emit('note-updated', updatedNote);
      }
    } catch (e) {
      console.warn('Realtime emit failed (note-updated)', e);
    }

  } catch (error) {
    console.error("Update Note Error:", error);

    res.status(500).json({
      message: "Server error"
    });
  }
};


/*
DELETE NOTE
DELETE /notes/:noteId
*/
export const deleteNote = async (req, res) => {
  try {
    const { noteId } = req.params;

    const note =
      await CanvasNote.findById(noteId);

    if (!note) {
      return res.status(404).json({
        message: "Note not found"
      });
    }

    await CanvasNote.findByIdAndDelete(
      noteId
    );

    // Log history
    try {
      await HistoryLog.create({
        roomId: note.roomId,
        userId: note.createdBy,
        actionType: "DELETE_NOTE",
        message: "Note deleted",
        entityId: noteId
      });
    } catch (err) {
      console.log("History skipped");
    }

    res.status(200).json({
      message: "Note deleted successfully"
    });

  } catch (error) {
    console.error("Delete Note Error:", error);

    res.status(500).json({
      message: "Server error"
    });
  }
};
