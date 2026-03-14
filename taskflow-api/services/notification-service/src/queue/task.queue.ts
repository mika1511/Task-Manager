import { Queue } from "bullmq";

const redisConnection = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,
};

// Connect to the same Redis that Task Service uses
export const taskQueue = new Queue("taskQueue", {
  connection: redisConnection,
});

console.log("Notification queue connected to Redis");