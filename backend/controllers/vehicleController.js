// Vehicles CRUD + availability check.
// Availability is ALWAYS validated against MySQL — never decided in React.
const db = require('../db/pool');
const { ApiError } = require('../db/errors');
const { asyncHandler } = require('../middleware/error');
const { validateBody } = require('../utils/validate');
const { numericId } = require('../utils/params');
const { VEHICLE_STATUSES, FUEL_TYPES, TRANSMISSIONS } = require('../utils/constants');

const LIST_SELECT = `
  SELECT v.vehicle_id, v.registration_number, v.brand, v.model,
         v.vehicle_type_id, t.type_name, v.manufacturing_year, v.fuel_type,
         v.transmission, v.seating_capacity, v.rental_rate,
         v.branch_id, b.branch_name, v.status, v.created_at
  FROM vehicles v
  INNER JOIN vehicle_types t ON t.vehicle_type_id = v.vehicle_type_id
  INNER JOIN branches b      ON b.branch_id = v.branch_id
`;

// Utility: build WHERE + params from query-string filters
function buildFilters({ search, status, type, branch }) {
  const where = [];
  const params = [];

  if (search) {
    where.push('(v.registration_number LIKE ? OR v.brand LIKE ? OR v.model LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  if (status) { where.push('v.status = ?'); params.push(status); }
  if (type)   { where.push('v.vehicle_type_id = ?'); params.push(type); }
  if (branch) { where.push('v.branch_id = ?'); params.push(branch); }

  return { clause: where.length ? ` WHERE ${where.join(' AND ')}` : '', params };
}

// GET /api/vehicles?search=&status=&type=&branch=&page=&limit=
const list = asyncHandler(async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const offset = (page - 1) * limit;

  const { clause, params } = buildFilters(req.query);

  const countRows = await db.query(`SELECT COUNT(*) AS total FROM vehicles v${clause}`, params);
  const total = countRows[0].total;

  const rows = await db.query(
    `${LIST_SELECT}${clause} ORDER BY v.vehicle_id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  res.json({ data: rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

// GET /api/vehicles/:id — full profile incl. recent rentals + maintenance
const getOne = asyncHandler(async (req, res) => {
  const id = numericId(req.params.id, 'ID');
  const rows = await db.query(`${LIST_SELECT} WHERE v.vehicle_id = ?`, [id]);
  if (!rows[0]) throw new ApiError(404, 'Vehicle not found.');

  const rentals = await db.query(
    `SELECT r.rental_id, c.name AS customer_name, r.pickup_date, r.expected_return_date,
            r.actual_return_date, r.final_amount, r.status
     FROM rentals r
     INNER JOIN customers c ON c.customer_id = r.customer_id
     WHERE r.vehicle_id = ?
     ORDER BY r.pickup_date DESC LIMIT 5`, [id]);

  const maintenance = await db.query(
    `SELECT maintenance_id, maintenance_type, maintenance_date, cost, status
     FROM maintenance WHERE vehicle_id = ?
     ORDER BY maintenance_date DESC LIMIT 5`, [id]);

  res.json({ vehicle: rows[0], rentals, maintenance });
});

// POST /api/vehicles
const create = asyncHandler(async (req, res) => {
  const data = validateBody(req.body, {
    registration_number: { type: 'string', required: true, max: 20, pattern: /^[A-Z0-9\- ]{4,20}$/i, patternMessage: 'Registration number must be 4–20 characters (letters, digits, spaces or dashes).' },
    brand:     { type: 'string', required: true, max: 50 },
    model:     { type: 'string', required: true, max: 50 },
    vehicle_type_id: { type: 'int', required: true },
    manufacturing_year: { type: 'int', required: true, min: 1990, max: 2100 },
    fuel_type:       { type: 'string', required: true, oneOf: FUEL_TYPES },
    transmission:    { type: 'string', required: true, oneOf: TRANSMISSIONS },
    seating_capacity:{ type: 'int', required: true, min: 1, max: 60 },
    rental_rate:     { type: 'decimal', required: true },
    branch_id:       { type: 'int', required: true },
  });
  if (data.rental_rate <= 0) throw new ApiError(400, 'Rental rate must be greater than zero.');

  const result = await db.query(
    `INSERT INTO vehicles
      (registration_number, brand, model, vehicle_type_id, manufacturing_year,
       fuel_type, transmission, seating_capacity, rental_rate, branch_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.registration_number.toUpperCase(), data.brand, data.model, data.vehicle_type_id,
     data.manufacturing_year, data.fuel_type, data.transmission, data.seating_capacity,
     data.rental_rate, data.branch_id]
  );

  const rows = await db.query(`${LIST_SELECT} WHERE v.vehicle_id = ?`, [result.insertId]);
  res.status(201).json({ vehicle: rows[0] });
});

// PUT /api/vehicles/:id
const update = asyncHandler(async (req, res) => {
  const id = numericId(req.params.id, 'ID');
  const existing = await db.query('SELECT status FROM vehicles WHERE vehicle_id = ?', [id]);
  if (!existing[0]) throw new ApiError(404, 'Vehicle not found.');

  const data = validateBody(req.body, {
    registration_number: { type: 'string', required: true, max: 20, pattern: /^[A-Z0-9\- ]{4,20}$/i },
    brand:     { type: 'string', required: true, max: 50 },
    model:     { type: 'string', required: true, max: 50 },
    vehicle_type_id: { type: 'int', required: true },
    manufacturing_year: { type: 'int', required: true, min: 1990, max: 2100 },
    fuel_type:       { type: 'string', required: true, oneOf: FUEL_TYPES },
    transmission:    { type: 'string', required: true, oneOf: TRANSMISSIONS },
    seating_capacity:{ type: 'int', required: true, min: 1, max: 60 },
    rental_rate:     { type: 'decimal', required: true },
    branch_id:       { type: 'int', required: true },
  });
  if (data.rental_rate <= 0) throw new ApiError(400, 'Rental rate must be greater than zero.');

  await db.query(
    `UPDATE vehicles SET
      registration_number = ?, brand = ?, model = ?, vehicle_type_id = ?,
      manufacturing_year = ?, fuel_type = ?, transmission = ?, seating_capacity = ?,
      rental_rate = ?, branch_id = ?
     WHERE vehicle_id = ?`,
    [data.registration_number.toUpperCase(), data.brand, data.model, data.vehicle_type_id,
     data.manufacturing_year, data.fuel_type, data.transmission, data.seating_capacity,
     data.rental_rate, data.branch_id, id]
  );

  const rows = await db.query(`${LIST_SELECT} WHERE v.vehicle_id = ?`, [id]);
  res.json({ vehicle: rows[0] });
});

// PATCH /api/vehicles/:id/status  { status }
const updateStatus = asyncHandler(async (req, res) => {
  const id = numericId(req.params.id, 'ID');
  const { status } = validateBody(req.body, {
    status: { type: 'string', required: true, oneOf: VEHICLE_STATUSES },
  });

  const rows = await db.query('SELECT status FROM vehicles WHERE vehicle_id = ?', [id]);
  if (!rows[0]) throw new ApiError(404, 'Vehicle not found.');

  // Business rule: status of a RENTED vehicle can only change via a return
  if (rows[0].status === 'RENTED') {
    throw new ApiError(409, 'This vehicle is currently rented. Complete the return first.');
  }

  await db.query('UPDATE vehicles SET status = ? WHERE vehicle_id = ?', [status, id]);
  res.json({ vehicle_id: id, status });
});

// GET /api/vehicles/:id/availability?pickup=YYYY-MM-DD&return=YYYY-MM-DD
// Calls the create_rental validation path in read-only mode (no insert).
const checkAvailability = asyncHandler(async (req, res) => {
  const vehicleId = numericId(req.params.id, 'Vehicle');
  const pickup = String(req.query.pickup || '');
  const ret = String(req.query.return || '');

  if (!/^\d{4}-\d{2}-\d{2}$/.test(pickup) || !/^\d{4}-\d{2}-\d{2}$/.test(ret)) {
    throw new ApiError(400, 'pickup and return query params must be dates (YYYY-MM-DD).');
  }

  const rows = await db.query('SELECT status FROM vehicles WHERE vehicle_id = ?', [vehicleId]);
  if (!rows[0]) throw new ApiError(404, 'Vehicle not found.');

  const vehicle = rows[0];
  if (vehicle.status !== 'AVAILABLE') {
    return res.json({
      available: false,
      reason: vehicle.status === 'RENTED'
        ? 'Vehicle is currently rented.'
        : vehicle.status === 'MAINTENANCE'
          ? 'Vehicle is under maintenance.'
          : 'Vehicle is inactive.',
    });
  }

  const overlaps = await db.query(
    `SELECT COUNT(*) AS cnt FROM rentals
     WHERE vehicle_id = ?
       AND status IN ('PENDING','BOOKED','ACTIVE')
       AND pickup_date <= ?
       AND expected_return_date >= ?`,
    [vehicleId, ret, pickup]
  );

  if (overlaps[0].cnt > 0) {
    return res.json({ available: false, reason: 'Vehicle is already booked for the selected dates.' });
  }

  res.json({ available: true, reason: 'Available for the selected period.' });
});

module.exports = { list, getOne, create, update, updateStatus, checkAvailability };
