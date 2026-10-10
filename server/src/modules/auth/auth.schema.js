import Joi from 'joi';

export const registerSchema = Joi.object({
  name: Joi.string().trim().max(100).required().messages({
    'string.empty': 'Name is required.',
    'any.required': 'Name is required.',
  }),
  email: Joi.string().email().lowercase().required().messages({
    'string.email': 'A valid email is required.',
    'any.required': 'Email is required.',
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Password must be at least 8 characters.',
    'any.required': 'Password is required.',
  }),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().required().messages({
    'string.email': 'A valid email is required.',
    'any.required': 'Email is required.',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required.',
  }),
});
