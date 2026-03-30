// src/index.ts
import express from "express";
import http from "http";
import { Server } from "socket.io";
import { startWorker } from "./worker/task.worker"; // ✅ no circular import

const app = express();

const server = http.createServer(app);

const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:5173",
].filter(Boolean) as string[];

export const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.get("/health", (_req, res) => res.send("Notification Service is running"));

// Socket.IO connection — client emits "join" with their userId to receive notifications
io.on("connection", (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  socket.on("join", (userId: string) => {
    if (!userId) {
      console.warn(`[Socket.io] Client ${socket.id} tried to join without a userId`);
      return;
    }
    socket.join(userId);
    console.log(`[Socket.io] Client ${socket.id} (User: ${userId}) joined room: ${userId}`);
    
    // Debug: send a welcome back event
    socket.emit("notification", {
      type: "connected",
      message: "Real-time updates active"
    });
  });

  socket.on("disconnect", () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

// ✅ Start BullMQ worker AFTER io is created — pass io to avoid circular dependency
startWorker(io);

server.listen(Number(process.env.PORT) || 6001, () =>
  console.log(`[Notification Service] Running on port ${process.env.PORT || 6001}`)
);