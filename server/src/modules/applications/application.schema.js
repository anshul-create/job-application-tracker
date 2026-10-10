import Joi from 'joi';

const STATUSES = ['saved', 'applied', 'online_assessment', 'interview', 'offer', 'rejected', 'withdrawn'];
const PERIODS = ['YEARLY', 'MONTHLY', 'HOURLY'];

const salarySchema = Joi.object({
  min: Joi.number().min(0),
  max: Joi.number().min(0),
  currency: Joi.string().uppercase().max(10),
  period: Joi.string().valid(...PERIODS),
});

export const createApplicationSchema = Joi.object({
  company: Joi.string().trim().min(1).required().messages({
    'string.empty': 'Company name is required.',
    'any.required': 'Company name is required.',
  }),
  role: Joi.string().trim().min(1).required().messages({
    'string.empty': 'Role is required.',
    'any.required': 'Role is required.',
  }),
  jobUrl: Joi.string().uri().optional().messages({
    'string.uri': 'Job URL must be a valid URL.',
  }),
  location: Joi.string().trim().optional(),
  salary: salarySchema.optional(),
  status: Joi.string()
    .valid(...STATUSES)
    .optional()
    .messages({
      'any.only': `Status must be one of: ${STATUSES.join(', ')}.`,
    }),
  appliedAt: Joi.date().iso().optional().messages({
    'date.format': 'appliedAt must be an ISO 8601 date.',
  }),
  notes: Joi.string().trim().optional(),
});
