// Reports & analytics — every number here is computed by MySQL
// (aggregates, views, subqueries). React only renders the results.
const db = require('../db/pool');
const { asyncHandler } = require('../middleware/error');

// GET /api/reports/dashboard — KPI tiles + recent rentals + chart series
const dashboard = asyncHandler(async (req, res) => {
  // KPIs — one round-trip, subqueries over indexed columns
  const [kpiRows] = [await db.query(
    `SELECT
       (SELECT COUNT(*) FROM vehicles)                                            AS total_vehicles,
       (SELECT COUNT(*) FROM vehicles WHERE status = 'AVAILABLE')                 AS available_vehicles,
       (SELECT COUNT(*) FROM vehicles WHERE status = 'RENTED')                    AS rented_vehicles,
       (SELECT COUNT(*) FROM vehicles WHERE status = 'MAINTENANCE')               AS maintenance_vehicles,
       (SELECT COUNT(*) FROM vehicles WHERE status = 'INACTIVE')                  AS inactive_vehicles,
       (SELECT COUNT(*) FROM customers WHERE status = 'ACTIVE')                   AS total_customers,
       (SELECT COUNT(*) FROM rentals WHERE status IN ('BOOKED','ACTIVE'))         AS active_rentals,
       (SELECT COUNT(*) FROM payments WHERE payment_status = 'PENDING')           AS pending_payments,
       (SELECT COALESCE(SUM(amount),0) FROM payments WHERE payment_status='PAID') AS total_revenue,
       (SELECT COALESCE(SUM(cost),0) FROM maintenance WHERE status = 'COMPLETED') AS total_maintenance_cost
     FROM DUAL`)];

  const kpis = kpiRows[0];

  const recentRentals = await db.query(
    `SELECT r.rental_id, c.name AS customer_name, v.registration_number,
            CONCAT(v.brand,' ',v.model) AS vehicle_name,
            r.pickup_date, r.expected_return_date, r.final_amount, r.status
     FROM rentals r
     INNER JOIN customers c ON c.customer_id = r.customer_id
     INNER JOIN vehicles  v ON v.vehicle_id = r.vehicle_id
     ORDER BY r.rental_id DESC LIMIT 8`);

  // 1. Monthly revenue — last 6 months from the monthly_revenue view
  const monthlyRevenue = await db.query(
    `SELECT revenue_month, total_revenue, payment_count
     FROM monthly_revenue
     ORDER BY revenue_month DESC LIMIT 6`);

  // 2. Rentals by vehicle type (aggregate + join)
  const rentalsByType = await db.query(
    `SELECT t.type_name, COUNT(r.rental_id) AS rental_count,
            COALESCE(SUM(r.final_amount), 0) AS revenue
     FROM vehicle_types t
     LEFT JOIN vehicles v ON v.vehicle_type_id = t.vehicle_type_id
     LEFT JOIN rentals r  ON r.vehicle_id = v.vehicle_id
       AND r.status IN ('COMPLETED','ACTIVE')
     GROUP BY t.vehicle_type_id, t.type_name
     ORDER BY rental_count DESC`);

  // 4. Branch telemetry (Hub status & vehicle allocation)
  const branchTelemetry = await db.query(
    `SELECT b.branch_id, b.branch_name, b.city, b.status, b.manager_name,
            COUNT(v.vehicle_id) AS total_vehicles,
            COALESCE(SUM(v.status = 'AVAILABLE'), 0) AS available_vehicles
     FROM branches b
     LEFT JOIN vehicles v ON v.branch_id = b.branch_id
     GROUP BY b.branch_id, b.branch_name, b.city, b.status, b.manager_name
     ORDER BY b.branch_id ASC`);

  // 5. Featured lot fleet (top available chassis ready for dispatch)
  const availableFleet = await db.query(
    `SELECT v.vehicle_id, v.brand, v.model, v.registration_number, v.rental_rate,
            v.fuel_type, v.transmission, v.seating_capacity, t.type_name, b.branch_name
     FROM vehicles v
     INNER JOIN vehicle_types t ON t.vehicle_type_id = v.vehicle_type_id
     INNER JOIN branches b ON b.branch_id = v.branch_id
     WHERE v.status = 'AVAILABLE'
     ORDER BY v.rental_rate DESC LIMIT 6`);

  // 6. Fleet status distribution
  const fleetStatus = await db.query(
    `SELECT status, COUNT(*) AS count FROM vehicles GROUP BY status`);

  res.json({
    kpis,
    recent_rentals: recentRentals,
    branches: branchTelemetry,
    available_fleet: availableFleet,
    charts: { monthly_revenue: monthlyRevenue.reverse(), rentals_by_type: rentalsByType, fleet_status: fleetStatus },
  });
});

