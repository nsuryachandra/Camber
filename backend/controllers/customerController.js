// Customers CRUD + rental history.
const db = require('../db/pool');
const { ApiError } = require('../db/errors');
const { asyncHandler } = require('../middleware/error');
const { validateBody } = require('../utils/validate');
const { numericId } = require('../utils/params');

const LIST_SELECT = `
  SELECT c.customer_id, c.name, c.phone, c.email, c.driving_license_number,
         c.address, c.registration_date, c.status,
         COUNT(r.rental_id) AS total_rentals,
         COALESCE(SUM(CASE WHEN r.status IN ('BOOKED','ACTIVE') THEN 1 ELSE 0 END), 0) AS active_rentals
  FROM customers c
  LEFT JOIN rentals r ON r.customer_id = c.customer_id
`;

// GET /api/customers?search=&status=&page=&limit=
const list = asyncHandler(async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const offset = (page - 1) * limit;

  const where = [];
  const params = [];
  if (req.query.search) {
    where.push('(c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ? OR c.driving_license_number LIKE ?)');
    const like = `%${req.query.search}%`;
    params.push(like, like, like, like);
  }
  if (req.query.status) { where.push('c.status = ?'); params.push(req.query.status); }
  const clause = where.length ? ` WHERE ${where.join(' AND ')}` : '';

  // With a LEFT JOIN + GROUP BY, count distinct customers
  const countRows = await db.query(
    `SELECT COUNT(DISTINCT c.customer_id) AS total FROM customers c${clause}`, params);
  const total = countRows[0].total;

  const rows = await db.query(
    `${LIST_SELECT}${clause}
     GROUP BY c.customer_id
     ORDER BY c.customer_id DESC
     LIMIT ? OFFSET ?`,
    params.concat([limit, offset])
  );

  res.json({ data: rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

// GET /api/customers/:id — profile + rental history (LEFT JOIN shows customers
// with zero rentals too)
const getOne = asyncHandler(async (req, res) => {
  const id = numericId(req.params.id, 'ID');
  const rows = await db.query(
    `SELECT c.*,
            COUNT(r.rental_id) AS total_rentals,
            COALESCE(SUM(CASE WHEN r.status = 'COMPLETED' THEN r.final_amount END), 0) AS lifetime_value
     FROM customers c
     LEFT JOIN rentals r ON r.customer_id = c.customer_id
     WHERE c.customer_id = ? GROUP BY c.customer_id`, [id]);
  if (!rows[0]) throw new ApiError(404, 'Customer not found.');

  const history = await db.query(
    `SELECT r.rental_id, v.registration_number, CONCAT(v.brand,' ',v.model) AS vehicle_name,
            r.pickup_date, r.expected_return_date, r.actual_return_date,
            r.final_amount, r.status
     FROM rentals r
     INNER JOIN vehicles v ON v.vehicle_id = r.vehicle_id
     WHERE r.customer_id = ?
     ORDER BY r.pickup_date DESC`, [id]);

  res.json({ customer: rows[0], history });
});

// POST /api/customers
const create = asyncHandler(async (req, res) => {
  const data = validateBody(req.body, {
    name:    { type: 'string', required: true, max: 100 },
    phone:   { type: 'string', required: true, pattern: /^[0-9]{10}$/, patternMessage: 'Phone must be a 10-digit number.' },
    email:   { type: 'string', max: 150, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, patternMessage: 'Enter a valid email address.' },
    driving_license_number: { type: 'string', required: true, max: 30 },
    address: { type: 'string', max: 255 },
  });

  const result = await db.query(
    `INSERT INTO customers (name, phone, email, driving_license_number, address)
     VALUES (?, ?, ?, ?, ?)`,
    [data.name, data.phone, data.email || null, data.driving_license_number, data.address || null]
  );

  const rows = await db.query('SELECT * FROM customers WHERE customer_id = ?', [result.insertId]);
  res.status(201).json({ customer: rows[0] });
});

// PUT /api/customers/:id
const update = asyncHandler(async (req, res) => {
  const id = numericId(req.params.id, 'ID');
  const existing = await db.query('SELECT customer_id FROM customers WHERE customer_id = ?', [id]);
  if (!existing[0]) throw new ApiError(404, 'Customer not found.');

  const data = validateBody(req.body, {
    name:    { type: 'string', required: true, max: 100 },
    phone:   { type: 'string', required: true, pattern: /^[0-9]{10}$/, patternMessage: 'Phone must be a 10-digit number.' },
    email:   { type: 'string', max: 150, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, patternMessage: 'Enter a valid email address.' },
    driving_license_number: { type: 'string', required: true, max: 30 },
    address: { type: 'string', max: 255 },
  });

  await db.query(
    `UPDATE customers SET name = ?, phone = ?, email = ?, driving_license_number = ?, address = ?
     WHERE customer_id = ?`,
    [data.name, data.phone, data.email || null, data.driving_license_number, data.address || null, id]
  );

  const rows = await db.query('SELECT * FROM customers WHERE customer_id = ?', [id]);
  res.json({ customer: rows[0] });
});

// PATCH /api/customers/:id/status { status } — deactivate/activate
const updateStatus = asyncHandler(async (req, res) => {
  const id = numericId(req.params.id, 'ID');
  const { status } = validateBody(req.body, {
    status: { type: 'string', required: true, oneOf: ['ACTIVE', 'INACTIVE'] },
  });

  const rows = await db.query('SELECT status FROM customers WHERE customer_id = ?', [id]);
  if (!rows[0]) throw new ApiError(404, 'Customer not found.');

  // Can't deactivate a customer with an open rental
  const open = await db.query(
    `SELECT COUNT(*) AS cnt FROM rentals
     WHERE customer_id = ? AND status IN ('BOOKED','ACTIVE')`, [id]);
  if (status === 'INACTIVE' && open[0].cnt > 0) {
    throw new ApiError(409, 'Customer has open rentals and cannot be deactivated.');
  }

  await db.query('UPDATE customers SET status = ? WHERE customer_id = ?', [status, id]);
  res.json({ customer_id: id, status });
});

module.exports = { list, getOne, create, update, updateStatus };