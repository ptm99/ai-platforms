// Global error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  let status = err.status || 500;
  let error = err.error || 'internal_server_error';
  let message = err.message || 'An unexpected error occurred';
  let details = err.details || {};

  // Handle specific error types
  if (err.code === '23505') { // PostgreSQL unique constraint violation
    status = 400;
    error = 'duplicate_entry';
    message = 'Resource already exists';
  } else if (err.code === '23503') { // PostgreSQL foreign key violation
    status = 400;
    error = 'invalid_reference';
    message = 'Referenced resource does not exist';
  }

  res.status(status).json({
    error,
    message,
    details
  });
};

// Custom error class
class AppError extends Error {
  constructor(status, error, message, details = {}) {
    super(message);
    this.status = status;
    this.error = error;
    this.details = details;
  }
}

module.exports = errorHandler;
module.exports.AppError = AppError;