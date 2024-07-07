"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = exports.generateAccessToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const secret = process.env.jwtPrivateKey || "test_secret";
const generateAccessToken = (user) => {
    try {
        console.log(secret);
        const token = jsonwebtoken_1.default.sign({ userId: user.userId, orgIds: user.orgs.map((org) => org.orgId) }, secret, { expiresIn: "10m" });
        return token;
    }
    catch (error) {
        console.error("Error generating access token:", error);
        throw error;
    }
};
exports.generateAccessToken = generateAccessToken;
const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: "Unauthorized" });
    }
    const accessToken = authHeader.split(" ")[1];
    if (!accessToken) {
        return res.status(401).send({ message: "Unauthorized" });
    }
    try {
        jsonwebtoken_1.default.verify(accessToken, secret, (err, decoded) => {
            if (err) {
                return res.status(401).send({ message: err.message });
            }
            req.user = decoded;
            next();
        });
    }
    catch (error) {
        return res.status(401).send({ message: "Unauthorized" });
    }
};
exports.requireAuth = requireAuth;