// GET /api/reports/fleet — vehicles by status / type / branch
const fleet = asyncHandler(async (req, res) => {
  const byStatus = await db.query(
    `SELECT status, COUNT(*) AS count FROM vehicles GROUP BY status`);

  const byType = await db.query(
    `SELECT t.type_name,
            COUNT(v.vehicle_id) AS total,
            COALESCE(SUM(v.status='AVAILABLE'),0) AS available,
            COALESCE(AVG(v.rental_rate),0) AS avg_rate,
            MIN(v.rental_rate) AS min_rate,
            MAX(v.rental_rate) AS max_rate
     FROM vehicle_types t
     LEFT JOIN vehicles v ON v.vehicle_type_id = t.vehicle_type_id
     GROUP BY t.vehicle_type_id, t.type_name
     ORDER BY total DESC`);

// GET /api/reports/rentals — counts by status, top customers, duration stats
const rentals = asyncHandler(async (req, res) => {
  const byStatus = await db.query(
    `SELECT status, COUNT(*) AS count, COALESCE(SUM(final_amount),0) AS amount
     FROM rentals GROUP BY status`);

  const topCustomers = await db.query(
    `SELECT c.customer_id, c.name, c.phone,
            COUNT(r.rental_id) AS total_rentals,
            COALESCE(SUM(CASE WHEN r.status='COMPLETED' THEN r.final_amount END),0) AS total_spent
     FROM customers c
     INNER JOIN rentals r ON r.customer_id = c.customer_id
     GROUP BY c.customer_id, c.name, c.phone
     ORDER BY total_rentals DESC, total_spent DESC
     LIMIT 10`);

  // Subquery: customers who have never rented (LEFT JOIN anti-join pattern)
  const neverRented = await db.query(
    `SELECT c.name, c.phone FROM customers c
     WHERE c.customer_id NOT IN (SELECT DISTINCT customer_id FROM rentals)`);

  const durationStats = await db.query(
    `SELECT MIN(rental_days) AS min_days, MAX(rental_days) AS max_days,
            AVG(rental_days) AS avg_days, COUNT(*) AS total
     FROM rentals WHERE status = 'COMPLETED'`);

  res.json({ by_status: byStatus, top_customers: topCustomers, never_rented: neverRented, duration_stats: durationStats[0] });
});

// GET /api/reports/revenue — daily, monthly, by type, by branch, pending
const revenue = asyncHandler(async (req, res) => {
  const days = Math.min(90, Math.max(7, parseInt(req.query.days, 10) || 30));

  const daily = await db.query(
    `SELECT DATE(payment_date) AS revenue_date, SUM(amount) AS total, COUNT(*) AS payments
     FROM payments
     WHERE payment_status = 'PAID' AND payment_date >= CURRENT_DATE - INTERVAL ? DAY
     GROUP BY DATE(payment_date)
     ORDER BY revenue_date`, [days]);

  const monthly = await db.query(
    `SELECT revenue_month, total_revenue, payment_count FROM monthly_revenue
     ORDER BY revenue_month DESC LIMIT 12`);

  const byType = await db.query(
    `SELECT t.type_name, COALESCE(SUM(r.final_amount),0) AS revenue, COUNT(r.rental_id) AS rentals
     FROM rentals r
     INNER JOIN vehicles v ON v.vehicle_id = r.vehicle_id
     INNER JOIN vehicle_types t ON t.vehicle_type_id = v.vehicle_type_id
     WHERE r.status = 'COMPLETED'
     GROUP BY t.vehicle_type_id, t.type_name
     ORDER BY revenue DESC`);

  const byBranch = await db.query(
    `SELECT b.branch_name, b.city, COALESCE(SUM(r.final_amount),0) AS revenue, COUNT(r.rental_id) AS rentals
     FROM rentals r
     INNER JOIN branches b ON b.branch_id = r.branch_id
     WHERE r.status = 'COMPLETED'
     GROUP BY b.branch_id, b.branch_name, b.city
     ORDER BY revenue DESC`);