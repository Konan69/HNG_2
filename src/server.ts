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
    try {
      const { firstname, lastname, email, password, phone } = req.body;

      // Hash the password
      const salt = await bcryptjs.genSalt(10);
      const hashedPassword = await bcryptjs.hash(password, salt);

      const userData: Prisma.UserCreateInput = {
        firstname,
        lastname,
        email,
        password: hashedPassword, // Store the hashed password
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

      // Next, create the default organization for the user
      const orgData = {
        name: `${firstname}'s Organisation`,
        description: `default organisation for ${firstname}`,
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

      const accessToken = generateAccessToken(userWithOrg); // Generate an access token

      res.status(201).json({
        status: "success",
        message: "Registration successful",
        data: {
          accessToken: accessToken,
          user: userWithOrg,
          // organization: user.orgs[0], // Include the first (and only) organization
        },
      });
      console.log({ user: userWithOrg });
    } catch (error) {
      console.error(error);
      res.status(400).json({
        status: "Bad request",
        message: "Registration unsuccessful",
        statusCode: 400,
      });
    }
  },
);

app.post("/auth/login", validateUser(userLoginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400);
      throw new Error("You must provide an email and a password.");
    }
    const user = await prisma.user.findUnique({
      where: { email: email },
      include: {
        orgs: true,
      },
    });

    if (!user) {
      res.status(403);
      throw new Error("Invalid login credentials.");
    }

    const validPassword = await bcryptjs.compare(
      req.body.password,
      user.password,
    );
    if (!validPassword)
      return res.status(400).send("invalid email or password");

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
