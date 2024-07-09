"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrgSchema = exports.userLoginSchema = exports.userRegisterSchema = void 0;
// validation.js
const joi_1 = __importDefault(require("joi"));
exports.userRegisterSchema = joi_1.default.object({
    firstName: joi_1.default.string().required().messages({
        "any.invalid": "Name cannot be null",
        "string.empty": "First name is required",
    }),
    lastName: joi_1.default.string().required().messages({
        "any.invalid": "Name cannot be null",
        "string.empty": "Last name is required",
    }),
    email: joi_1.default.string().email().required().messages({
        "any.invalid": "Name cannot be null",
        "string.email": "Invalid email address",
        "string.empty": "Email is required",
    }),
    password: joi_1.default.string().required().messages({
        "any.invalid": "Name cannot be null",
        "string.empty": "Password is required",
    }),
    phone: joi_1.default.string().optional(),
});
exports.userLoginSchema = joi_1.default.object({
    email: joi_1.default.string().required().not(null).messages({
        "string.empty": "Email is required",
        "any.invalid": "Name cannot be null",
    }),
    password: joi_1.default.string().not(null).required().messages({
        "string.empty": "Password is required",
    }),
});
exports.createOrgSchema = joi_1.default.object({
    name: joi_1.default.string().not(null).required().messages({
        "any.invalid": "Name cannot be null",
        "string.empty": "Name is required",
    }),
    description: joi_1.default.string().allow("").default(""),
});
