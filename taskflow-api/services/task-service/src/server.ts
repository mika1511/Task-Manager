import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import taskRoutes from "./routes/task.routes";
import { connectDB } from "./config/db";
import { errorHandler } from "./middleware/errorhandler";

connectDB();

const app = express();

// ✅ Configure CORS properly for development and production
app.use(cors({
  origin: [process.env.CLIENT_URL || "http://localhost:8080"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
}));
app.use(express.json());

app.use("/tasks", taskRoutes);

app.use(errorHandler);

const PORT = process.env.PORT!;
app.listen(PORT, () => {
  console.log(`Task Service running on port ${PORT}`);
});