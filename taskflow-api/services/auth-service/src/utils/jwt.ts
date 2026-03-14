import jwt from "jsonwebtoken";

/*
Validate required environment variables
Fail fast if configuration is missing
*/

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}

if (!process.env.ACCESS_TOKEN_EXPIRY) {
  throw new Error("ACCESS_TOKEN_EXPIRY is not defined in environment variables");
}

if (!process.env.REFRESH_TOKEN_EXPIRY) {
  throw new Error("REFRESH_TOKEN_EXPIRY is not defined in environment variables");
}

const JWT_SECRET: string = process.env.JWT_SECRET;
const ACCESS_TOKEN_EXPIRY: string = process.env.ACCESS_TOKEN_EXPIRY;
const REFRESH_TOKEN_EXPIRY: string = process.env.REFRESH_TOKEN_EXPIRY;

export const generateAccessToken = (userId: string): string => {
  return jwt.sign(
    { userId },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY as jwt.SignOptions["expiresIn"] }
  );
};

export const generateRefreshToken = (userId: string): string => {
  return jwt.sign(
    { userId },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY as jwt.SignOptions["expiresIn"] }
  );
};