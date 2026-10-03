// Branches — CRUD + per-branch fleet summary (SQL aggregates).
const db = require('../db/pool');
const { ApiError } = require('../db/errors');
const { asyncHandler } = require('../middleware/error');
const { validateBody } = require('../utils/validate');
const { numericId } = require('../utils/params');

// GET /api/branches — list with vehicle counts per status
const list = asyncHandler(async (req, res) => {
  const rows = await db.query(
    `SELECT b.branch_id, b.branch_name, b.address, b.city, b.phone,
            b.manager_name, b.status,
            COUNT(v.vehicle_id) AS total_vehicles,
            COALESCE(SUM(v.status = 'AVAILABLE'), 0)   AS available,
            COALESCE(SUM(v.status = 'RENTED'), 0)      AS rented,
            COALESCE(SUM(v.status = 'MAINTENANCE'), 0) AS maintenance,
            COALESCE(SUM(v.status = 'INACTIVE'), 0)    AS inactive
     FROM branches b
     LEFT JOIN vehicles v ON v.branch_id = b.branch_id
     GROUP BY b.branch_id
     ORDER BY b.branch_id`);
  res.json({ data: rows });
});

// GET /api/branches/:id — detail + vehicles at the branch
const getOne = asyncHandler(async (req, res) => {
  const id = numericId(req.params.id, 'ID');
  const rows = await db.query('SELECT * FROM branches WHERE branch_id = ?', [id]);
  if (!rows[0]) throw new ApiError(404, 'Branch not found.');

  const vehicles = await db.query(
    `SELECT vehicle_id, registration_number, brand, model, t.type_name,
            rental_rate, status
     FROM vehicles v
     INNER JOIN vehicle_types t ON t.vehicle_type_id = v.vehicle_type_id
     WHERE branch_id = ? ORDER BY vehicle_id`, [id]);

  res.json({ branch: rows[0], vehicles });
});

// POST /api/branches
const create = asyncHandler(async (req, res) => {
  const data = validateBody(req.body, {
    branch_name:  { type: 'string', required: true, max: 100 },
    address:      { type: 'string', required: true, max: 255 },
    city:         { type: 'string', required: true, max: 80 },
    phone:        { type: 'string', required: true, pattern: /^[0-9]{10}$/, patternMessage: 'Phone must be a 10-digit number.' },
    manager_name: { type: 'string', required: true, max: 100 },
  });

  const result = await db.query(
    `INSERT INTO branches (branch_name, address, city, phone, manager_name)
     VALUES (?, ?, ?, ?, ?)`,
    [data.branch_name, data.address, data.city, data.phone, data.manager_name]);

  const rows = await db.query('SELECT * FROM branches WHERE branch_id = ?', [result.insertId]);
  res.status(201).json({ branch: rows[0] });
});

// PUT /api/branches/:id
const update = asyncHandler(async (req, res) => {
  const id = numericId(req.params.id, 'ID');
  const existing = await db.query('SELECT branch_id FROM branches WHERE branch_id = ?', [id]);
  if (!existing[0]) throw new ApiError(404, 'Branch not found.');

  const data = validateBody(req.body, {
    branch_name:  { type: 'string', required: true, max: 100 },
    address:      { type: 'string', required: true, max: 255 },
    city:         { type: 'string', required: true, max: 80 },
    phone:        { type: 'string', required: true, pattern: /^[0-9]{10}$/, patternMessage: 'Phone must be a 10-digit number.' },
    manager_name: { type: 'string', required: true, max: 100 },
  });

  await db.query(
    `UPDATE branches SET branch_name = ?, address = ?, city = ?, phone = ?, manager_name = ?
     WHERE branch_id = ?`,
    [data.branch_name, data.address, data.city, data.phone, data.manager_name, id]);

  const rows = await db.query('SELECT * FROM branches WHERE branch_id = ?', [id]);
  res.json({ branch: rows[0] });
});

// PATCH /api/branches/:id/status — deactivate (blocked when fleet still active there)
const updateStatus = asyncHandler(async (req, res) => {
  const id = numericId(req.params.id, 'ID');
  const { status } = validateBody(req.body, {
    status: { type: 'string', required: true, oneOf: ['ACTIVE', 'INACTIVE'] },
  });

  const rows = await db.query('SELECT status FROM branches WHERE branch_id = ?', [id]);
  if (!rows[0]) throw new ApiError(404, 'Branch not found.');

  if (status === 'INACTIVE') {
    const veh = await db.query(
      `SELECT COUNT(*) AS total FROM vehicles
       WHERE branch_id = ? AND status <> 'INACTIVE'`, [id]);
    if (veh[0].total > 0) {
      throw new ApiError(409, 'Branch still has active fleet vehicles. Move them first.');
    }
  }

  await db.query('UPDATE branches SET status = ? WHERE branch_id = ?', [status, id]);
  res.json({ branch_id: id, status });
});

module.exports = { list, getOne, create, update, updateStatus };
