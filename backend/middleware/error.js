// Central error handler + async wrapper.
const { ApiError, toApiError } = require('../db/errors');

// Wrap async route handlers so thrown errors reach the error middleware
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// 404 for unknown API routes
function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// Final error middleware — converts any error into a clean JSON response
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message || 'Something went wrong.';

  if (!(err instanceof ApiError)) {
    const mapped = toApiError(err);
    if (mapped) {
      status = mapped.status;
      message = mapped.message;
    } else {
      message = 'Internal server error. Please try again.';
    }
  }

  // Technical detail stays in the server log only
  if (status >= 500) {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} →`, err);
  }

  res.status(status).json({ error: message });
}

module.exports = { asyncHandler, notFound, errorHandler };
