// Maps raw MySQL errors to safe, human-readable API errors.
// SQL internals are logged server-side; clients get clean messages.
class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function toApiError(err) {
  // Known error codes from MySQL
  switch (err.code) {
    case 'ER_DUP_ENTRY': {
      // e.g. "Duplicate entry 'KA01AB1234' for key 'vehicles.uq_vehicles_registration'"
      const key = (err.message.match(/for key '([^']+)'/) || [])[1] || '';
      if (key.includes('registration')) return new ApiError(409, 'A vehicle with this registration number already exists.');
      if (key.includes('license'))      return new ApiError(409, 'A customer with this driving licence number already exists.');
      if (key.includes('phone') && key.includes('customers')) return new ApiError(409, 'A customer with this phone number already exists.');
      if (key.includes('phone') && key.includes('branches'))  return new ApiError(409, 'A branch with this phone number already exists.');
      if (key.includes('email'))        return new ApiError(409, 'This email is already registered.');
      if (key.includes('branches'))     return new ApiError(409, 'A branch with this name already exists.');
      return new ApiError(409, 'Duplicate record — this value must be unique.');
    }
    case 'ER_NO_REFERENCED_ROW_2':
      return new ApiError(400, 'Related record not found (invalid reference).');
    case 'ER_ROW_IS_REFERENCED_2':
      return new ApiError(409, 'This record is referenced by other records and cannot be removed.');
    case 'ER_CHECK_CONSTRAINT_VIOLATED':
      return new ApiError(400, 'Value failed a database constraint (check dates, amounts or formats).');
    case 'ER_BAD_NULL_ERROR':
      return new ApiError(400, 'A required field is missing.');
    case 'ER_TRUNCATED_WRONG_VALUE':
      return new ApiError(400, 'One of the values has an invalid format.');
    case 'ER_SIGNAL_EXCEPTION':
      // Errors we raised deliberately in procedures (e.g. overlap validation)
      return new ApiError(400, err.sqlMessage || err.message || 'Operation rejected by business rule.');
    case 'ECONNREFUSED':
      return new ApiError(503, 'Database connection refused. Is MySQL running?');
    case 'ER_ACCESS_DENIED_ERROR':
      return new ApiError(503, 'Database credentials rejected.');
    case 'ER_BAD_DB_ERROR':
      return new ApiError(503, 'Database does not exist. Run: npm run setup:db');
    default:
      if (err.code === 'ERA_SIGNAL' || err.sqlState === '45000') {
        return new ApiError(400, err.sqlMessage || err.message);
      }
      return null; // not recognized — caller decides
  }
}

module.exports = { ApiError, toApiError };
