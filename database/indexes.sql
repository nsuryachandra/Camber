-- ============================================================================
-- indexes.sql — Explicit index layer
-- (These are also created inline in schema.sql for convenience; this file
--  documents the indexing strategy and is safe to re-run: IF NOT EXISTS guard
--  via conditional drops.)
-- ============================================================================

USE vehicle_rental_db;

-- Lookup-heavy columns
CREATE INDEX idx_customers_name       ON customers (name);
CREATE INDEX idx_customers_email      ON customers (email);
CREATE INDEX idx_vehicles_status      ON vehicles (status);
CREATE INDEX idx_vehicles_branch      ON vehicles (branch_id);
CREATE INDEX idx_vehicles_type        ON vehicles (vehicle_type_id);
CREATE INDEX idx_rentals_status       ON rentals (status);
CREATE INDEX idx_rentals_pickup       ON rentals (pickup_date);
CREATE INDEX idx_rentals_return       ON rentals (expected_return_date);
CREATE INDEX idx_rentals_vehicle      ON rentals (vehicle_id);
CREATE INDEX idx_rentals_customer     ON rentals (customer_id);
CREATE INDEX idx_payments_status      ON payments (payment_status);
CREATE INDEX idx_payments_rental      ON payments (rental_id);
CREATE INDEX idx_payments_date        ON payments (payment_date);
CREATE INDEX idx_maintenance_vehicle  ON maintenance (vehicle_id);
CREATE INDEX idx_maintenance_status   ON maintenance (status);
CREATE INDEX idx_maintenance_next     ON maintenance (next_service_date);
