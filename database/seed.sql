-- ============================================================================
-- seed.sql — Essential Base System Data (Zero Fake / Mock Data)
-- Sets up initial administrator & staff accounts and standard vehicle categories.
-- Logins: admin@fleetpro.in / staff@fleetpro.in (Password: "Admin@123")
-- ============================================================================

USE vehicle_rental_db;

-- ---- Initial System Users --------------------------------------------------
INSERT INTO users (full_name, email, password_hash, role) VALUES
('Admin',  'admin@camber.in', '$2b$10$wN1Fv4B54bO8mF3i8z9mIe3wWnQ6CqW2F5d8h7t0lG9jH8k1m2n3a', 'ADMIN'),
('Staff',  'staff@camber.in', '$2b$10$wN1Fv4B54bO8mF3i8z9mIe3wWnQ6CqW2F5d8h7t0lG9jH8k1m2n3a', 'STAFF')
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);

-- ---- Standard Vehicle Categories ------------------------------------------
INSERT INTO vehicle_types (type_name, description) VALUES
('Hatchback', 'Compact city cars — e.g. Swift, i20, Baleno'),
('Sedan',     'Mid-size comfort cars — e.g. City, Verna, Ciaz'),
('SUV',       'Utility vehicles — e.g. Creta, Fortuner, Scorpio'),
('MUV',       'Multi-utility people movers — e.g. Ertiga, Innova'),
('Luxury',    'Premium segment — e.g. Camry, Superb, Audi'),
('Electric',  'EV Fleet — e.g. Nexon EV, ZS EV, Ioniq'),
('Tempo',     'Group travel vans — e.g. Tempo Traveller')
ON DUPLICATE KEY UPDATE description=VALUES(description);

-- ---- Branches (Hyderabad Active & Guntur Inactive) -----------------------
INSERT INTO branches (branch_id, branch_name, address, city, phone, manager_name, status) VALUES
(1, 'CAMBER Hyderabad Hub', 'Road No. 36, Jubilee Hills', 'Hyderabad', '040-23554400', 'Suryachandra', 'ACTIVE'),
(2, 'CAMBER Guntur Hub', 'Lakshmipuram Main Road', 'Guntur', '0863-2233440', 'Branch Desk', 'INACTIVE')
ON DUPLICATE KEY UPDATE branch_name=VALUES(branch_name), status=VALUES(status), city=VALUES(city);
