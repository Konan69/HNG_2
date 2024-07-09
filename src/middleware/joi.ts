// validation.js
import Joi from "joi";

export const userRegisterSchema = Joi.object({
  firstName: Joi.string().required().messages({
    "any.invalid": "Name cannot be null",
    "string.empty": "First name is required",
  }),
  lastName: Joi.string().required().messages({
    "any.invalid": "Name cannot be null",
    "string.empty": "Last name is required",
  }),
  email: Joi.string().email().required().messages({
    "any.invalid": "Name cannot be null",
    "string.email": "Invalid email address",
    "string.empty": "Email is required",
  }),
  password: Joi.string().required().messages({
    "any.invalid": "Name cannot be null",
    "string.empty": "Password is required",
  }),
  phone: Joi.string().optional(),
});

export const userLoginSchema = Joi.object({
  email: Joi.string().required().not(null).messages({
    "string.empty": "Email is required",
    "any.invalid": "Name cannot be null",
  }),
  password: Joi.string().not(null).required().messages({
    "string.empty": "Password is required",
  }),
});

export const createOrgSchema = Joi.object({
  name: Joi.string().not(null).required().messages({
    "any.invalid": "Name cannot be null",
    "string.empty": "Name is required",
  }),
  description: Joi.string().allow("").default(""),
});
