import { Schema, model, Document } from "mongoose";

export interface ITask extends Document {
  title: string;
  description?: string;
  status: "pending" | "inprogress" | "done";
  createdBy: string;   // PostgreSQL UUID of the user who created the task
  assignedTo?: string; // PostgreSQL UUID of the user the task is assigned to
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true },
    description: { type: String },
    status: {
      type: String,
      enum: ["pending", "inprogress", "done"],
      default: "pending",
    },
    // Stored as plain strings because these are PostgreSQL UUIDs from auth-service,
    // not MongoDB ObjectIds — cross-database references can't use ObjectId/ref.
    createdBy: { type: String, required: true },
    assignedTo: { type: String },
  },
  { timestamps: true }
);

// Compound indexes for fast look-ups by user and status (critical for dashboard performance)
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ createdBy: 1, status: 1 });

export const Task = model<ITask>("Task", taskSchema);