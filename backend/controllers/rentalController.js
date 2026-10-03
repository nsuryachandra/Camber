// Rentals — the core business module.
// Creation runs the create_rental stored procedure inside a transaction;
// the procedure validates vehicle status + date overlap and prices the rental
// via the calculate_rental_amount stored function. The after-insert trigger
// flips the vehicle to RENTED. Return/cancel likewise run transactionally.
const db = require('../db/pool');
const { ApiError } = require('../db/errors');
const { asyncHandler } = require('../middleware/error');
const { validateBody } = require('../utils/validate');
const { numericId } = require('../utils/params');

const LIST_SELECT = `
  SELECT r.rental_id, r.customer_id, c.name AS customer_name, c.phone AS customer_phone,
         r.vehicle_id, v.registration_number, CONCAT(v.brand,' ',v.model) AS vehicle_name,
         r.branch_id, b.branch_name,
         r.pickup_date, r.expected_return_date, r.actual_return_date,
         r.rental_days, r.daily_rate, r.rental_amount, r.extra_charges,
         r.final_amount, r.vehicle_condition, r.status, r.notes, r.created_at,
         (SELECT COALESCE(SUM(p.amount),0) FROM payments p
           WHERE p.rental_id = r.rental_id AND p.payment_status = 'PAID') AS paid_amount
  FROM rentals r
  INNER JOIN customers c ON c.customer_id = r.customer_id
  INNER JOIN vehicles  v ON v.vehicle_id  = r.vehicle_id
  INNER JOIN branches  b ON b.branch_id   = r.branch_id
`;

