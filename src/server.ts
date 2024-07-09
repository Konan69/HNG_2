import { PrismaClient, Prisma } from "@prisma/client";
import express from "express";
import bcryptjs from "bcryptjs";
import { generateAccessToken, requireAuth } from "./middleware/jwt";
import { validateUser } from "./middleware/middleware";
import {
  userRegisterSchema,
  userLoginSchema,
  createOrgSchema,
} from "./middleware/joi";

export const prisma = new PrismaClient();

const app = express();

app.use(express.json());

app.post(
  "/auth/register",
  validateUser(userRegisterSchema),
  async (req, res) => {
    const { firstName, lastName, email, password, phone } = req.body;

    // Check if the email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email },
    });

    if (existingUser) {
      return res
        .status(422)
        .send({ message: "User already exists", status: "Bad request" });
    }

    try {
      // Hash the password
      const salt = await bcryptjs.genSalt(10);
      const hashedPassword = await bcryptjs.hash(password, salt);

      const userData = {
        firstname: firstName,
        lastname: lastName,
        email,
        password: hashedPassword,
        phone,
      };

      const user = await prisma.user.create({
        data: userData,
        select: {
          userId: true,
          firstname: true,
          lastname: true,
          email: true,
          phone: true,
        },
      });

      // Create the default organization for the user
      const orgData = {
        name: `${firstName}'s Organisation`,
        description: `Default organisation for ${firstName}`,
        createdBy: user.userId,
        users: {
          connect: { userId: user.userId },
        },
      };

      const newOrg = await prisma.organisation.create({
        data: orgData,
        select: {
          name: true,
          orgId: true,
          createdBy: true,
        },
      });

      const userWithOrg = { ...user, orgs: [newOrg] };

      // Generate an access token
      const accessToken = generateAccessToken(userWithOrg);

      res.status(201).json({
        status: "success",
        message: "Registration successful",
        data: {
          accessToken: accessToken,
          user: {
            userId: user.userId,
            firstName: user.firstname,
            lastName: user.lastname,
            email: user.email,
            phone: user.phone,
          },
        },
      });
    } catch (error) {
      console.error("Error in registration:", error);
      res.status(500).json({
        status: "error",
        message: "Registration failed",
      });
    }
  },
);

app.post("/auth/login", validateUser(userLoginSchema), async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).send({ status: "Bad request" });
    throw new Error("You must provide an email and a password.");
  }
  const user = await prisma.user.findUnique({
    where: { email: email },
    include: {
      orgs: true,
    },
  });

  if (!user) {
    res
      .status(403)
      .send({ status: "Bad request", message: "Invalid login credentials." });
    return;
  }
  const validPassword = await bcryptjs.compare(
    req.body.password,
    user.password,
  );
  if (!validPassword) return res.status(401).send("invalid email or password");

  try {
    console.log(user);
    return res.status(200).send({
      status: "success",
      message: "Login successful",
      data: {
        accessToken: generateAccessToken(user),
        user: {
          userId: user.userId,
          firstName: user.firstname,
          lastName: user.lastname,
          email: user.email,
          phone: user.phone,
        },
      },
    });
  } catch (err) {
    console.error({ error: err });
    return res.status(401).send({
      status: "Bad request",
      message: "Authentication failed",
      statusCode: 401,
    });
  }
});

app.post(
  "/api/organisations",
  requireAuth,
  validateUser(createOrgSchema),
  async (req: any, res: any) => {
    try {
      const UserId = (req.user as any).userId;

      const { name, description } = req.body;
      const org = await prisma.organisation.create({
        data: {
          name,
          description,
          createdBy: UserId,
        },
        select: {
          orgId: true,
          name: true,
          description: true,
        },
      });
      res
        .status(201)
        .send({ message: "Organisation created successfully", data: org });
    } catch (error) {
      console.error(error);
      res.status(400).send({
        status: "Bad Request",
        message: "Client Error",
        statusCode: 400,
      });
    }
  },
);

