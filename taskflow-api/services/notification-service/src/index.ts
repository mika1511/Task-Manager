// src/index.ts
import express from "express";
import http from "http";
import { Server } from "socket.io";
import { startWorker } from "./worker/task.worker"; // ✅ no circular import

const app = express();

const server = http.createServer(app);

export const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"],
  },
});

app.get("/health", (_req, res) => res.send("Notification Service is running"));

// Socket.IO connection — client emits "join" with their userId to receive notifications
io.on("connection", (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  socket.on("join", (userId: string) => {
    socket.join(userId);
    console.log(`[Socket.io] User ${userId} joined their notification room`);
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