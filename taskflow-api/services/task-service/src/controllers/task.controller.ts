import { Request, Response } from "express";
import * as taskService from "../services/task.service";
import { taskQueue } from "../queue/task.queue";

export const createTaskController = async (req: Request, res: Response) => {
  try {
    const createdBy = req.user!.userId;
    // Use assignedTo from request body; fall back to creator if not provided
    const assignedTo = req.body.assignedTo ?? createdBy;

    const task = await taskService.createTask({
      ...req.body,
      createdBy: createdBy,
      assignedTo: assignedTo,
    });

    // Notify the assignee (not the creator) when a task is assigned
    await taskQueue.add("task-created", {
      userId: assignedTo,
      taskId: task._id,
      message: `Task "${task.title}" has been assigned to you`,
    });

    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const getTasksController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    // filter=assignedTo (default) | filter=createdBy
    const { status, page = 1, limit = 10, filter = "assignedTo" } = req.query;

    const filterKey = filter === "createdBy" ? "createdBy" : "assignedTo";
    const queryFilter: any = { [filterKey]: userId };
    if (status) queryFilter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const tasks = await taskService.getTasks(queryFilter, skip, Number(limit));
    const total = await taskService.countTasks(queryFilter);

    res.json({
      page: Number(page),
      limit: Number(limit),
      total,
      tasks,
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: err instanceof Error ? err.message : String(err) });
  }
};

export const getTaskByIdController = async (req: Request, res: Response) => {
  try {
    const task = await taskService.getTaskById(req.params.id);

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Allow access if the requester is the creator or the assignee
    const userId = req.user!.userId;
    const isCreator = String(task.createdBy) === userId;
    const isAssignee = String(task.assignedTo) === userId;

    if (!isCreator && !isAssignee) {
      return res.status(403).json({ error: "Forbidden: not your task" });
    }

    res.json(task);
  } catch (err) {
    res
      .status(500)
      .json({ error: err instanceof Error ? err.message : String(err) });
  }
};

export const updateTaskController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const task = await taskService.getTaskById(id);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    const userId = req.user!.userId;
    const isCreator = String(task.createdBy) === userId;
    const isAssignee = String(task.assignedTo) === userId;

    // Assignees can only update status; creators can update all fields
    if (!isCreator && !isAssignee) {
      return res.status(403).json({ error: "Forbidden: not your task" });
    }

    const allowedForCreator = ["title", "description", "status", "assignedTo"];
    const allowedForAssignee = ["status"];
    const allowedFields = isCreator ? allowedForCreator : allowedForAssignee;

    const updates: Partial<typeof data> = {};
    allowedFields.forEach((field) => {
      if (data[field] !== undefined) updates[field] = data[field];
    });

    // If creator is reassigning the task, keep as plain string UUID
    if (updates.assignedTo) {
      updates.assignedTo = String(updates.assignedTo);
    }

    if (Object.keys(updates).length === 0) {
      return res
        .status(400)
        .json({ error: "No valid fields provided for update" });
    }

    const updatedTask = await taskService.updateTask(id, updates);

    await taskQueue.add("task-updated", {
      userId: String(updatedTask.assignedTo),
      taskId: updatedTask._id,
      message: `Task "${updatedTask.title}" was updated`,
    });

    res.json(updatedTask);
  } catch (err: any) {
    res
      .status(500)
      .json({ error: err instanceof Error ? err.message : String(err) });
  }
};

export const deleteTaskController = async (req: Request, res: Response) => {
  try {
    const task = await taskService.getTaskById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Only the creator can delete a task
    if (String(task.createdBy) !== req.user!.userId) {
      return res
        .status(403)
        .json({ error: "Forbidden: only the creator can delete this task" });
    }

    await taskService.deleteTask(req.params.id);
    res.status(204).send();
  } catch (err) {
    res
      .status(500)
      .json({ error: err instanceof Error ? err.message : String(err) });
  }
};

export default {
  createTaskController,
  getTasksController,
  getTaskByIdController,
  updateTaskController,
  deleteTaskController,
};