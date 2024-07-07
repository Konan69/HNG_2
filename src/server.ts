import { PrismaClient, Prisma } from "@prisma/client";
import express from "express";
import bcryptjs from "bcryptjs";
import { generateAccessToken } from "./middleware/auth";
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

      const accessToken = generateAccessToken(user); // Generate an access token

      res.status(201).json({
        status: "success",
        message: "Registration successful",
        data: {
          accessToken: accessToken,
          user: user,
        },
      });
      console.log(user);
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
app.listen(3000, () => console.log("listening on port 3000"));
