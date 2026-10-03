-- ============================================================================
-- views.sql — Virtual tables that encapsulate reusable SQL
--   * available_vehicles : only AVAILABLE vehicles with type + branch names
--   * active_rentals     : open rentals (BOOKED + ACTIVE) with names
--   * monthly_revenue    : revenue aggregated per month
--   * vehicle_utilization: rental counts per vehicle
-- ============================================================================

USE vehicle_rental_db;

-- 1. Vehicles that can be booked right now (INNER JOINs + status filter)
CREATE OR REPLACE VIEW available_vehicles AS
SELECT v.vehicle_id,
       v.registration_number,
       v.brand,
       v.model,
       t.type_name,
       v.fuel_type,
       v.transmission,
       v.rental_rate,
       v.seating_capacity,
       b.branch_name,
       v.status
FROM vehicles v
INNER JOIN vehicle_types t ON t.vehicle_type_id = v.vehicle_type_id
INNER JOIN branches b      ON b.branch_id       = v.branch_id
WHERE v.status = 'AVAILABLE';

-- 2. Open rentals — anything not finished/cancelled (multiple INNER JOINs)
CREATE OR REPLACE VIEW active_rentals AS
SELECT r.rental_id,
       r.customer_id,
       c.name             AS customer_name,
       c.phone            AS customer_phone,
       r.vehicle_id,
       v.registration_number,
       CONCAT(v.brand, ' ', v.model) AS vehicle_name,
       r.branch_id,
       br.branch_name,
       r.pickup_date,
       r.expected_return_date,
       r.actual_return_date,
       r.final_amount,
       r.rental_amount,
       r.extra_charges,
       r.status
FROM rentals r
INNER JOIN customers c ON c.customer_id = r.customer_id
INNER JOIN vehicles v  ON v.vehicle_id  = r.vehicle_id
INNER JOIN branches br ON br.branch_id  = r.branch_id
WHERE r.status IN ('BOOKED', 'ACTIVE');

-- 3. Revenue per month (aggregate view — powers dashboard + reports)
CREATE OR REPLACE VIEW monthly_revenue AS
SELECT DATE_FORMAT(p.payment_date, '%Y-%m') AS revenue_month,
       SUM(p.amount)                        AS total_revenue,
       COUNT(*)                             AS payment_count
FROM payments p
WHERE p.payment_status = 'PAID'
GROUP BY DATE_FORMAT(p.payment_date, '%Y-%m');

-- 4. Utilization per vehicle — how many times each vehicle has been rented
CREATE OR REPLACE VIEW vehicle_utilization AS
SELECT v.vehicle_id,
       v.registration_number,
       CONCAT(v.brand, ' ', v.model) AS vehicle_name,
       t.type_name,
       COUNT(r.rental_id)            AS total_rentals,
       COALESCE(SUM(CASE WHEN r.status = 'COMPLETED' THEN r.final_amount END), 0) AS total_revenue
FROM vehicles v
INNER JOIN vehicle_types t ON t.vehicle_type_id = v.vehicle_type_id
LEFT  JOIN rentals r       ON r.vehicle_id = v.vehicle_id
  AND r.status IN ('COMPLETED', 'ACTIVE')
GROUP BY v.vehicle_id, v.registration_number, vehicle_name, t.type_name;

-- 5. Outstanding (pending) payments with customer + vehicle context
CREATE OR REPLACE VIEW pending_payments AS
SELECT p.payment_id,
       p.rental_id,
       c.name             AS customer_name,
       v.registration_number,
       CONCAT(v.brand, ' ', v.model) AS vehicle_name,
       p.amount,
       p.payment_date,
       p.payment_method,
       p.payment_status,
       r.final_amount     AS rental_final_amount,
       COALESCE(SUM(pp.amount), 0) AS paid_so_far
FROM payments p
INNER JOIN rentals  r  ON r.rental_id  = p.rental_id
INNER JOIN customers c ON c.customer_id = r.customer_id
INNER JOIN vehicles  v  ON v.vehicle_id = r.vehicle_id
LEFT JOIN payments pp ON pp.rental_id = p.rental_id
  AND pp.payment_status = 'PAID'
GROUP BY p.payment_id, p.rental_id, c.name, v.registration_number,
         vehicle_name, p.amount, p.payment_date, p.payment_method,
         p.payment_status, r.final_amount;
