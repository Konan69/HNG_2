import { Prisma } from "@prisma/client";
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
      expiresIn: "10m",
    },
  );
};

export const requireAuth = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized" });
  }
  const accessToken = authHeader.split(" ")[1];

  if (!accessToken) {
    return res.status(401).send({ message: "Unauthorized" });
  }

  try {
    jwt.verify(accessToken, secret!, (err: any, decoded: any) => {
      if (err) {
        return res.status(401).send({ message: err.message });
      }
      req.user = decoded;
      next();
    });
  } catch (error) {
    return res.status(401).send({ message: "Unauthorized" });
  }
};
