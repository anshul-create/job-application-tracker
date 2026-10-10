import Joi from 'joi';

const RESULTS = ['pending', 'passed', 'failed', 'cancelled'];

export const createInterviewSchema = Joi.object({
  roundName: Joi.string().trim().min(1).required().messages({
    'string.empty': 'Round name is required.',
    'any.required': 'Round name is required.',
  }),
  scheduledAt: Joi.date().iso().required().messages({
    'date.format': 'scheduledAt must be an ISO 8601 date.',
    'any.required': 'Scheduled date is required.',
  }),
  meetingUrl: Joi.string().uri().optional().allow(null).messages({
    'string.uri': 'Meeting URL must be a valid URL.',
  }),
  notes: Joi.string().trim().optional().allow(null),
});

export const updateInterviewSchema = Joi.object({
  roundName: Joi.string().trim().min(1).optional().messages({
    'string.empty': 'Round name cannot be empty.',
  }),
  scheduledAt: Joi.date().iso().optional().messages({
    'date.format': 'scheduledAt must be an ISO 8601 date.',
  }),
  meetingUrl: Joi.string().uri().optional().allow(null).messages({
    'string.uri': 'Meeting URL must be a valid URL.',
  }),
  result: Joi.string()
    .valid(...RESULTS)
    .optional()
    .messages({ 'any.only': `Result must be one of: ${RESULTS.join(', ')}.` }),
  notes: Joi.string().trim().optional().allow(null),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update.',
});
