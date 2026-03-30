import { Request, Response } from "express";
import * as taskService from "../services/task.service";
import * as aiService from "../services/ai.service";
import { Task } from "../models/task.model";
import { taskQueue } from "../queue/task.queue";

export const createTaskController = async (req: Request, res: Response) => {
  try {
    const createdBy = req.user!.userId;
    const createdByName = req.user!.name || req.user!.email?.split("@")[0] || "User";
    
    // Use assignedTo from request body; fall back to creator if not provided
    const assignedTo = req.body.assignedTo ?? createdBy;

    const task = await taskService.createTask({
      ...req.body,
      createdBy: createdBy,
      createdByName: createdByName,
      assignedTo: assignedTo,
    });

    // Notify both creator and assignee
    const jobs = [
      taskQueue.add("task-created", {
        userId: String(task.assignedTo),
        taskId: task._id,
        message: `New task "${task.title}" has been assigned to you`,
      }),
      taskQueue.add("task-created", {
        userId: String(task.createdBy),
        taskId: task._id,
        message: `You created task "${task.title}" and assigned it to ${task.assignedTo}`,
      }),
    ];

    console.log(`[TaskService] Adding ${jobs.length} notification jobs to queue for taskId: ${task._id}`);
    await Promise.all(jobs);

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

    const allowedForCreator = ["title", "description", "status", "assignedTo", "assignedToName"];
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

    await Promise.all([
      taskQueue.add("task-updated", {
        userId: String(updatedTask.assignedTo),
        taskId: updatedTask._id,
        message: `Task "${updatedTask.title}" was updated by ${isCreator ? "creator" : "assignee"}`,
      }),
      taskQueue.add("task-updated", {
        userId: String(updatedTask.createdBy),
        taskId: updatedTask._id,
        message: `Task "${updatedTask.title}" was updated by ${isCreator ? "you" : "assignee"}`,
      }),
    ]);

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

    const jobs = [
      taskQueue.add("task-updated", {
        userId: String(task.createdBy),
        taskId: task._id,
        message: `You deleted task "${task.title}"`,
      }),
    ];

    if (task.assignedTo) {
      jobs.push(
        taskQueue.add("task-updated", {
          userId: String(task.assignedTo),
          taskId: task._id,
          message: `Task "${task.title}" was deleted by its creator`,
        })
      );
    }

    await Promise.all(jobs);

    await taskService.deleteTask(req.params.id);
    res.status(204).send();
  } catch (err) {
    res
      .status(500)
      .json({ error: err instanceof Error ? err.message : String(err) });
  }
};


// taskflow-api/services/task-service/src/controllers/task.controller.ts

export const createSmartTask = async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    const userId = req.user!.userId;
    const userName = req.user!.name || req.user!.email?.split("@")[0] || "User";

    console.log(`[SmartTask] Processing prompt from ${userName}: "${prompt}"`);

    const aiParsedData = await aiService.parseTaskWithAI(prompt);
    
    // Ensure we have a title
    if (!aiParsedData.title) {
      aiParsedData.title = prompt.length > 50 ? prompt.substring(0, 47) + "..." : prompt;
    }

    // Smart Assignee Lookup: Try to find a matching ID from previous tasks if AI only gave a name
    if (aiParsedData.assignedToName && !aiParsedData.assignedTo) {
      const previousTask = await Task.findOne({ 
        assignedToName: { $regex: new RegExp(`^${aiParsedData.assignedToName}$`, "i") },
        assignedTo: { $exists: true, $ne: userId } // Don't match self if looking for someone else
      }).sort({ createdAt: -1 });

      if (previousTask) {
        console.log(`[SmartTask] Lookup Success: Found ID ${previousTask.assignedTo} for "${aiParsedData.assignedToName}"`);
        aiParsedData.assignedTo = previousTask.assignedTo;
      }
    }

    // Default to creator if still no assignee
    const assignedTo = aiParsedData.assignedTo || userId;

    const task = await taskService.createTask({
      ...aiParsedData,
      createdBy: userId,
      createdByName: userName,
      assignedTo: assignedTo,
    });

    // Notify assignee if it's someone else
    if (String(assignedTo) !== userId) {
      console.log(`[SmartTask] Notifying assignee ${assignedTo} about task ${task._id}`);
      await taskQueue.add("task-created", {
        userId: String(assignedTo),
        taskId: task._id,
        message: `${userName} assigned a new task to you: "${task.title}"`,
      });
    }

    // Notify creator
    console.log(`[SmartTask] Notifying creator ${userId} about task ${task._id}`);
    await taskQueue.add("task-created", {
      userId: userId,
      taskId: task._id,
      message: `Successfully created smart task: "${task.title}"`,
    });

    res.status(201).json(task);
  } catch (err: any) {
    console.error("[SmartTask] Error:", err.message);
    res.status(500).json({ 
      error: "AI processing failed",
      details: err.message
    });
  }
};


export default {
  createTaskController,
  getTasksController,
  getTaskByIdController,
  updateTaskController,
  deleteTaskController,
  createSmartTask,
};