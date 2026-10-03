// JWT authentication + role-based authorization middleware.
const jwt = require('jsonwebtoken');
const config = require('../config');
const { ApiError } = require('../db/errors');

// Verifies the Bearer token and attaches { id, role, name } to req.user
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return next(new ApiError(401, 'Authentication required. Please log in.'));

  try {
    const payload = jwt.verify(token, config.jwt.secret);
    req.user = { id: payload.id, customer_id: payload.customer_id, role: payload.role, name: payload.name };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Session expired. Please log in again.'));
    }
    return next(new ApiError(401, 'Invalid token. Please log in again.'));
  }
}

// Role gate — usage: router.post('/', requireRole('ADMIN'), handler)
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to perform this action.'));
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
