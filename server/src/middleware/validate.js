/**
 * Express middleware factory — validates req.body against a Joi schema.
 * On failure it returns a 400 VALIDATION_ERROR with per-field details.
 *
 * Usage:  router.post('/', validate(schema), controller)
 */
export function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message.replace(/['"]/g, ''),
      }));
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Request validation failed.', details },
      });
    }

    req.body = value; // replace with stripped/coerced value
    return next();
  };
}

/**
 * Validate req.query against a Joi schema.
 */
export function validateQuery(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message.replace(/['"]/g, ''),
      }));
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid query parameters.', details },
      });
    }

    req.query = value;
    return next();
  };
}
