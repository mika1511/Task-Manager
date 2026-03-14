import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma";

export async function registerUser(email: string, password: string, name?: string) {

  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    throw new Error("User already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name
    }
  });

  return user;
}