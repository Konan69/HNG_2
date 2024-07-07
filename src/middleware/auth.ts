import { Prisma } from "@prisma/client";
import { prisma } from "../server";
import jwt from "jsonwebtoken";

const secret = process.env.jwtPrivateKey;
type User = Prisma.UserGetPayload<{
  select: {
    userId: true;
    orgs: {
      select: {
        orgId: true;
      };
    };
  };
}>;

export const generateAccessToken = (user: User) => {
  return jwt.sign(
    { userId: user.userId, orgIds: user.orgs.map((org) => org.orgId) },
    secret!,
    {
      expiresIn: "5m",
    },
  );
};

export const requireAuth = (req: any, res: any, next: any) => {
  const accessToken = req.accessToken;
  if (!accessToken) {
    return res.status(401).send({ message: "Unauthorized" });
  }
  try {
    jwt.verify(accessToken, secret!, (err: any, decoded: any) => {
      if (err) {
        return res.status(401).send({ message: err.message });
      }
      console.log(decoded);
      return decoded;
    });
    next();
  } catch (error) {
    return res.status(401).send({ message: "Unauthorized" });
  }
};
