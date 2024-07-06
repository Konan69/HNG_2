import { Prisma } from "@prisma/client";
import { prisma } from "../server";
import jwt from "jsonwebtoken";

const secret = process.env.jwtPrivateKey;
type User = Prisma.UserGetPayload<{ select: { userId: true } }>;

export const generateAccessToken = (user: User) => {
  return jwt.sign({ userId: user.userId }, secret!, {
    expiresIn: "5m",
  });
};
