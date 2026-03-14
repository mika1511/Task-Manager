import { Queue } from "bullmq";

const redisConnection = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,
};

export const taskQueue = new Queue("taskQueue", {
  connection: redisConnection,
});

// Optional: listen for added jobs
taskQueue.on("waiting", (job) => {
  console.log(`Job ${job.id} added to queue`);
});

taskQueue.on("error", (err) => {
  console.error(`Queue error: ${err}`);
});