// GET /api/rentals?search=&status=&page=&limit=
const list = asyncHandler(async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const offset = (page - 1) * limit;

  const where = [];
  const params = [];
  if (req.query.search) {
    where.push('(c.name LIKE ? OR v.registration_number LIKE ? OR r.rental_id = ?)');
    const like = `%${req.query.search}%`;
    params.push(like, like, Number(req.query.search) || 0);
  }
  if (req.query.status) { where.push('r.status = ?'); params.push(req.query.status); }
  const clause = where.length ? ` WHERE ${where.join(' AND ')}` : '';

  const countRows = await db.query(
    `SELECT COUNT(*) AS total FROM rentals r
     INNER JOIN customers c ON c.customer_id = r.customer_id
     INNER JOIN vehicles v ON v.vehicle_id = r.vehicle_id${clause}`, params);
  const total = countRows[0].total;

  const rows = await db.query(
    `${LIST_SELECT}${clause} ORDER BY r.rental_id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]);

  res.json({ data: rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

// GET /api/rentals/:id — detail incl. payment ledger
const getOne = asyncHandler(async (req, res) => {
  const rows = await db.query(`${LIST_SELECT} WHERE r.rental_id = ?`, [numericId(req.params.id, 'Rental')]);
  if (!rows[0]) throw new ApiError(404, 'Rental not found.');

  const payments = await db.query(
    `SELECT payment_id, amount, payment_date, payment_method, payment_status, reference_note
     FROM payments WHERE rental_id = ? ORDER BY payment_date DESC`, [numericId(req.params.id, 'Rental')]);

  res.json({ rental: rows[0], payments });
});

// POST /api/rentals — create booking via stored procedure + transaction
const create = asyncHandler(async (req, res) => {
  const data = validateBody(req.body, {
    customer_id: { type: 'int', required: true },
    vehicle_id:  { type: 'int', required: true },
    pickup_date: { type: 'date', required: true },
    expected_return_date: { type: 'date', required: true },
    notes:       { type: 'string', max: 500 },
  });

  const vehicleRows = await db.query(
    'SELECT branch_id FROM vehicles WHERE vehicle_id = ?', [data.vehicle_id]);
  if (!vehicleRows[0]) throw new ApiError(404, 'Vehicle not found.');
  const branchId = vehicleRows[0].branch_id;

  let rentalId;
  const conn = await db.pool.getConnection();
  try {
    await conn.query(
      'CALL create_rental(?, ?, ?, ?, ?, ?, @rental_id)',
      [data.customer_id, data.vehicle_id, branchId,
       data.pickup_date, data.expected_return_date, req.user.id]
    );
    const [outRows] = await conn.query('SELECT @rental_id AS rental_id');
    rentalId = outRows[0]?.rental_id;

    if (data.notes && rentalId) {
      await conn.query('UPDATE rentals SET notes = ? WHERE rental_id = ?', [data.notes, rentalId]);
    }
    if (rentalId) {
      await conn.query("UPDATE vehicles SET status = 'RENTED' WHERE vehicle_id = ?", [data.vehicle_id]);
    }
  } catch (err) {
    if (err.sqlState === '45000') {
      // Business rule from the procedure — readable message
      throw new ApiError(409, err.sqlMessage || 'Booking rejected by business rules.');
    }
    throw err;
  } finally {
    conn.release();
  }

  const rows = await db.query(`${LIST_SELECT} WHERE r.rental_id = ?`, [rentalId]);
  res.status(201).json({ rental: rows[0] });
});

// POST /api/rentals/:id/pickup — BOOKED → ACTIVE (vehicle handed over)
const pickup = asyncHandler(async (req, res) => {
  const id = numericId(req.params.id, 'ID');
  const rows = await db.query('SELECT status FROM rentals WHERE rental_id = ?', [id]);
  if (!rows[0]) throw new ApiError(404, 'Rental not found.');
  if (rows[0].status !== 'BOOKED') {
    throw new ApiError(409, 'Only booked rentals can be picked up.');
  }
  await db.query("UPDATE rentals SET status = 'ACTIVE' WHERE rental_id = ?", [id]);
  await db.query(
    "UPDATE vehicles SET status = 'RENTED' WHERE vehicle_id = (SELECT vehicle_id FROM rentals WHERE rental_id = ?)",
    [id]
  );
  res.json({ rental_id: id, status: 'ACTIVE' });
});

// POST /api/rentals/:id/return { condition, extra_charges, needs_maintenance }
// Runs the return_vehicle procedure in a transaction.
const returnVehicle = asyncHandler(async (req, res) => {
  const id = numericId(req.params.id, 'ID');
  const data = validateBody(req.body, {
    vehicle_condition: { type: 'string', required: true, oneOf: ['GOOD', 'FAIR', 'DAMAGED'] },
    extra_charges:     { type: 'decimal', default: 0 },
    needs_maintenance: { type: 'int', default: 0 },
  });
  if (data.extra_charges > 100000) throw new ApiError(400, 'Extra charges look invalid.');

  try {
    await db.query(
      'CALL return_vehicle(?, ?, ?, ?)',
      [id, data.vehicle_condition, data.extra_charges, data.needs_maintenance ? 1 : 0]
    );
  } catch (err) {
    if (err.sqlState === '45000') {
      throw new ApiError(409, err.sqlMessage || 'Return rejected by business rules.');
    }
    throw err;
  }

  const rows = await db.query(`${LIST_SELECT} WHERE r.rental_id = ?`, [id]);
  res.json({ rental: rows[0] });
});

// POST /api/rentals/:id/cancel
const cancel = asyncHandler(async (req, res) => {
  const id = numericId(req.params.id, 'ID');
  try {
    await db.query('CALL cancel_rental(?)', [id]);
    await db.query(
      "UPDATE vehicles SET status = 'AVAILABLE' WHERE vehicle_id = (SELECT vehicle_id FROM rentals WHERE rental_id = ?)",
      [id]
    );
  } catch (err) {
    if (err.sqlState === '45000') {
      throw new ApiError(409, err.sqlMessage || 'Cancellation rejected by business rules.');
    }
    throw err;
  }
  const rows = await db.query(`${LIST_SELECT} WHERE r.rental_id = ?`, [id]);
  res.json({ rental: rows[0] });
});

// POST /api/rentals/:id/approve — PENDING → BOOKED (Admin/Staff approval)
const approve = asyncHandler(async (req, res) => {
  const id = numericId(req.params.id, 'ID');
  const rows = await db.query('SELECT status, vehicle_id FROM rentals WHERE rental_id = ?', [id]);
  if (!rows[0]) throw new ApiError(404, 'Rental not found.');
  if (rows[0].status !== 'PENDING') {
    throw new ApiError(409, `Only pending rentals can be approved (currently ${rows[0].status}).`);
  }
  await db.query("UPDATE rentals SET status = 'BOOKED' WHERE rental_id = ?", [id]);
  await db.query("UPDATE vehicles SET status = 'RENTED' WHERE vehicle_id = ?", [rows[0].vehicle_id]);
  const updated = await db.query(`${LIST_SELECT} WHERE r.rental_id = ?`, [id]);
  res.json({ message: 'Booking agreement approved by staff.', rental: updated[0] });
});

module.exports = { list, getOne, create, pickup, returnVehicle, cancel, approve };
