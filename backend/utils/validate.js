// Request body schema validation utility
const { ApiError } = require('../db/errors');

/**
 * Validates req.body against a schema specification.
 *
 * Supported rule options:
 * - type: 'string' | 'number' | 'int' | 'decimal' | 'date' | 'boolean'
 * - required: boolean (throws 400 if missing or empty)
 * - min: number (min length for string, min value for number/int/decimal)
 * - max: number (max length for string, max value for number/int/decimal)
 * - pattern: RegExp (regex test for string)
 * - patternMessage: string (custom error message if pattern fails)
 * - oneOf: Array (whitelisted values)
 * - default: any (fallback if field is omitted)
 */
function validateBody(body, schema) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, 'Invalid request body.');
  }

  const result = {};

  for (const [key, rules] of Object.entries(schema)) {
    let val = body[key];

    // Apply default if undefined or null
    if (val === undefined || val === null || val === '') {
      if (rules.default !== undefined) {
        val = rules.default;
      }
    }

    const isEmpty = val === undefined || val === null || (typeof val === 'string' && val.trim() === '');

    if (rules.required && isEmpty) {
      const friendlyName = key.replace(/_/g, ' ');
      throw new ApiError(400, `${friendlyName} is required.`);
    }

    if (isEmpty) {
      if (rules.default !== undefined) {
        result[key] = rules.default;
      }
      continue;
    }

    // Type validation & casting
    if (rules.type === 'string') {
      if (typeof val !== 'string') {
        throw new ApiError(400, `${key} must be a string.`);
      }
      val = val.trim();
      if (rules.min !== undefined && val.length < rules.min) {
        throw new ApiError(400, `${key} must be at least ${rules.min} characters.`);
      }
      if (rules.max !== undefined && val.length > rules.max) {
        throw new ApiError(400, `${key} cannot exceed ${rules.max} characters.`);
      }
      if (rules.pattern && !rules.pattern.test(val)) {
        throw new ApiError(400, rules.patternMessage || `${key} format is invalid.`);
      }
      if (rules.oneOf && !rules.oneOf.includes(val)) {
        throw new ApiError(400, `${key} must be one of: ${rules.oneOf.join(', ')}.`);
      }
      result[key] = val;
    } else if (rules.type === 'int' || rules.type === 'number') {
      const num = Number(val);
      if (isNaN(num)) {
        throw new ApiError(400, `${key} must be a valid number.`);
      }
      if (rules.type === 'int' && !Number.isInteger(num)) {
        throw new ApiError(400, `${key} must be an integer.`);
      }
      if (rules.min !== undefined && num < rules.min) {
        throw new ApiError(400, `${key} must be at least ${rules.min}.`);
      }
      if (rules.max !== undefined && num > rules.max) {
        throw new ApiError(400, `${key} cannot exceed ${rules.max}.`);
      }
      result[key] = num;
    } else if (rules.type === 'decimal') {
      const num = Number(val);
      if (isNaN(num)) {
        throw new ApiError(400, `${key} must be a valid decimal number.`);
      }
      if (rules.min !== undefined && num < rules.min) {
        throw new ApiError(400, `${key} must be at least ${rules.min}.`);
      }
      if (rules.max !== undefined && num > rules.max) {
        throw new ApiError(400, `${key} cannot exceed ${rules.max}.`);
      }
      result[key] = num;
    } else if (rules.type === 'date') {
      const d = new Date(val);
      if (isNaN(d.getTime())) {
        throw new ApiError(400, `${key} must be a valid date.`);
      }
      result[key] = typeof val === 'string' ? val.trim() : val;
    } else if (rules.type === 'boolean') {
      result[key] = Boolean(val);
    } else {
      result[key] = val;
    }
  }

  return result;
}

module.exports = { validateBody };
