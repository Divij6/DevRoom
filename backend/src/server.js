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
import { errorHandler } from "./middleware/errorMiddleware.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5002;
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  },
});

// Expose io globally so controllers can emit events
global.io = io;

// In-memory presence map: roomId -> Map(socketId -> { socketId, userId, userName })
const roomUsers = new Map();

// Middleware
app.use(cors({ origin: ["http://localhost:5173", "http://localhost:5174","http://192.168.1.3:5173"], credentials: true }));
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

app.get("/api/hello", (req, res) => res.send("Canvas Service Running"));

/* ─────────────────────────── SOCKET.IO ─────────────────────────── */
io.on("connection", (socket) => {
  console.log("[socket] connected", {
    socketId: socket.id,
    transport: socket.conn.transport.name,
  });

  /* ── Helpers ── */
  function joinRoom(roomId, userId, userName) {
    const previousRoomId = socket.data.roomId;

    if (previousRoomId && previousRoomId !== roomId) {
      socket.leave(previousRoomId);
      const prevMap = roomUsers.get(previousRoomId);
      if (prevMap) {
        prevMap.delete(socket.id);
        io.to(previousRoomId).emit('presence-update', Array.from(prevMap.values()));
        if (prevMap.size === 0) roomUsers.delete(previousRoomId);
      }
      socket.to(previousRoomId).emit("cursor-remove", { socketId: socket.id });
    }

    if (socket.data.roomId !== roomId) socket.join(roomId);

    socket.data.userId = userId;
    socket.data.roomId = roomId;
    socket.data.userName = userName || 'User';

    const usersMap = roomUsers.get(roomId) || new Map();
    usersMap.set(socket.id, { socketId: socket.id, userId, userName: socket.data.userName });
    roomUsers.set(roomId, usersMap);

    io.to(roomId).emit('presence-update', Array.from(usersMap.values()));
    console.log("[socket] room joined", {
      socketId: socket.id,
      roomId,
      userId,
      userName: socket.data.userName,
      occupants: usersMap.size,
    });
  }

  /* ── Presence join ── */
  socket.on('presence-join', (payload = {}) => {
    const { userId, roomId, userName } = payload;
    if (!userId || !roomId) {
      console.warn("[socket] presence-join ignored", {
        socketId: socket.id,
        payload,
      });
      return;
    }
    joinRoom(roomId, userId, userName);
  });

  /* ── Cursor move ── */
  socket.on("cursor-move", (payload = {}) => {
    const { userId, roomId, x, y, userName } = payload;
    if (!userId || !roomId || typeof x !== "number" || typeof y !== "number") {
      console.warn("[socket] cursor-move ignored", {
        socketId: socket.id,
        payload,
      });
      return;
    }

    joinRoom(roomId, userId, userName);

    socket.to(roomId).emit("cursor-update", {
      socketId: socket.id,
      userId, roomId, x, y,
      userName: socket.data.userName,
    });
  });

  /* ── Real-time node drag (optional live broadcast while dragging) ── */
  socket.on("node-drag", (payload = {}) => {
    const { roomId, nodeId, x, y } = payload;
    if (!roomId || !nodeId) {
      console.warn("[socket] node-drag ignored", {
        socketId: socket.id,
        payload,
      });
      return;
    }
    socket.to(roomId).emit("node-drag", { nodeId, x, y, socketId: socket.id });
  });

  /* ── Real-time note drag ── */
  socket.on("note-drag", (payload = {}) => {
    const { roomId, noteId, x, y } = payload;
    if (!roomId || !noteId) {
      console.warn("[socket] note-drag ignored", {
        socketId: socket.id,
        payload,
      });
      return;
    }
    socket.to(roomId).emit("note-drag", { noteId, x, y, socketId: socket.id });
  });

  /* ── Disconnect ── */
  socket.on("error", (error) => {
    console.error("[socket] server-side socket error", {
      socketId: socket.id,
      message: error?.message || error,
    });
  });

  socket.on("disconnect", (reason) => {
    const rId = socket.data.roomId;
    console.log("[socket] disconnected", {
      socketId: socket.id,
      roomId: rId,
      reason,
    });
    if (!rId) return;

    const usersMap = roomUsers.get(rId);
    if (usersMap) {
      usersMap.delete(socket.id);
      io.to(rId).emit('presence-update', Array.from(usersMap.values()));
      if (usersMap.size === 0) roomUsers.delete(rId);
    }

    socket.to(rId).emit("cursor-remove", { socketId: socket.id });
  });
});

server.listen(PORT, () => {
  console.log("Canvas server running on:", PORT);
});
