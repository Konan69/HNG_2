import { PrismaClient, Prisma } from "@prisma/client";
import express from "express";
import bcryptjs from "bcryptjs";
import { generateAccessToken, requireAuth } from "./middleware/auth";
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
        orgs: {
          create: {
            name: `${firstname}'s Organisation`,
            description: `default organisation for ${firstname}`,
          },
        },
      };

      const user = await prisma.user.create({
        data: userData,
        select: {
          userId: true,
          firstname: true,
          lastname: true,
          email: true,
          phone: true,
          orgs: {
            select: {
              name: true,
              orgId: true,
            },
          },
        },
      });

      const accessToken = generateAccessToken(user); // Generate an access token

      res.status(201).json({
        status: "success",
        message: "Registration successful",
        data: {
          accessToken: accessToken,
          user: user,
          // organization: user.orgs[0], // Include the first (and only) organization
        },
      });
      console.log({ user: user });
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

app.get("/api/users/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: {
        userId: id,
      },
    });
    res.status(200).send({
      status: "success",
      message: "User retrieved successfully",
      data: {
        userId: user?.userId,
        firstName: user?.firstname,
        lastName: user?.lastname,
        email: user?.email,
        phone: user?.phone,
      },
    });
  } catch (error) {}
});

app.listen(3000, () => console.log("listening on port 3000"));