app.post(
  "/api/organisations/:orgId/users",
  requireAuth,
  async (req: any, res: any) => {
    const { orgId } = req.params;
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).send({ message: "User ID is required" });
    }
    try {
      const data = await prisma.organisation.update({
        where: {
          orgId: orgId,
        },
        data: {
          users: {
            connect: {
              userId: userId,
            },
          },
        },
      });

      res.status(200).send({
        status: "success",
        message: "User added to organisation successfully",
      });
    } catch (error) {
      res.status(500).send({ message: "failed to add user to organisation" });
    }
  },
);

app.get("/api/users/:id", requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    console.log(id);
    const loggedInUserId = (req.user as any).userId;

    // Fetch the requested user
    const requestedUser = await prisma.user.findUnique({
      where: { userId: id },
      include: { orgs: { select: { orgId: true, name: true } } },
    });

    if (!requestedUser) {
      return res.status(404).send({ message: "User not found" });
    }

    // Check if requested user is the logged-in user
    const isSameUser = loggedInUserId === id;

    if (!isSameUser) {
      // Fetch the organizations created by the logged-in user
      const createdOrganizations = await prisma.organisation.findMany({
        where: { createdBy: loggedInUserId },
        select: { orgId: true },
      });

      const createdOrgIds = createdOrganizations.map((org) => org.orgId);

      // Check if the requested user is in any of the organizations created by the logged-in user
      const isInCreatedOrg = requestedUser.orgs.some((org) =>
        createdOrgIds.includes(org.orgId),
      );

      // Check if both users are in the same organization
      const commonOrgs = requestedUser.orgs.filter((org) =>
        (req.user as any).orgIds.includes(org.orgId),
      );
      const isInSameOrg = commonOrgs.length > 0;

      if (!isInCreatedOrg && !isInSameOrg) {
        return res.status(403).send({ message: "Forbidden" });
      }
    }

    res.status(200).send({
      status: "success",
      message: "User retrieved successfully",
      data: {
        userId: requestedUser.userId,
        firstName: requestedUser.firstname,
        lastName: requestedUser.lastname,
        email: requestedUser.email,
        phone: requestedUser.phone,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Internal server error" });
  }
});

app.get("/api/organisations", requireAuth, async (req: any, res: any) => {
  try {
    const loggedInUserId = (req.user as any).userId;
    const orgs = await prisma.organisation.findMany({
      where: {
        OR: [
          { users: { some: { userId: loggedInUserId } } },
          { createdBy: loggedInUserId },
        ],
      },
      select: {
        orgId: true,
        name: true,
        description: true,
      },
    });

    const formattedOrgs = orgs.map((org) => ({
      orgId: org.orgId,
      name: org.name,
      description: org.description,
    }));

    res.status(200).send({
      status: "success",
      message: "User's organisations retrieved successfully",
      data: { organisations: formattedOrgs },
    });
  } catch (error) {
    console.error("Error fetching user's organisations:", error);
    res.status(500).send({
      status: "error",
      message: "An error occurred while fetching user's organisations",
    });
  }
});

app.get(
  "/api/organisations/:orgId",
  requireAuth,
  async (req: any, res: any) => {
    try {
      const { orgId } = req.params;
      const userId = (req.user as any).userId;
      // Check if the user belongs to the organization
      const org = await prisma.organisation.findUnique({
        where: {
          orgId: orgId,
          users: {
            some: {
              userId: userId,
            },
          },
        },
        select: {
          orgId: true,
          name: true,
          description: true,
        },
      });

      if (!org) {
        return res.status(403).json({
          status: "fail",
          message: "Access denied. You do not belong to this organization.",
        });
      }

      return res.status(200).json({
        status: "success",
        message: "Organization retrieved successfully",
        data: {
          orgId: org.orgId,
          name: org.name,
          description: org.description,
        },
      });
    } catch (error) {
      //error
      console.error("Error fetching organisations:", error);
      res.status(500).send({
        status: "error",
        message: "An error occurred while fetching organisation",
      });
    }
  },
);
app.listen(3000, () => console.log("listening on port 3000"));

export default app;
