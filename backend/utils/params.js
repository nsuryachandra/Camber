// Route parameter validator and parser
const { ApiError } = require('../db/errors');

function numericId(raw, label = 'ID') {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(400, `${label} must be a positive integer.`);
  }
  return id;
}

module.exports = { numericId };
