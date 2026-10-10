export class AppError extends Error {
  /**
   * @param {string} message   Human-readable message
   * @param {number} statusCode HTTP status code
   * @param {string} code      Machine-readable error code, e.g. 'NOT_FOUND'
   * @param {Array}  details   Optional field-level validation details
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = []) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}
