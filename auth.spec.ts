import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import app from "./src/server";
import { requireAuth, generateAccessToken } from "./src/middleware/jwt";
import { prisma } from "./src/server";

// Mock middleware to set req.user

app.use((req: any, res, next) => {
  req.user = {
    userId: "123456", // Mock logged-in user ID
    orgIds: ["org1", "org2"], // Mock organizations user has access to
  };
  next();
});

// Mock route that requires authentication
app.get("/api/organisations/:orgId", (req: any, res) => {
  const { orgId } = req.params;
  if (!(req.user as any).orgIds.includes(orgId)) {
    return res.status(403).send("Unauthorized");
  }
  res.status(200).send("Authorized");
});
describe("User Registration", () => {
  beforeEach(async () => {
    await prisma.user.deleteMany(); // Clear users before each test
  });

  it("should register user successfully with default organisation", async () => {
    const userData = {
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      password: "password123",
      phone: "+1234567890",
    };

    const response = await request(app)
      .post("/auth/register")
      .send(userData)
      .expect(201);

    expect(response.body.status).toBe("success");
    expect(response.body.message).toBe("Registration successful");
    expect(response.body.data.accessToken).toBeDefined();
    expect(response.body.data.user.firstName).toBe("John");
  });
});
describe("User Login", () => {
  beforeEach(async () => {
    await prisma.user.deleteMany(); // Clear users before each test

    const userData = {
      firstname: "Jane",
      lastname: "Smith",
      email: "jane.smith@example.com",
      password: await bcryptjs.hash("password123", 10),
      phone: "+1234567890",
    };

    await prisma.user.create({ data: userData });
  });

  it("should log the user in successfully", async () => {
    const loginData = {
      email: "jane.smith@example.com",
      password: "password123",
    };

    const response = await request(app)
      .post("/auth/login")
      .send(loginData)
      .expect(200);

    expect(response.body.status).toBe("success");
    expect(response.body.message).toBe("Login successful");
    expect(response.body.data.accessToken).toBeDefined();
    expect(response.body.data.user.firstName).toBe("Jane");
  });

  it("should fail login with invalid password", async () => {
    const loginData = {
      email: "jane.smith@example.com",
      password: "wrongpassword",
    };

    const response = await request(app)
      .post("/auth/login")
      .send(loginData)
      .expect(401);
  });

  it("should fail login with non-existent email", async () => {
    const loginData = {
      email: "nonexistent@example.com",
      password: "password123",
    };

    const response = await request(app)
      .post("/auth/login")
      .send(loginData)
      .expect(403);

    expect(response.body.status).toBe("Bad request");
    expect(response.body.message).toBe("Invalid login credentials.");
  });
});
describe("Validation", () => {
  it("should fail registration if required fields are missing", async () => {
    const invalidUserData = {};

    const response = await request(app)
      .post("/auth/register")
      .send(invalidUserData)
      .expect(422);

    expect(response.body.errors.length).toBe(4); // 4 required fields
    expect(
      response.body.errors.some((err: any) => err.field === "firstName"),
    ).toBeTruthy();
    expect(
      response.body.errors.some((err: any) => err.field === "lastName"),
    ).toBeTruthy();
    expect(
      response.body.errors.some((err: any) => err.field === "email"),
    ).toBeTruthy();
    expect(
      response.body.errors.some((err: any) => err.field === "password"),
    ).toBeTruthy();
  });
});
describe("Duplicate Email or UserID", () => {
  beforeEach(async () => {
    await prisma.user.deleteMany(); // Clear users before each test

    const userData = {
      firstname: "John",
      lastname: "Doe",
      email: "john.doe@example.com",
      password: await bcryptjs.hash("password123", 10),
      phone: "+1234567890",
    };

    await prisma.user.create({ data: userData });
  });

  it("should fail registration with duplicate email", async () => {
    const duplicateUserData = {
      firstName: "Jane",
      lastName: "Smith",
      email: "john.doe@example.com", // Same email as existing user
      password: "password456",
      phone: "+9876543210",
    };

    const response = await request(app)
      .post("/auth/register")
      .send(duplicateUserData)
      .expect(422);

    expect(response.body.status).toBe("Bad request");
    expect(response.body.message).toBe("User already exists");
  });
});
