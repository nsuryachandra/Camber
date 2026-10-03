// Customer Portal Controller — public catalogue, customer-specific bookings, profile, and rental lifecycle.
const db = require('../db/pool');
const { ApiError } = require('../db/errors');
const { asyncHandler } = require('../middleware/error');
const { validateBody } = require('../utils/validate');
const { numericId } = require('../utils/params');

// GET /api/public/meta — Public branches and vehicle categories
const publicMeta = asyncHandler(async (req, res) => {
  const branches = await db.query(
    `SELECT branch_id, branch_name, address, city, phone FROM branches WHERE status = 'ACTIVE' ORDER BY branch_name`
  );
  const vehicleTypes = await db.query(
    `SELECT vehicle_type_id, type_name, description FROM vehicle_types ORDER BY type_name`
  );
  res.json({ branches, vehicle_types: vehicleTypes });
});

// GET /api/public/vehicles — Public fleet showroom with filtering
const publicVehicles = asyncHandler(async (req, res) => {
  const { search, type, branch, fuel, transmission, maxRate } = req.query;
  const where = ["v.status = 'AVAILABLE'"];
  const params = [];

  if (search) {
    where.push('(v.brand LIKE ? OR v.model LIKE ? OR t.type_name LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  if (type) {
    where.push('v.vehicle_type_id = ?');
    params.push(Number(type));
  }
  if (branch) {
    where.push('v.branch_id = ?');
    params.push(Number(branch));
  }
  if (fuel) {
    where.push('v.fuel_type = ?');
    params.push(fuel);
  }
  if (transmission) {
    where.push('v.transmission = ?');
    params.push(transmission);
  }
  if (maxRate) {
    where.push('v.rental_rate <= ?');
    params.push(Number(maxRate));
  }

  const clause = ` WHERE ${where.join(' AND ')}`;
  const rows = await db.query(
    `SELECT v.vehicle_id, v.registration_number, v.brand, v.model,
            v.manufacturing_year, v.fuel_type, v.transmission, v.seating_capacity,
            v.rental_rate, v.status,
            t.vehicle_type_id, t.type_name,
            b.branch_id, b.branch_name, b.city, b.address AS branch_address, b.phone AS branch_phone
     FROM vehicles v
     INNER JOIN vehicle_types t ON t.vehicle_type_id = v.vehicle_type_id
     INNER JOIN branches b      ON b.branch_id       = v.branch_id
     ${clause}
     ORDER BY v.rental_rate ASC`,
    params
  );

  res.json({ data: rows });
});

// GET /api/public/vehicles/:id — Detailed specifications for single vehicle
const publicVehicleDetail = asyncHandler(async (req, res) => {
  const id = numericId(req.params.id, 'Vehicle ID');
  const rows = await db.query(
    `SELECT v.vehicle_id, v.registration_number, v.brand, v.model,
            v.manufacturing_year, v.fuel_type, v.transmission, v.seating_capacity,
            v.rental_rate, v.status,
            t.vehicle_type_id, t.type_name, t.description AS type_description,
            b.branch_id, b.branch_name, b.city, b.address AS branch_address, b.phone AS branch_phone
     FROM vehicles v
     INNER JOIN vehicle_types t ON t.vehicle_type_id = v.vehicle_type_id
     INNER JOIN branches b      ON b.branch_id       = v.branch_id
     WHERE v.vehicle_id = ?`,
    [id]
  );
  if (!rows[0]) throw new ApiError(404, 'Vehicle not found.');
  res.json({ vehicle: rows[0] });
});

// GET /api/customer/rentals — Customer's own bookings
const getMyRentals = asyncHandler(async (req, res) => {
  const customerId = req.user.customer_id;
  if (!customerId) throw new ApiError(403, 'Customer profile is required to view personal bookings.');

  const rows = await db.query(
    `SELECT r.rental_id, r.customer_id, r.vehicle_id, r.branch_id,
            r.pickup_date, r.expected_return_date, r.actual_return_date,
            r.rental_days, r.daily_rate, r.rental_amount, r.extra_charges, r.final_amount,
            r.vehicle_condition, r.status, r.notes, r.created_at,
            v.registration_number, v.brand, v.model, v.fuel_type, v.transmission, v.seating_capacity,
            t.type_name,
            b.branch_name, b.city, b.phone AS branch_phone, b.address AS branch_address,
            (SELECT COALESCE(SUM(p.amount),0) FROM payments p WHERE p.rental_id = r.rental_id AND p.payment_status = 'PAID') AS paid_amount
     FROM rentals r
     INNER JOIN vehicles v     ON v.vehicle_id = r.vehicle_id
     INNER JOIN vehicle_types t ON t.vehicle_type_id = v.vehicle_type_id
     INNER JOIN branches b     ON b.branch_id = r.branch_id
     WHERE r.customer_id = ?
     ORDER BY r.rental_id DESC`,
    [customerId]
  );

  res.json({ data: rows });
});

// POST /api/customer/book — Customer books a vehicle directly
const bookVehicle = asyncHandler(async (req, res) => {
  const customerId = req.user.customer_id;
  if (!customerId) throw new ApiError(403, 'Customer registration is required before booking.');

  const body = validateBody(req.body, {
    vehicle_id:           { type: 'number', required: true },
    pickup_date:          { type: 'date',   required: true },
    expected_return_date: { type: 'date',   required: true },
    notes:                { type: 'string', max: 500 },
    simulate_payment:     { type: 'boolean' },
    payment_method:       { type: 'string' },
    payment_reference:    { type: 'string' },
  });

  const pickup = new Date(body.pickup_date);
  const ret    = new Date(body.expected_return_date);
  if (ret < pickup) throw new ApiError(400, 'Expected return date cannot be before pickup date.');

  // Fetch branch_id for the vehicle
  const vehRows = await db.query(
    'SELECT vehicle_id, branch_id, rental_rate, status FROM vehicles WHERE vehicle_id = ?',
    [body.vehicle_id]
  );
  if (!vehRows[0]) throw new ApiError(404, 'Vehicle not found.');
  const vehicle = vehRows[0];

  // Authoritative database rental transaction via stored procedure:
  // Serializes concurrent requests with SELECT ... FOR UPDATE, enforces date overlap,
  // computes pricing via calculate_rental_amount, inserts rental in BOOKED status,
  // and fires after_rental_insert trigger to mark vehicle as RENTED.
  let rentalId;
  const conn = await db.pool.getConnection();
  try {
    await conn.query(
      'CALL create_rental(?, ?, ?, ?, ?, ?, @rental_id)',
      [
        customerId,
        body.vehicle_id,
        vehicle.branch_id,
        body.pickup_date,
        body.expected_return_date,
        req.user.id || null,
      ]
    );
    const [outRows] = await conn.query('SELECT @rental_id AS rental_id');
    rentalId = outRows[0]?.rental_id;

    if (body.notes && rentalId) {
      await conn.query('UPDATE rentals SET notes = ? WHERE rental_id = ?', [body.notes, rentalId]);
    }

    // Set new customer online booking status to PENDING approval by Admin/Staff
    await conn.query("UPDATE rentals SET status = 'PENDING' WHERE rental_id = ?", [rentalId]);

    const [rentalRows] = await conn.query(
      'SELECT rental_id, rental_days, final_amount, status FROM rentals WHERE rental_id = ?',
      [rentalId]
    );
    const rental = rentalRows[0];

    let paymentId = null;
    if (body.simulate_payment && rentalId) {
      const pMethod = body.payment_method || 'CARD';
      const pRef = body.payment_reference || `Online FastPay Ref #PG_${Date.now().toString().slice(-6)}`;
      const [payRes] = await conn.query(
        `INSERT INTO payments (rental_id, amount, payment_date, payment_method, payment_status, reference_note)
         VALUES (?, ?, NOW(), ?, 'PAID', ?)`,
        [rentalId, rental.final_amount, pMethod, pRef]
      );
      paymentId = payRes.insertId;
    }

    res.status(201).json({
      message: 'Booking confirmed successfully!',
      rental_id: rental.rental_id,
      rental_days: rental.rental_days,
      final_amount: rental.final_amount,
      status: rental.status,
      payment_id: paymentId,
      is_paid: Boolean(paymentId),
    });
  } catch (err) {
    if (err.sqlState === '45000') {
      throw new ApiError(409, err.sqlMessage || 'Booking rejected by business rules.');
    }
    throw err;
  } finally {
    conn.release();
  }
});

// POST /api/customer/rentals/:id/pay — Settle balance on an existing booking
const payRental = asyncHandler(async (req, res) => {
  const customerId = req.user.customer_id;
  const rentalId = numericId(req.params.id, 'Rental ID');
  const body = validateBody(req.body, {
    payment_method:    { type: 'string', required: true },
    payment_reference: { type: 'string', max: 255 },
  });

  const [rentalRows] = await db.query(
    'SELECT rental_id, final_amount, status FROM rentals WHERE rental_id = ? AND customer_id = ?',
    [rentalId, customerId]
  );
  if (!rentalRows || rentalRows.length === 0) {
    throw new ApiError(404, 'Booking not found or does not belong to your account.');
  }
  const rental = rentalRows[0];

  const [paidRows] = await db.query(
    'SELECT COALESCE(SUM(amount), 0) AS paid FROM payments WHERE rental_id = ? AND payment_status = "PAID"',
    [rentalId]
  );
  const paid = Number(paidRows[0]?.paid || 0);
  const balance = Math.max(0, Number(rental.final_amount) - paid);
  if (balance <= 0) {
    throw new ApiError(400, 'This booking has already been paid in full.');
  }

  const pMethod = body.payment_method || 'CARD';
  const pRef = body.payment_reference || `Instant Escrow Settle Ref #PG_${Date.now().toString().slice(-6)}`;

  const [payRes] = await db.query(
    `INSERT INTO payments (rental_id, amount, payment_date, payment_method, payment_status, reference_note)
     VALUES (?, ?, NOW(), ?, 'PAID', ?)`,
    [rentalId, balance, pMethod, pRef]
  );

  res.status(201).json({
    message: 'Payment settled successfully!',
    payment_id: payRes.insertId,
    amount: balance,
    payment_status: 'PAID',
  });
});

// POST /api/customer/rentals/:id/cancel — Customer cancels their upcoming booking
const cancelBooking = asyncHandler(async (req, res) => {
  const customerId = req.user.customer_id;
  const rentalId = numericId(req.params.id, 'Rental ID');

  const rows = await db.query(
    'SELECT rental_id, status FROM rentals WHERE rental_id = ? AND customer_id = ?',
    [rentalId, customerId]
  );
  if (!rows[0]) throw new ApiError(404, 'Booking not found or does not belong to your account.');

  if (rows[0].status !== 'BOOKED' && rows[0].status !== 'PENDING') {
    throw new ApiError(400, `Only upcoming reservations in BOOKED or PENDING status can be cancelled (current status: ${rows[0].status}).`);
  }

  try {
    await db.query('CALL cancel_rental(?)', [rentalId]);
  } catch (err) {
    if (err.sqlState === '45000') {
      throw new ApiError(409, err.sqlMessage || 'Cancellation rejected by business rules.');
    }
    throw err;
  }

  res.json({ message: 'Booking has been successfully cancelled.' });
});

// GET /api/customer/profile — Get full customer profile and lifetime statistics
const getProfile = asyncHandler(async (req, res) => {
  const customerId = req.user.customer_id;
  if (!customerId) {
    const userRows = await db.query(
      'SELECT user_id, full_name AS name, email, role, status, created_at FROM users WHERE user_id = ?',
      [req.user.id]
    );
    if (!userRows[0]) throw new ApiError(404, 'User account not found.');
    return res.json({
      customer: {
        customer_id: null,
        name: userRows[0].name,
        email: userRows[0].email,
        phone: 'Operations Desk',
        driving_license_number: `${userRows[0].role}-STAFF-CLEARANCE`,
        address: 'CAMBER Mobility Operations Desk',
        registration_date: userRows[0].created_at,
        status: userRows[0].status,
        role: userRows[0].role,
      },
      stats: {
        total_trips: 0,
        total_spent: 0,
        active_trips: 0,
        upcoming_trips: 0,
      },
      is_staff: true,
    });
  }

  const rows = await db.query(
    `SELECT customer_id, name, phone, email, driving_license_number, address, registration_date, status
     FROM customers WHERE customer_id = ?`,
    [customerId]
  );
  if (!rows[0]) throw new ApiError(404, 'Customer record not found.');

  const stats = await db.query(
    `SELECT COUNT(*) AS total_trips,
            COALESCE((
              SELECT SUM(p.amount)
              FROM payments p
              INNER JOIN rentals r2 ON r2.rental_id = p.rental_id
              WHERE r2.customer_id = ? AND p.payment_status = 'PAID'
            ), 0) AS total_spent,
            COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END), 0) AS completed_trips,
            COALESCE(SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END), 0) AS active_trips,
            COALESCE(SUM(CASE WHEN status IN ('BOOKED', 'PENDING') THEN 1 ELSE 0 END), 0) AS upcoming_trips
     FROM rentals WHERE customer_id = ?`,
    [customerId, customerId]
  );

  res.json({ customer: rows[0], stats: stats[0] });
});

// PUT /api/customer/profile — Customer updates own details
const updateProfile = asyncHandler(async (req, res) => {
  const customerId = req.user.customer_id;
  if (!customerId) {
    const data = validateBody(req.body, {
      name: { type: 'string', required: true, max: 100 },
    });
    await db.query('UPDATE users SET full_name = ? WHERE user_id = ?', [data.name, req.user.id]);
    return res.json({ message: 'User profile updated successfully.' });
  }

  const data = validateBody(req.body, {
    name:                   { type: 'string', required: true, max: 100 },
    phone:                  { type: 'string', required: true, pattern: /^[0-9]{10}$/, patternMessage: 'Phone must be 10 digits.' },
    driving_license_number: { type: 'string', required: true, min: 5, max: 30 },
    address:                { type: 'string', max: 255 },
  });

  // Check unique phone collision with other customers
  const phoneCheck = await db.query(
    'SELECT customer_id FROM customers WHERE phone = ? AND customer_id != ?',
    [data.phone, customerId]
  );
  if (phoneCheck.length) throw new ApiError(409, 'This phone number is registered to another account.');

  // Check unique license collision
  const licCheck = await db.query(
    'SELECT customer_id FROM customers WHERE driving_license_number = ? AND customer_id != ?',
    [data.driving_license_number, customerId]
  );
  if (licCheck.length) throw new ApiError(409, 'This driving license is registered to another account.');

  await db.withTransaction(async (conn) => {
    await conn.execute(
      `UPDATE customers
       SET name = ?, phone = ?, driving_license_number = ?, address = ?
       WHERE customer_id = ?`,
      [data.name, data.phone, data.driving_license_number.toUpperCase(), data.address || null, customerId]
    );
    await conn.execute(
      `UPDATE users SET full_name = ? WHERE customer_id = ?`,
      [data.name, customerId]
    );
  });

  res.json({ message: 'Profile updated successfully.' });
});

module.exports = {
  publicMeta,
  publicVehicles,
  publicVehicleDetail,
  getMyRentals,
  bookVehicle,
  payRental,
  cancelBooking,
  getProfile,
  updateProfile,
};
