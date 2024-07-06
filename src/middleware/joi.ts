// validation.js
import Joi from "joi";

export const userRegisterSchema = Joi.object({
  firstname: Joi.string().required().messages({
    "string.empty": "First name is required",
  }),
  lastname: Joi.string().required().messages({
    "string.empty": "Last name is required",
  }),
  email: Joi.string().email().required().messages({
    "string.email": "Invalid email address",
    "string.empty": "Email is required",
  }),
  password: Joi.string().min(6).required().messages({
    "string.min": "Password must be at least 6 characters long",
    "string.empty": "Password is required",
  }),
  phone: Joi.string()
    .optional()
    .pattern(/^\+\d{6,15}$/)
    .messages({
      "string.pattern.base":
        'Phone number must start with a "+" and contain 6 to 15 digits',
    }),
});
