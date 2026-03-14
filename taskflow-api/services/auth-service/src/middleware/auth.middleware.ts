import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";


if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET not defined from auth middleware");
}

const JWT_SECRET = process.env.JWT_SECRET;

interface JwtPayload {
  userId: string;
}

/**
 * Authentication middleware that validates JWT tokens from request headers.
 * Extracts the token from the Authorization header, verifies it against the JWT secret,
 * and attaches the userId to the request object before passing control to the next middleware.
 * Responds with 401 status if the header is missing, token is invalid, or token is expired.
 */

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "Authorization header missing",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    (req as any).userId = decoded.userId;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};