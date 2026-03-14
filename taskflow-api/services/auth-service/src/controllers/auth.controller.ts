import { Request, Response } from "express";
import { registerUser } from "../services/auth.service";
import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt";
import { redisClient } from "../lib/redis";
import jwt, { JwtPayload } from "jsonwebtoken";

if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET not defined");
const JWT_SECRET = process.env.JWT_SECRET;



export async function register(req: Request, res: Response) {
  try {
    const { email, password, name } = req.body;

    const user = await registerUser(email, password, name);

    res.status(201).json({
      message: "User created",
      user
    });

  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}


export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    res.json({
      accessToken,
      refreshToken,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};


export const getUser = async (req: Request, res: Response) => {
  try {
    // auth.middleware.ts attaches userId directly: (req as any).userId
    const userId = (req as any).userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    console.error("getUser error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

// ✅ NEW: list all users — used by the frontend Assignee dropdown
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: "asc" },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token missing" });
    }

    // ✅ Check if refresh token is blacklisted
    const isBlacklisted = await redisClient.get(`bl_refresh_${refreshToken}`);
    if (isBlacklisted) {
      return res.status(401).json({ message: "Refresh token revoked" });
    }

    // ✅ Verify refresh token
    let payload: JwtPayload;
    try {
      payload = jwt.verify(refreshToken, JWT_SECRET) as JwtPayload;
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired refresh token" });
    }

    // ✅ Generate new tokens
    const newAccessToken = generateAccessToken(payload.userId);
    const newRefreshToken = generateRefreshToken(payload.userId);

    // ✅ Blacklist old refresh token
    await redisClient.set(`bl_refresh_${refreshToken}`, "revoked", {
      EX: 7 * 24 * 60 * 60, // expire in 7 days
    });

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token missing" });
    }

    // Optional: verify token (to ensure it’s valid JWT)
    try {
      jwt.verify(refreshToken, JWT_SECRET) as JwtPayload;
    } catch {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    // Add token to Redis blacklist
    await redisClient.set(`bl_refresh_${refreshToken}`, "revoked", {
      EX: 7 * 24 * 60 * 60, // expire in 7 days (same as refresh token expiry)
    });

    return res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};
