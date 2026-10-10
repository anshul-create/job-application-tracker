import Joi from 'joi';

const STATUSES = ['saved', 'applied', 'online_assessment', 'interview', 'offer', 'rejected', 'withdrawn'];
const PERIODS = ['YEARLY', 'MONTHLY', 'HOURLY'];
const SORT_FIELDS = ['createdAt', 'updatedAt', 'appliedAt', 'company', 'role', 'status'];

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
    .messages({ 'any.only': `Status must be one of: ${STATUSES.join(', ')}.` }),
  appliedAt: Joi.date().iso().optional().messages({
    'date.format': 'appliedAt must be an ISO 8601 date.',
  }),
  notes: Joi.string().trim().optional(),
});

export const listApplicationsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().trim().optional(),
  status: Joi.string().valid(...STATUSES).optional().messages({
    'any.only': `Status must be one of: ${STATUSES.join(', ')}.`,
  }),
  sortBy: Joi.string().valid(...SORT_FIELDS).default('createdAt').messages({
    'any.only': `sortBy must be one of: ${SORT_FIELDS.join(', ')}.`,
  }),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc').messages({
    'any.only': 'sortOrder must be asc or desc.',
  }),
});

export const updateApplicationSchema = Joi.object({
  company: Joi.string().trim().min(1).optional().messages({
    'string.empty': 'Company name cannot be empty.',
  }),
  role: Joi.string().trim().min(1).optional().messages({
    'string.empty': 'Role cannot be empty.',
  }),
  jobUrl: Joi.string().uri().optional().allow(null).messages({
    'string.uri': 'Job URL must be a valid URL.',
  }),
  location: Joi.string().trim().optional().allow(null),
  salary: salarySchema.optional().allow(null),
  status: Joi.string()
    .valid(...STATUSES)
    .optional()
    .messages({ 'any.only': `Status must be one of: ${STATUSES.join(', ')}.` }),
  appliedAt: Joi.date().iso().optional().allow(null).messages({
    'date.format': 'appliedAt must be an ISO 8601 date.',
  }),
  notes: Joi.string().trim().optional().allow(null),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update.',
});
