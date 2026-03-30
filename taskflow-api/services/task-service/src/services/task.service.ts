import { Task, ITask } from "../models/task.model";

export const createTask = async (data: Partial<ITask>) => {
  const task = new Task(data);
  return await task.save();
};

export const getTasks = async (
  filter: any = {},
  skip: number = 0,
  limit: number = 10
) => {
  return await Task.find(filter)
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });
};

// Count tasks for pagination metadata
export const countTasks = async (filter: any = {}) => {
  return await Task.countDocuments(filter);
};

export const getTaskById = async (id: string) => {
  return await Task.findById(id);
};

export const updateTask = async (id: string, data: Partial<ITask>) => {
  const allowedFields = ["title", "description", "status", "assignedTo", "assignedToName", "createdByName"];
  const updates: Partial<ITask> = {};

  allowedFields.forEach((field) => {
    if (data[field as keyof ITask] !== undefined) updates[field as keyof ITask] = data[field as keyof ITask];
  });

  const updatedTask = await Task.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
  if (!updatedTask) throw new Error("Task not found");
  return updatedTask;
};

export const deleteTask = async (id: string) => {
  return await Task.findByIdAndDelete(id);
};