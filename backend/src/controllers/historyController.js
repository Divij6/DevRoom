import HistoryLog from "../models/HistoryLog.js";

/*
GET HISTORY BY ROOM
GET /history/:roomId
*/

export const getHistoryByRoom = async (req, res) => {
  try {

    const { roomId } = req.params;

    const history =
      await HistoryLog.find({ roomId })
      .populate('userId', 'name')
      .sort({ createdAt: -1 }); // newest first

    res.status(200).json(history);

  } catch (error) {

    console.error(
      "Get History Error:",
      error
    );

    res.status(500).json({
      message: "Server error"
    });
  }
};