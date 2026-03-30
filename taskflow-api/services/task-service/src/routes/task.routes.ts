import { Router } from "express";
import taskController from "../controllers/task.controller";
import { query, body, param, validationResult } from "express-validator";
import { authMiddleware } from "../middleware/authMiddlware";

const router = Router();

// Validation middleware
const validate = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// ✅ Create Task (protected)
router.post(
  "/",
  authMiddleware,
  body("title").notEmpty().withMessage("Title is required"),
  body("status")
    .optional()
    .isIn(["pending", "inprogress", "done"])
    .withMessage("Status must be pending, inprogress, or done"),
  body("assignedTo")
    .optional()
    .isUUID()
    .withMessage("assignedTo must be a valid user ID"),
  validate,
  taskController.createTaskController
);

// ✅ Get tasks with filtering & pagination
// ?filter=assignedTo (default) or ?filter=createdBy
router.get(
  "/",
  authMiddleware,
  query("status").optional().isIn(["pending", "inprogress", "done"]),
  query("filter").optional().isIn(["assignedTo", "createdBy"]),
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be >= 1"),
  query("limit").optional().isInt({ min: 1 }).withMessage("Limit must be >= 1"),
  validate,
  taskController.getTasksController
);

// ✅ Get task by ID (protected)
router.get(
  "/:id",
  authMiddleware,
  param("id").isMongoId().withMessage("Invalid task ID"),
  validate,
  taskController.getTaskByIdController
);

// ✅ Update Task (PATCH, protected)
router.patch(
  "/:id",
  authMiddleware,
  param("id").isMongoId().withMessage("Invalid task ID"),
  body("title").optional().notEmpty().withMessage("Title cannot be empty"),
  body("status")
    .optional()
    .isIn(["pending", "inprogress", "done"])
    .withMessage("Status must be pending, inprogress, or done"),
  body("assignedTo")
    .optional()
    .isUUID()
    .withMessage("assignedTo must be a valid user ID"),
  validate,
  taskController.updateTaskController
);

// ✅ Delete Task (protected - creator only)
router.delete(
  "/:id",
  authMiddleware,
  param("id").isMongoId().withMessage("Invalid task ID"),
  validate,
  taskController.deleteTaskController
);

//using Ai to create task
router.post("/smart", authMiddleware, taskController.createSmartTask);

export default router;