// Payments — record payments against rentals, with receipt + outstanding views.
// Business rule enforced here: total PAID payments cannot exceed the rental's
// final_amount (checked inside the same transaction as the insert).
const db = require('../db/pool');
const { ApiError } = require('../db/errors');
const { asyncHandler } = require('../middleware/error');
const { validateBody } = require('../utils/validate');
const { numericId } = require('../utils/params');
const { PAYMENT_METHODS, PAYMENT_STATUSES } = require('../utils/constants');

const LIST_SELECT = `
  SELECT p.payment_id, p.rental_id, p.amount, p.payment_date,
         p.payment_method, p.payment_status, p.reference_note,
         c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email,
         v.registration_number, v.brand, v.model,
         CONCAT(v.brand,' ',v.model) AS vehicle_name, r.final_amount AS rental_amount,
         r.pickup_date, r.expected_return_date, r.rental_days, r.daily_rate,
         b.branch_name, b.city,
         (SELECT COALESCE(SUM(pp.amount),0) FROM payments pp
           WHERE pp.rental_id = p.rental_id AND pp.payment_status = 'PAID') AS paid_so_far
  FROM payments p
  INNER JOIN rentals r   ON r.rental_id = p.rental_id
  INNER JOIN customers c ON c.customer_id = r.customer_id
  INNER JOIN vehicles v  ON v.vehicle_id = r.vehicle_id
  INNER JOIN branches b  ON b.branch_id = r.branch_id
`;

