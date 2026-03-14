import { Router } from "express";
import { login, register, getUser, getAllUsers, refreshToken, logout } from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/user", authMiddleware, getUser);
router.get("/users", authMiddleware, getAllUsers); // ✅ list all users (for Assignee dropdown)
router.post("/refresh", refreshToken);
router.post("/logout", logout);

export default router;