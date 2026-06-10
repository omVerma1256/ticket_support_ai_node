/**
 * Centralised error handling middleware.
 * Must be registered LAST in Express app.
 */
function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  // Known application errors
  if (err.status) {
    return res.status(err.status).json({
      error: err.message,
      code: err.code || 'APP_ERROR',
    });
  }

  // Knex/DB errors
  if (err.code === '23505') {
    return res.status(409).json({
      error: 'A record with this ID already exists.',
      code: 'DUPLICATE_ERROR',
    });
  }

  if (err.code === '23503') {
    return res.status(404).json({
      error: 'Referenced record not found.',
      code: 'FOREIGN_KEY_ERROR',
    });
  }

  // OpenAI errors
  if (err.constructor?.name === 'APIError' || err.type === 'invalid_request_error') {
    return res.status(502).json({
      error: 'AI service temporarily unavailable. Please try again.',
      code: 'AI_SERVICE_ERROR',
    });
  }

  // Generic server error
  res.status(500).json({
    error: 'An unexpected error occurred. Please try again.',
    code: 'INTERNAL_ERROR',
  });
}

/**
 * Create an application error with status code.
 */
function createError(message, status = 500, code = 'APP_ERROR') {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

module.exports = { errorHandler, createError };
