import { PrismaClient, Prisma } from "@prisma/client";
import express from "express";
import bcryptjs from "bcryptjs";
import { generateAccessToken, requireAuth } from "./middleware/jwt";
import { validateUser } from "./middleware/middleware";
import { userRegisterSchema, userLoginSchema } from "./middleware/joi";

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
        orgs: requestedUser.orgs.map((org) => ({
          name: org.name,
          orgId: org.orgId,
        })),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Internal server error" });
  }
});

app.get("/api/organisations", requireAuth, async (req: any, res: any) => {
  try {
  } catch (error) {}
});
app.listen(3000, () => console.log("listening on port 3000"));
