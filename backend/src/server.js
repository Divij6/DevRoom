import express from "express";
import http from "http";
import connectDB from "./config/db.js";
import dotenv from "dotenv";
import cors from "cors";
import { Server as SocketIOServer } from "socket.io";
import nodeRoutes from "./routes/nodeRoutes.js";
import edgeRoutes from "./routes/edgeRoutes.js";
import noteRoutes from "./routes/noteRoutes.js";
import canvasRoutes from "./routes/canvasRoutes.js";
import fileLinkRoutes from "./routes/fileLinkRoutes.js";
import historyRoutes from "./routes/historyRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import memberRoutes from "./routes/memberRoutes.js";
import fileRoutes from './routes/file.routes.js';
import { errorHandler }
from "./middleware/errorMiddleware.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5002;
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true
  }
});

// Expose io globally so controllers can emit events
global.io = io;

// In-memory presence map: roomId -> Map(socketId -> { socketId, userId, userName })
const roomUsers = new Map();

// Middleware
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
  }));
app.use(express.json());

// DB
connectDB();

// Routes
app.use("/api", nodeRoutes);
app.use("/api", edgeRoutes);
app.use("/api", noteRoutes);
app.use("/api", canvasRoutes);
app.use("/api", fileLinkRoutes);
app.use("/api", historyRoutes);
app.use("/api", authRoutes);
app.use('/api/files', fileRoutes);
app.use("/rooms", roomRoutes);
app.use("/rooms/:roomId", memberRoutes);
app.use(errorHandler);

// Test route
app.get("/api/hello", (req, res) => {
  res.send("Canvas Service Running");
});

io.on("connection", (socket) => {
  // Allow clients to join presence without sending cursor data
  socket.on('presence-join', (payload = {}) => {
    const { userId, roomId, userName } = payload;

    if (!userId || !roomId) return;

    const previousRoomId = socket.data.roomId;

    if (previousRoomId && previousRoomId !== roomId) {
      socket.leave(previousRoomId);

      const prevMap = roomUsers.get(previousRoomId);
      if (prevMap) {
        prevMap.delete(socket.id);
        io.to(previousRoomId).emit('presence-update', Array.from(prevMap.values()));
        if (prevMap.size === 0) roomUsers.delete(previousRoomId);
      }
    }

    if (socket.data.roomId !== roomId) socket.join(roomId);

    socket.data.userId = userId;
    socket.data.roomId = roomId;
    socket.data.userName = userName || 'User';

    const usersMap = roomUsers.get(roomId) || new Map();
    usersMap.set(socket.id, { socketId: socket.id, userId, userName: socket.data.userName });
    roomUsers.set(roomId, usersMap);

    io.to(roomId).emit('presence-update', Array.from(usersMap.values()));
  });

  socket.on("cursor-move", (payload = {}) => {
    const {
      userId,
      roomId,
      x,
      y,
      userName
    } = payload;

    if (
      !userId ||
      !roomId ||
      typeof x !== "number" ||
      typeof y !== "number"
    ) {
      return;
    }

    const previousRoomId = socket.data.roomId;

    // If moving between rooms, remove presence from previous room
    if (previousRoomId && previousRoomId !== roomId) {
      socket.leave(previousRoomId);

      // remove from previous room presence map
      const prevMap = roomUsers.get(previousRoomId);
      if (prevMap) {
        prevMap.delete(socket.id);
        io.to(previousRoomId).emit('presence-update', Array.from(prevMap.values()));
        if (prevMap.size === 0) roomUsers.delete(previousRoomId);
      }

      socket.to(previousRoomId).emit("cursor-remove", {
        socketId: socket.id
      });
    }

    if (socket.data.roomId !== roomId) {
      socket.join(roomId);
    }

    socket.data.userId = userId;
    socket.data.roomId = roomId;
    socket.data.userName = userName || "User";

    // Add to presence map for the room
    const usersMap = roomUsers.get(roomId) || new Map();
    usersMap.set(socket.id, { socketId: socket.id, userId, userName: socket.data.userName });
    roomUsers.set(roomId, usersMap);

    // Broadcast current presence to everyone in the room
    io.to(roomId).emit('presence-update', Array.from(usersMap.values()));

    socket.to(roomId).emit("cursor-update", {
      socketId: socket.id,
      userId,
      roomId,
      x,
      y,
      userName: socket.data.userName
    });
  });

  socket.on("disconnect", () => {
    if (socket.data.roomId) {
      const rId = socket.data.roomId;

      // remove from presence map
      const usersMap = roomUsers.get(rId);
      if (usersMap) {
        usersMap.delete(socket.id);
        io.to(rId).emit('presence-update', Array.from(usersMap.values()));
        if (usersMap.size === 0) roomUsers.delete(rId);
      }

      socket.to(rId).emit("cursor-remove", {
        socketId: socket.id
      });
    }
  });
});

server.listen(PORT, () => {
  console.log("Canvas server running on:", PORT);
});
