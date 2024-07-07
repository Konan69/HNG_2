import jwt from "jsonwebtoken";
import { generateAccessToken } from "./src/middleware/jwt";
// import dotenv from "dotenv";
// dotenv.config({ path: ".env.test" });

const secret = "test_secret";

describe("Token Generation", () => {
  const user = {
    userId: "123456",
    orgs: [{ orgId: "org1" }, { orgId: "org2" }],
  };

  it("should generate a token with correct user details", () => {
    console.log(secret);
    const token = generateAccessToken(user);

    const decoded: any = jwt.verify(token, secret);

    expect(decoded.userId).toBe(user.userId);
    expect(decoded.orgIds).toEqual(expect.arrayContaining(["org1", "org2"]));
  });

  it("should generate a token that expires in 10 minutes", () => {
    const token = generateAccessToken(user);

    const decoded: any = jwt.verify(token, secret);

    const nowInSeconds = Math.floor(Date.now() / 1000);
    const expiresIn = decoded.exp - nowInSeconds;

    // Check if token expires within 10 minutes (600 seconds)
    expect(expiresIn).toBeLessThanOrEqual(600);
    expect(expiresIn).toBeGreaterThan(590); // Some margin of error
  });
});
