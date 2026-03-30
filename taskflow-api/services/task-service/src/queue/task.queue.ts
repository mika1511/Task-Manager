import { Queue } from "bullmq";

const redisConnection = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,
  // For production environments that provide a full URL:
  ...(process.env.REDIS_URL ? { url: process.env.REDIS_URL } : {})
};

export const taskQueue = new Queue("taskQueue", {
  connection: redisConnection as any,
});

// Optional: listen for added jobs
taskQueue.on("waiting", (job) => {
  console.log(`Job ${job.id} added to queue`);
});

taskQueue.on("error", (err) => {
  console.error(`Queue error: ${err}`);
});