// GET /api/payments?search=&status=&method=&page=&limit=   (outstanding=1 → PENDING only)
const list = asyncHandler(async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const offset = (page - 1) * limit;

  const where = [];
  const params = [];
  if (req.query.status)    { where.push('p.payment_status = ?'); params.push(req.query.status); }
  if (req.query.method)    { where.push('p.payment_method = ?'); params.push(req.query.method); }
  if (req.query.rental_id) { where.push('p.rental_id = ?'); params.push(Number(req.query.rental_id)); }
  if (req.query.search) {
    where.push('(c.name LIKE ? OR v.registration_number LIKE ? OR CAST(p.payment_id AS CHAR) LIKE ?)');
    const like = `%${req.query.search}%`;
    params.push(like, like, like);
  }
  const clause = where.length ? ` WHERE ${where.join(' AND ')}` : '';

  const countRows = await db.query(
    `SELECT COUNT(*) AS total FROM payments p
     INNER JOIN rentals r ON r.rental_id = p.rental_id
     INNER JOIN customers c ON c.customer_id = r.customer_id
     INNER JOIN vehicles v ON v.vehicle_id = r.vehicle_id${clause}`, params);
  const total = countRows[0].total;

  const rows = await db.query(
    `${LIST_SELECT}${clause} ORDER BY p.payment_id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]);

  res.json({ data: rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

// GET /api/payments/outstanding — rentals with unpaid balance (aggregates in SQL)
const outstanding = asyncHandler(async (req, res) => {
  const rows = await db.query(
    `SELECT r.rental_id, c.name AS customer_name, v.registration_number,
            CONCAT(v.brand,' ',v.model) AS vehicle_name,
            r.final_amount,
            COALESCE(SUM(CASE WHEN p.payment_status = 'PAID' THEN p.amount END), 0) AS paid_amount,
            r.final_amount - COALESCE(SUM(CASE WHEN p.payment_status = 'PAID' THEN p.amount END), 0) AS balance_due
     FROM rentals r
     INNER JOIN customers c ON c.customer_id = r.customer_id
     INNER JOIN vehicles  v ON v.vehicle_id = r.vehicle_id
     LEFT JOIN payments p  ON p.rental_id = r.rental_id
     WHERE r.status IN ('BOOKED','ACTIVE','COMPLETED')
     GROUP BY r.rental_id, customer_name, v.registration_number, vehicle_name, r.final_amount
     HAVING balance_due > 0
     ORDER BY r.rental_id DESC`);
  res.json({ data: rows });
});

// GET /api/payments/:id — receipt view (rental + customer + vehicle + ledger)
const getOne = asyncHandler(async (req, res) => {
  const id = numericId(req.params.id, 'ID');
  const rows = await db.query(`${LIST_SELECT} WHERE p.payment_id = ?`, [id]);
  if (!rows[0]) throw new ApiError(404, 'Payment not found.');

  const ledger = await db.query(
    `SELECT payment_id, amount, payment_date, payment_method, payment_status
     FROM payments WHERE rental_id = ? ORDER BY payment_date`, [rows[0].rental_id]);

  res.json({ payment: rows[0], ledger });
});

// POST /api/payments { rental_id, amount, payment_method, payment_status, reference_note }
const create = asyncHandler(async (req, res) => {
  const data = validateBody(req.body, {
    rental_id:      { type: 'int', required: true },
    amount:         { type: 'decimal', required: true },
    payment_method: { type: 'string', required: true, oneOf: PAYMENT_METHODS },
    payment_status: { type: 'string', oneOf: PAYMENT_STATUSES, default: 'PAID' },
    reference_note: { type: 'string', max: 200 },
  });

  let paymentId;
  await db.withTransaction(async (conn) => {
    const [rentalRows] = await conn.query(
      'SELECT final_amount, status FROM rentals WHERE rental_id = ? FOR UPDATE', [data.rental_id]);
    if (!rentalRows[0]) throw new ApiError(404, 'Rental not found.');
    if (rentalRows[0].status === 'CANCELLED') {
      throw new ApiError(409, 'Payments cannot be recorded against a cancelled rental.');
    }

    const [sumRows] = await conn.query(
      `SELECT COALESCE(SUM(amount),0) AS paid FROM payments
       WHERE rental_id = ? AND payment_status = 'PAID'`, [data.rental_id]);
    const paid = Number(sumRows[0].paid);
    const due = Number(rentalRows[0].final_amount) - paid;

    if (data.payment_status === 'PAID' && Number(data.amount) > due + 0.001) {
      throw new ApiError(409, `Payment exceeds the outstanding balance (₹${due.toFixed(2)} due).`);
    }

    const [result] = await conn.query(
      `INSERT INTO payments (rental_id, amount, payment_method, payment_status, reference_note)
       VALUES (?, ?, ?, ?, ?)`,
      [data.rental_id, data.amount, data.payment_method, data.payment_status, data.reference_note || null]
    );
    paymentId = result.insertId;
  });

  const rows = await db.query(`${LIST_SELECT} WHERE p.payment_id = ?`, [paymentId]);
  res.status(201).json({ payment: rows[0] });
});

// PATCH /api/payments/:id/status { status } — PENDING → PAID
const updateStatus = asyncHandler(async (req, res) => {
  const id = numericId(req.params.id, 'ID');
  const { status } = validateBody(req.body, {
    status: { type: 'string', required: true, oneOf: PAYMENT_STATUSES },
  });

  const rows = await db.query('SELECT payment_id, rental_id, amount, payment_status FROM payments WHERE payment_id = ?', [id]);
  if (!rows[0]) throw new ApiError(404, 'Payment not found.');
  if (rows[0].payment_status === status) {
    return res.json({ payment_id: id, status });
  }

  await db.withTransaction(async (conn) => {
    if (status === 'PAID') {
      const [sumRows] = await conn.query(
        `SELECT COALESCE(SUM(amount),0) AS paid FROM payments
         WHERE rental_id = ? AND payment_status = 'PAID' AND payment_id <> ?`,
        [rows[0].rental_id, id]);
      const [rentalRows] = await conn.query(
        'SELECT final_amount FROM rentals WHERE rental_id = ?', [rows[0].rental_id]);
      const due = Number(rentalRows[0].final_amount) - Number(sumRows[0].paid);
      if (Number(rows[0].amount) > due + 0.001) {
        throw new ApiError(409, `Marking this payment PAID would exceed the rental total (₹${due.toFixed(2)} due).`);
      }
    }
    await conn.query('UPDATE payments SET payment_status = ? WHERE payment_id = ?', [status, id]);
  });

  res.json({ payment_id: id, status });
});

module.exports = { list, outstanding, getOne, create, updateStatus };