import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import taskRoutes from "./routes/task.routes";
import { connectDB } from "./config/db";
import { errorHandler } from "./middleware/errorhandler";

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/tasks", taskRoutes);

app.use(errorHandler);

const PORT = process.env.PORT!;
app.listen(PORT, () => {
  console.log(`Task Service running on port ${PORT}`);
});