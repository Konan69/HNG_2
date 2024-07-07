"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrgSchema = exports.userLoginSchema = exports.userRegisterSchema = void 0;
// validation.js
const joi_1 = __importDefault(require("joi"));
exports.userRegisterSchema = joi_1.default.object({
    firstname: joi_1.default.string().required().messages({
        "string.empty": "First name is required",
    }),
    lastname: joi_1.default.string().required().messages({
        "string.empty": "Last name is required",
    }),
    email: joi_1.default.string().email().required().messages({
        "string.email": "Invalid email address",
        "string.empty": "Email is required",
    }),
    password: joi_1.default.string().min(6).required().messages({
        "string.min": "Password must be at least 6 characters long",
        "string.empty": "Password is required",
    }),
    phone: joi_1.default.string()
        .optional()
        .pattern(/^\+\d{6,15}$/)
        .messages({
        "string.pattern.base": 'Phone number must start with a "+" and contain 6 to 15 digits',
    }),
});
exports.userLoginSchema = joi_1.default.object({
    email: joi_1.default.string().email().required().messages({
        "string.email": "Invalid email address",
        "string.empty": "Email is required",
    }),
    password: joi_1.default.string().min(6).required().messages({
        "string.min": "Password must be at least 6 characters long",
        "string.empty": "Password is required",
    }),
});
exports.createOrgSchema = joi_1.default.object({
    name: joi_1.default.string().required().messages({
        "string.empty": "Name is required",
    }),
    description: joi_1.default.string().required().messages({
        "string.empty": "Description is required",
    }),
});
