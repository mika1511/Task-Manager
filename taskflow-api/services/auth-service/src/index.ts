import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectRedis } from "./lib/redis";
import authRoutes from "./routes/auth.routes";

dotenv.config();

const startServer = async () => {
  try {
    // ✅ Connect to Redis first
    await connectRedis();
    console.log("✅ Redis connected successfully");

    const app = express();
    
    // ✅ Configure CORS properly for development and production
    app.use(cors({
      origin: [process.env.CLIENT_URL || "http://localhost:8080"],
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
    }));
    app.use(express.json());

    app.use("/auth", authRoutes);

    app.get("/health", (_req, res) => {
      res.json({ status: "Auth service running" });
    });

    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(`Auth Service running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server", err);
    process.exit(1); // Stop the process if Redis cannot connect
  }
};

startServer();