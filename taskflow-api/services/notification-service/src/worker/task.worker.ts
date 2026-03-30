// src/worker/task.worker.ts
// Receives `io` as a parameter to avoid circular dependency with index.ts
import { Worker } from "bullmq";
import { Server } from "socket.io";

const redisConnection = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,
  // Support full URL for production Redis
  ...(process.env.REDIS_URL ? { url: process.env.REDIS_URL } : {})
};

export function startWorker(io: Server) {
  const worker = new Worker(
    "taskQueue",
    async (job) => {
      const { userId, message, taskId } = job.data;

      if (job.name === "task-created") {
        console.log(`[Notification] Task created, notifying user ${userId}: ${message}`);
        io.to(userId).emit("notification", {
          type: "task-created",
          taskId,
          message,
          createdAt: new Date(),
        });
      }

      if (job.name === "task-updated") {
        console.log(`[Notification] Task updated, notifying user ${userId}: ${message}`);
        io.to(userId).emit("notification", {
          type: "task-updated",
          taskId,
          message,
          createdAt: new Date(),
        });
      }
    },
    { connection: redisConnection }
  );

  worker.on("completed", (job) => {
    console.log(`[Worker] Job ${job.id} (${job.name}) completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed: ${err.message}`);
  });

  console.log("[Worker] BullMQ notification worker started");
  return worker;
}
