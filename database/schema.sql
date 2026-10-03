-- ============================================================================
-- VEHICLE RENTAL & FLEET MANAGEMENT SYSTEM
-- schema.sql — Tables, relationships, constraints (MySQL 8.0+)
--
-- Design notes:
--   * All tables are in 3NF: no repeating groups, no partial dependencies,
--     no transitive dependencies (e.g. vehicle type name lives in
--     vehicle_types, referenced by vehicles.vehicle_type_id).
--   * Money is DECIMAL(10,2). Dates are DATE / DATETIME as appropriate.
--   * Status columns are ENUM so invalid states are rejected by MySQL.
-- ============================================================================

DROP DATABASE IF EXISTS vehicle_rental_db;
CREATE DATABASE vehicle_rental_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE vehicle_rental_db;

-- ----------------------------------------------------------------------------
-- 1. branches — rental office locations
-- ----------------------------------------------------------------------------
CREATE TABLE branches (
  branch_id    INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  branch_name  VARCHAR(100)  NOT NULL,
  address      VARCHAR(255)  NOT NULL,
  city         VARCHAR(80)   NOT NULL,
  phone        VARCHAR(15)   NOT NULL,
  manager_name VARCHAR(100)  NOT NULL,
  status       ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (branch_id),
  UNIQUE KEY uq_branches_name (branch_name),
  UNIQUE KEY uq_branches_phone (phone)
) ENGINE = InnoDB;

-- ----------------------------------------------------------------------------
-- 2. vehicle_types — lookup table (normalization: type names not repeated)
-- ----------------------------------------------------------------------------
CREATE TABLE vehicle_types (
  vehicle_type_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  type_name       VARCHAR(50)  NOT NULL,
  description     VARCHAR(255) NULL,
  PRIMARY KEY (vehicle_type_id),
  UNIQUE KEY uq_vehicle_types_name (type_name)
) ENGINE = InnoDB;

-- ----------------------------------------------------------------------------
-- 3. customers — people who rent vehicles
-- ----------------------------------------------------------------------------
CREATE TABLE customers (
  customer_id             INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  name                    VARCHAR(100)  NOT NULL,
  phone                   VARCHAR(15)   NOT NULL,
  email                   VARCHAR(150)  NULL,
  driving_license_number  VARCHAR(30)   NOT NULL,
  address                 VARCHAR(255)  NULL,
  registration_date       DATE          NOT NULL DEFAULT (CURRENT_DATE),
  status                  ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at              TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (customer_id),
  UNIQUE KEY uq_customers_phone  (phone),
  UNIQUE KEY uq_customers_license (driving_license_number),
  CONSTRAINT chk_customers_phone CHECK (phone REGEXP '^[0-9]{10}$'),
  CONSTRAINT chk_customers_email CHECK (email IS NULL OR email LIKE '%_@_%._%')
) ENGINE = InnoDB;

-- ----------------------------------------------------------------------------
-- 4. users — application logins (Admin / Staff / Customer roles)
-- ----------------------------------------------------------------------------
CREATE TABLE users (
  user_id       INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  customer_id   INT UNSIGNED     NULL,
  full_name     VARCHAR(100)     NOT NULL,
  email         VARCHAR(150)     NOT NULL,
  password_hash VARCHAR(255)     NOT NULL,
  role          ENUM('ADMIN','STAFF','CUSTOMER') NOT NULL DEFAULT 'STAFF',
  status        ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at    TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_email (email),
  CONSTRAINT fk_users_customer FOREIGN KEY (customer_id)
    REFERENCES customers (customer_id) ON DELETE SET NULL
) ENGINE = InnoDB;

-- ----------------------------------------------------------------------------
-- 5. vehicles — the fleet
-- ----------------------------------------------------------------------------
CREATE TABLE vehicles (
  vehicle_id           INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  registration_number  VARCHAR(20)    NOT NULL,
  brand                VARCHAR(50)    NOT NULL,
  model                VARCHAR(50)    NOT NULL,
  vehicle_type_id      INT UNSIGNED   NOT NULL,
  manufacturing_year   SMALLINT UNSIGNED NOT NULL,
  fuel_type            ENUM('PETROL','DIESEL','CNG','ELECTRIC','HYBRID') NOT NULL,
  transmission         ENUM('MANUAL','AUTOMATIC') NOT NULL DEFAULT 'MANUAL',
  seating_capacity     TINYINT UNSIGNED NOT NULL DEFAULT 5,
  rental_rate          DECIMAL(10,2)  NOT NULL,
  branch_id            INT UNSIGNED   NOT NULL,
  status               ENUM('AVAILABLE','RENTED','MAINTENANCE','INACTIVE')
                         NOT NULL DEFAULT 'AVAILABLE',
  created_at           TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (vehicle_id),
  UNIQUE KEY uq_vehicles_registration (registration_number),
  CONSTRAINT fk_vehicles_type   FOREIGN KEY (vehicle_type_id)
    REFERENCES vehicle_types (vehicle_type_id),
  CONSTRAINT fk_vehicles_branch FOREIGN KEY (branch_id)
    REFERENCES branches (branch_id),
  CONSTRAINT chk_vehicles_rate CHECK (rental_rate > 0),
  CONSTRAINT chk_vehicles_year CHECK (manufacturing_year BETWEEN 1990 AND 2100),
  CONSTRAINT chk_vehicles_seats CHECK (seating_capacity BETWEEN 1 AND 60)
) ENGINE = InnoDB;

