// Maintenance — service/repair records. Starting maintenance sets the vehicle
// to MAINTENANCE (unless rented); completing it releases the vehicle.
const db = require('../db/pool');
const { ApiError } = require('../db/errors');
const { asyncHandler } = require('../middleware/error');
const { validateBody } = require('../utils/validate');
const { numericId } = require('../utils/params');
const { MAINTENANCE_TYPES } = require('../utils/constants');

const LIST_SELECT = `
  SELECT m.maintenance_id, m.vehicle_id, v.registration_number,
         CONCAT(v.brand,' ',v.model) AS vehicle_name, v.status AS vehicle_status,
         m.maintenance_type, m.description, m.maintenance_date, m.cost,
         m.service_provider, m.next_service_date, m.status, m.created_at
  FROM maintenance m
  INNER JOIN vehicles v ON v.vehicle_id = m.vehicle_id
`;

// GET /api/maintenance?search=&status=&type=&vehicle_id=&page=&limit=
const list = asyncHandler(async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const offset = (page - 1) * limit;

  const where = [];
  const params = [];
  if (req.query.status)    { where.push('m.status = ?'); params.push(req.query.status); }
  if (req.query.type)      { where.push('m.maintenance_type = ?'); params.push(req.query.type); }
  if (req.query.vehicle_id){ where.push('m.vehicle_id = ?'); params.push(Number(req.query.vehicle_id)); }
  if (req.query.search) {
    where.push('(v.registration_number LIKE ? OR m.description LIKE ? OR m.service_provider LIKE ?)');
    const like = `%${req.query.search}%`;
    params.push(like, like, like);
  }
  const clause = where.length ? ` WHERE ${where.join(' AND ')}` : '';

  const countRows = await db.query(
    `SELECT COUNT(*) AS total FROM maintenance m
     INNER JOIN vehicles v ON v.vehicle_id = m.vehicle_id${clause}`, params);
  const total = countRows[0].total;

  const rows = await db.query(
    `${LIST_SELECT}${clause} ORDER BY m.maintenance_id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]);

  res.json({ data: rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

// GET /api/maintenance/summary — aggregate costs by type (SQL aggregation)
const summary = asyncHandler(async (req, res) => {
  const rows = await db.query(
    `SELECT maintenance_type,
            COUNT(*) AS record_count,
            SUM(cost) AS total_cost,
            AVG(cost) AS avg_cost,
            MIN(cost) AS min_cost,
            MAX(cost) AS max_cost
     FROM maintenance GROUP BY maintenance_type`);
  res.json({ data: rows });
});

// POST /api/maintenance — starts a maintenance record (transactional)
const create = asyncHandler(async (req, res) => {
  const data = validateBody(req.body, {
    vehicle_id:       { type: 'int', required: true },
    maintenance_type: { type: 'string', required: true, oneOf: MAINTENANCE_TYPES },
    description:      { type: 'string', max: 500 },
    maintenance_date: { type: 'date', required: true },
    cost:             { type: 'decimal', default: 0 },
    service_provider: { type: 'string', max: 100 },
    next_service_date:{ type: 'date' },
  });

  let maintenanceId;
  await db.withTransaction(async (conn) => {
    const [veh] = await conn.query(
      'SELECT status FROM vehicles WHERE vehicle_id = ? FOR UPDATE', [data.vehicle_id]);
    if (!veh[0]) throw new ApiError(404, 'Vehicle not found.');
    if (veh[0].status === 'RENTED') {
      throw new ApiError(409, 'Vehicle is currently rented — complete the return before maintenance.');
    }

    const [result] = await conn.query(
      `INSERT INTO maintenance
        (vehicle_id, maintenance_type, description, maintenance_date, cost,
         service_provider, next_service_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'IN_PROGRESS')`,
      [data.vehicle_id, data.maintenance_type, data.description || null,
       data.maintenance_date, data.cost, data.service_provider || null,
       data.next_service_date || null]);
    maintenanceId = result.insertId;

    // Maintenance begins → vehicle enters MAINTENANCE state
    await conn.query(
      "UPDATE vehicles SET status = 'MAINTENANCE' WHERE vehicle_id = ?", [data.vehicle_id]);
  });

  const rows = await db.query(`${LIST_SELECT} WHERE m.maintenance_id = ?`, [maintenanceId]);
  res.status(201).json({ maintenance: rows[0] });
});

// PUT /api/maintenance/:id — edit record fields
const update = asyncHandler(async (req, res) => {
  const id = numericId(req.params.id, 'ID');
  const existing = await db.query('SELECT maintenance_id, status FROM maintenance WHERE maintenance_id = ?', [id]);
  if (!existing[0]) throw new ApiError(404, 'Maintenance record not found.');

  const data = validateBody(req.body, {
    maintenance_type: { type: 'string', required: true, oneOf: MAINTENANCE_TYPES },
    description:      { type: 'string', max: 500 },
    maintenance_date: { type: 'date', required: true },
    cost:             { type: 'decimal', default: 0 },
    service_provider: { type: 'string', max: 100 },
    next_service_date:{ type: 'date' },
  });

  await db.query(
    `UPDATE maintenance SET maintenance_type = ?, description = ?, maintenance_date = ?,
       cost = ?, service_provider = ?, next_service_date = ?
     WHERE maintenance_id = ?`,
    [data.maintenance_type, data.description || null, data.maintenance_date,
     data.cost, data.service_provider || null, data.next_service_date || null, id]);

  const rows = await db.query(`${LIST_SELECT} WHERE m.maintenance_id = ?`, [id]);
  res.json({ maintenance: rows[0] });
});

// PATCH /api/maintenance/:id/status { status }
// COMPLETED → vehicle AVAILABLE (only if not rented via another record)
// CANCELLED → vehicle AVAILABLE only if it was IN_PROGRESS
const updateStatus = asyncHandler(async (req, res) => {
  const id = numericId(req.params.id, 'ID');
  const { status } = validateBody(req.body, {
    status: { type: 'string', required: true, oneOf: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] },
  });

  await db.withTransaction(async (conn) => {
    const [rows] = await conn.query(
      'SELECT m.vehicle_id, m.status AS m_status, v.status AS v_status FROM maintenance m INNER JOIN vehicles v ON v.vehicle_id = m.vehicle_id WHERE m.maintenance_id = ? FOR UPDATE', [id]);
    if (!rows[0]) throw new ApiError(404, 'Maintenance record not found.');

    const { vehicle_id, m_status, v_status } = rows[0];

    if (status === 'IN_PROGRESS' && m_status === 'SCHEDULED') {
      await conn.query('UPDATE maintenance SET status = ? WHERE maintenance_id = ?', [status, id]);
      if (v_status !== 'MAINTENANCE' && v_status !== 'RENTED') {
        await conn.query("UPDATE vehicles SET status = 'MAINTENANCE' WHERE vehicle_id = ?", [vehicle_id]);
      }
    } else if (status === 'COMPLETED' || status === 'CANCELLED') {
      if (m_status === 'COMPLETED' || m_status === 'CANCELLED') {
        throw new ApiError(409, 'This maintenance record is already closed.');
      }
      await conn.query('UPDATE maintenance SET status = ? WHERE maintenance_id = ?', [status, id]);
      if (v_status === 'MAINTENANCE') {
        // Release the vehicle unless another open maintenance record exists
        const [open] = await conn.query(
          `SELECT COUNT(*) AS cnt FROM maintenance
           WHERE vehicle_id = ? AND maintenance_id <> ? AND status IN ('SCHEDULED','IN_PROGRESS')`,
          [vehicle_id, id]);
        if (open[0].cnt === 0) {
          await conn.query("UPDATE vehicles SET status = 'AVAILABLE' WHERE vehicle_id = ?", [vehicle_id]);
        }
      }
    }
  });

  const rows = await db.query(`${LIST_SELECT} WHERE m.maintenance_id = ?`, [id]);
  res.json({ maintenance: rows[0] });
});

module.exports = { list, summary, create, update, updateStatus };