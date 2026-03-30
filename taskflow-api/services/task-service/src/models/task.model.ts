import { Schema, model, Document } from "mongoose";

export interface ITask extends Document {
  title: string;
  description?: string;
  status: "pending" | "inprogress" | "done";
  createdBy: string;
  createdByName?: string;
  assignedTo?: string;
  assignedToName?: string;
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
    createdBy: { type: String, required: true },
    createdByName: { type: String },
    assignedTo: { type: String },
    assignedToName: { type: String },
  },
  { timestamps: true }
);

// Compound indexes for fast look-ups by user and status (critical for dashboard performance)
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ createdBy: 1, status: 1 });
taskSchema.index({ assignedToName: 1 });

export const Task = model<ITask>("Task", taskSchema);