-- ----------------------------------------------------------------------------
-- 6. rentals — booking / rental lifecycle
--    status: BOOKED (upcoming) → ACTIVE (picked up) → COMPLETED | CANCELLED
-- ----------------------------------------------------------------------------
CREATE TABLE rentals (
  rental_id           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  customer_id         INT UNSIGNED  NOT NULL,
  vehicle_id          INT UNSIGNED  NOT NULL,
  branch_id           INT UNSIGNED  NOT NULL,
  pickup_date         DATE          NOT NULL,
  expected_return_date DATE         NOT NULL,
  actual_return_date  DATE          NULL,
  rental_days         INT UNSIGNED  NOT NULL,
  daily_rate          DECIMAL(10,2) NOT NULL,
  rental_amount       DECIMAL(10,2) NOT NULL,
  extra_charges       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  final_amount        DECIMAL(10,2) NOT NULL,
  vehicle_condition   ENUM('GOOD','FAIR','DAMAGED') NULL,
  status              ENUM('BOOKED','ACTIVE','COMPLETED','CANCELLED')
                        NOT NULL DEFAULT 'BOOKED',
  notes               VARCHAR(500)  NULL,
  created_by          INT UNSIGNED  NULL,
  created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                      ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (rental_id),
  CONSTRAINT fk_rentals_customer FOREIGN KEY (customer_id)
    REFERENCES customers (customer_id),
  CONSTRAINT fk_rentals_vehicle  FOREIGN KEY (vehicle_id)
    REFERENCES vehicles (vehicle_id),
  CONSTRAINT fk_rentals_branch   FOREIGN KEY (branch_id)
    REFERENCES branches (branch_id),
  CONSTRAINT fk_rentals_user     FOREIGN KEY (created_by)
    REFERENCES users (user_id),
  CONSTRAINT chk_rentals_dates   CHECK (expected_return_date >= pickup_date),
  CONSTRAINT chk_rentals_days    CHECK (rental_days >= 1),
  CONSTRAINT chk_rentals_amount  CHECK (rental_amount >= 0 AND final_amount >= 0)
) ENGINE = InnoDB;

-- ----------------------------------------------------------------------------
-- 7. payments — money recorded against a rental
-- ----------------------------------------------------------------------------
CREATE TABLE payments (
  payment_id     INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  rental_id      INT UNSIGNED  NOT NULL,
  amount         DECIMAL(10,2) NOT NULL,
  payment_date   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  payment_method ENUM('CASH','CARD','UPI') NOT NULL,
  payment_status ENUM('PENDING','PAID')    NOT NULL DEFAULT 'PENDING',
  reference_note VARCHAR(200)  NULL,
  created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (payment_id),
  CONSTRAINT fk_payments_rental FOREIGN KEY (rental_id)
    REFERENCES rentals (rental_id),
  CONSTRAINT chk_payments_amount CHECK (amount > 0)
) ENGINE = InnoDB;

-- ----------------------------------------------------------------------------
-- 8. maintenance — service / repair records per vehicle
-- ----------------------------------------------------------------------------
CREATE TABLE maintenance (
  maintenance_id    INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  vehicle_id        INT UNSIGNED  NOT NULL,
  maintenance_type  ENUM('SERVICE','REPAIR','INSPECTION','TYRE','OTHER') NOT NULL,
  description       VARCHAR(500)  NULL,
  maintenance_date  DATE          NOT NULL,
  cost              DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  service_provider  VARCHAR(100)  NULL,
  next_service_date DATE          NULL,
  status            ENUM('SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED')
                      NOT NULL DEFAULT 'SCHEDULED',
  created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (maintenance_id),
  CONSTRAINT fk_maintenance_vehicle FOREIGN KEY (vehicle_id)
    REFERENCES vehicles (vehicle_id),
  CONSTRAINT chk_maintenance_cost CHECK (cost >= 0)
) ENGINE = InnoDB;

-- ----------------------------------------------------------------------------
-- Explicit secondary indexes are created in indexes.sql (kept separate so the
-- file can be inspected/re-run independently without duplicate-key errors).
-- Unique keys above already create backing indexes in InnoDB.
-- ----------------------------------------------------------------------------
