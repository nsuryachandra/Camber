-- ============================================================================
-- adbms_demonstration.sql — FleetPro Academic Reference & Demonstration Script
-- Subject: Advanced Database Management Systems (ADBMS)
-- Coverage: Module 1 (Relational Algebra & EER), Module 2 (Normalization & FDs),
--           Module 4 (Transactions, ACID, & Concurrency Control)
--
-- This script runs strictly against the existing FleetPro production schema.
-- It does NOT create dummy tables, alter schemas, or corrupt production data.
-- All queries are valid, executable MySQL 8.0+ statements.
-- ============================================================================

USE vehicle_rental_db;

-- ############################################################################
-- MODULE 1: RELATIONAL QUERY LANGUAGES & EXTENDED ER (EER) MODEL
-- ############################################################################

-- ----------------------------------------------------------------------------
-- 1.1 RELATIONAL ALGEBRA: SELECTION (sigma: σ)
-- Concept: Filters rows satisfying a predicate condition: σ_{condition}(R)
-- ----------------------------------------------------------------------------

-- Query 1.1.1: Selection of all vehicles that are currently AVAILABLE with rental_rate <= 3000
-- Algebra: σ_{status = 'AVAILABLE' ∧ rental_rate <= 3000}(vehicles)
SELECT *
FROM vehicles
WHERE status = 'AVAILABLE'
  AND rental_rate <= 3000;

-- Query 1.1.2: Selection of rentals where extra charges were applied
-- Algebra: σ_{extra_charges > 0}(rentals)
SELECT *
FROM rentals
WHERE extra_charges > 0;

-- ----------------------------------------------------------------------------
-- 1.2 RELATIONAL ALGEBRA: PROJECTION (pi: π)
-- Concept: Extracts specific attribute columns: π_{attribute_list}(R)
-- ----------------------------------------------------------------------------

-- Query 1.2.1: Projection of vehicle identity, brand, model, and current rate
-- Algebra: π_{registration_number, brand, model, rental_rate, status}(vehicles)
SELECT registration_number, brand, model, rental_rate, status
FROM vehicles;

-- Query 1.2.2: Projection of customer contact details
-- Algebra: π_{customer_id, name, phone, email}(customers)
SELECT customer_id, name, phone, email
FROM customers;

-- ----------------------------------------------------------------------------
-- 1.3 RELATIONAL ALGEBRA: NATURAL / INNER JOIN (bowtie: ⋈)
-- Concept: Combines related tuples from multiple relations based on join predicate
-- ----------------------------------------------------------------------------

-- Query 1.3.1: 4-Way Relational Composition: Customers ⋈ Rentals ⋈ Vehicles ⋈ Branches
-- Algebra: customers ⋈_{customers.customer_id = rentals.customer_id}
--          rentals   ⋈_{rentals.vehicle_id = vehicles.vehicle_id}
--          vehicles  ⋈_{vehicles.branch_id = branches.branch_id}
SELECT
    r.rental_id,
    c.name                AS customer_name,
    c.phone               AS customer_phone,
    v.registration_number,
    CONCAT(v.brand, ' ', v.model) AS vehicle_name,
    b.branch_name         AS pickup_branch,
    r.pickup_date,
    r.expected_return_date,
    r.final_amount,
    r.status              AS rental_status
FROM rentals r
INNER JOIN customers c ON c.customer_id = r.customer_id
INNER JOIN vehicles  v ON v.vehicle_id  = r.vehicle_id
INNER JOIN branches  b ON b.branch_id   = r.branch_id
ORDER BY r.rental_id DESC;

-- ----------------------------------------------------------------------------
-- 1.4 RELATIONAL ALGEBRA: SET UNION (cup: ∪)
-- Concept: Combines tuples from two union-compatible relations (same degree & domains)
-- ----------------------------------------------------------------------------

-- Query 1.4.1: Unified Contact Directory combining Staff Users and Registered Customers
-- Result sets have identical attribute count and domain compatibility: (VARCHAR, VARCHAR, VARCHAR)
SELECT
    full_name AS contact_name,
    email     AS contact_email,
    'SYSTEM_STAFF' AS account_type
FROM users
WHERE role IN ('ADMIN', 'STAFF')

UNION

SELECT
    name      AS contact_name,
    email     AS contact_email,
    'PORTAL_CUSTOMER' AS account_type
FROM customers;

-- ----------------------------------------------------------------------------
-- 1.5 RELATIONAL ALGEBRA: CARTESIAN PRODUCT (cross: ×)
-- Concept: Pairwise combination of all tuples in relation R with all tuples in S: R × S
-- Academic note: Cross join generates |R| * |S| tuples. In vehicle fleet management,
-- this represents the theoretical matrix of every branch offering every vehicle category.
-- ----------------------------------------------------------------------------

-- Query 1.5.1: Theoretical Branch Category Offering Matrix
-- Card(branches) × Card(vehicle_types)
SELECT
    b.branch_id,
    b.branch_name,
    b.city,
    vt.vehicle_type_id,
    vt.type_name,
    vt.description AS category_description
FROM branches b
CROSS JOIN vehicle_types vt
ORDER BY b.branch_id, vt.vehicle_type_id;

-- ----------------------------------------------------------------------------
-- 1.6 RELATIONAL ALGEBRA: SET DIFFERENCE / ANTI-JOIN (▷)
-- Concept: Identifies tuples in relation R that have no matching tuple in relation S: R ▷ S
-- ----------------------------------------------------------------------------

-- Query 1.6.1: Anti-Join: Customers who have registered but never booked a rental
-- Algebra: customers ▷ rentals  ≡  customers - π_{customers.*}(customers ⋈ rentals)
SELECT
    c.customer_id,
    c.name,
    c.email,
    c.phone,
    c.registration_date
FROM customers c
LEFT JOIN rentals r ON c.customer_id = r.customer_id
WHERE r.rental_id IS NULL;

-- Query 1.6.2: Anti-Join: Active Fleet Vehicles that have zero maintenance incidents logged
-- Algebra: vehicles ▷ maintenance
SELECT
    v.vehicle_id,
    v.registration_number,
    v.brand,
    v.model,
    v.status
FROM vehicles v
LEFT JOIN maintenance m ON v.vehicle_id = m.vehicle_id
WHERE m.maintenance_id IS NULL;

-- ----------------------------------------------------------------------------
-- 1.7 EXTENDED ER (EER) RELATIONSHIPS & SPECIALIZATION
-- ----------------------------------------------------------------------------
-- Academic Context:
-- 1. Superclass / Subclass Specialization:
--    Superclass: `users` (credentials: user_id, email, password_hash, role)
--    Subclass:   `customers` (specialized profile: customer_id, driving_license, address)
--    Enforced via 1:1 foreign key: users.customer_id -> customers.customer_id.
-- 2. Aggregation & Associative Entities:
--    `rentals` acts as the associative entity between `customers` and `vehicles`,
--    further aggregated into child entities `payments` (1:N) and lifecycle states.

-- Query 1.7.1: Superclass/Subclass resolution for authenticated customer identities
SELECT
    u.user_id,
    u.email,
    u.role,
    u.full_name AS account_name,
    c.customer_id,
    c.driving_license_number,
    c.phone,
    c.address
FROM users u
INNER JOIN customers c ON u.customer_id = c.customer_id;


-- ############################################################################
-- MODULE 2: FUNDAMENTALS OF NORMALIZATION & FUNCTIONAL DEPENDENCIES
-- ############################################################################

/*
================================================================================
2.1 FORMAL FUNCTIONAL DEPENDENCY (FD) ANALYSIS OF FLEETPRO SCHEMA
================================================================================

1. Relation: vehicles
   Primary Key: vehicle_id
   Candidate Key: registration_number
   FD1.1: vehicle_id → registration_number, brand, model, vehicle_type_id,
                      manufacturing_year, fuel_type, transmission,
                      seating_capacity, rental_rate, status, branch_id, created_at
   FD1.2: registration_number → vehicle_id, ... (alternate candidate key)

2. Relation: branches
   Primary Key: branch_id
   Candidate Key: branch_name
   FD2.1: branch_id → branch_name, address, city, phone, manager_name, status, created_at

3. Relation: vehicle_types
   Primary Key: vehicle_type_id
   Candidate Key: type_name
   FD3.1: vehicle_type_id → type_name, description

4. Relation: customers
   Primary Key: customer_id
   Candidate Keys: email, phone, driving_license_number
   FD4.1: customer_id → name, phone, email, driving_license_number, address, registration_date, status

5. Relation: rentals
   Primary Key: rental_id
   FD5.1: rental_id → customer_id, vehicle_id, branch_id, pickup_date,
                     expected_return_date, actual_return_date, rental_days,
                     daily_rate, rental_amount, extra_charges, final_amount,
                     vehicle_condition, status, notes, created_by, created_at

================================================================================
2.2 NORMAL FORM PROOFS
================================================================================

A. FIRST NORMAL FORM (1NF):
   - Every attribute domain contains strictly atomic (indivisible) values.
   - No multi-valued attributes, repeating groups, or serialized CSV arrays exist.
   - Explicit primary keys identify every tuple uniquely.
   -> SATISFIED: All tables strictly comply with 1NF.

B. SECOND NORMAL FORM (2NF):
   - Schema is in 1NF.
   - In 2NF, no non-prime attribute may be partially dependent on any candidate key.
   - In FleetPro, all relation primary keys are single-attribute synthetic identifiers
     (e.g., vehicle_id, customer_id, rental_id, branch_id).
   - Because no candidate key is composite, partial key dependency cannot exist.
   -> SATISFIED: All tables strictly comply with 2NF.

C. THIRD NORMAL FORM (3NF):
   - Schema is in 2NF.
   - For every non-trivial functional dependency X → Y:
     Either X is a superkey, OR Y is a prime attribute.
   - Transitive dependencies are eliminated through proper normalization:
     * Branch details are isolated into `branches` (preventing branch_id → branch_name in vehicles).
     * Vehicle categories are isolated into `vehicle_types` (preventing type_id → type_name in vehicles).
     * Customer details are isolated into `customers` (preventing customer_id → name in rentals).
   -> SATISFIED: The schema is in 3NF.

================================================================================
2.3 FINANCIAL AUDIT TRAIL PRESERVATION (rentals.daily_rate)
================================================================================
Note for ADBMS Viva / Academic Review:
`rentals.daily_rate` is NOT a transitive dependency violation of `vehicles.rental_rate`.
In real-world enterprise databases:
- `vehicles.rental_rate` is the CURRENT catalog rate for a vehicle (mutable over time).
- `rentals.daily_rate` is the HISTORICAL CONTRACT SNAPSHOT locked in when the rental was booked.
If `rentals.daily_rate` were normalized away, updating a vehicle's rate would retroactively
alter historical invoices and financial accounting statements, corrupting audit trails.
Preserving historical rate snapshots is standard relational practice for accounting integrity.

================================================================================
2.4 DEMONSTRATION OF NORMALIZATION ANOMALIES (CONCEPTUAL UN-NORMALIZED COMPARISON)
================================================================================
Consider an un-normalized, flat relation:
R(rental_id, customer_name, customer_phone, vehicle_reg, vehicle_rate, branch_name, branch_phone)

1. INSERTION ANOMALY:
   Cannot record a newly purchased vehicle or a newly opened branch until a customer
   actually rents it (or we are forced to insert NULL for rental_id and customer attributes).
   In CAMBER Mobility: Normalized `vehicles` and `branches` tables permit independent insertions.

2. UPDATE ANOMALY:
   If a branch changes its phone number, every historical rental record citing that branch
   in the flat relation would require updates. Missing any row causes inconsistency.
   In CAMBER Mobility: Update is performed on exactly one row in the `branches` table.

3. DELETION ANOMALY:
   If the only rental for a vehicle or customer is purged, the entire vehicle or customer
   identity is permanently lost.
   In CAMBER Mobility: Rentals can be deleted or archived without deleting parent vehicle/customer tuples.
================================================================================
*/


-- ############################################################################
-- MODULE 4: TRANSACTIONS, ACID PROPERTIES & CONCURRENCY
-- ############################################################################

-- ----------------------------------------------------------------------------
-- 4.1 TRANSACTION WORKFLOW DEMONSTRATION
-- The complete lifecycle of vehicle rental booking runs as an atomic transaction.
-- ----------------------------------------------------------------------------

-- Transaction Demonstration Script:
-- Demonstrates:
-- 1. Explicit Transaction demarcation (START TRANSACTION)
-- 2. Concurrency Control (SELECT ... FOR UPDATE row-level exclusive lock)
-- 3. Business rule verification (Availability & Date Overlap checks)
-- 4. Dynamic Pricing Calculation (calculate_rental_amount stored function)
-- 5. Atomic Insertion & State Triggering
-- 6. COMMIT / ROLLBACK semantics

DROP PROCEDURE IF EXISTS demo_rental_transaction;
DELIMITER $$
CREATE PROCEDURE demo_rental_transaction(
    IN p_cust_id INT UNSIGNED,
    IN p_veh_id  INT UNSIGNED,
    IN p_pickup  DATE,
    IN p_return  DATE,
    OUT p_status_message VARCHAR(100)
)
BEGIN
    DECLARE v_veh_status VARCHAR(20);
    DECLARE v_rate DECIMAL(10,2);
    DECLARE v_overlap INT;
    DECLARE v_branch_id INT UNSIGNED;
    DECLARE v_days INT;
    DECLARE v_amount DECIMAL(10,2);

    -- Standard error handling: rollback on SQL exceptions
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_status_message = 'TRANSACTION ROLLED BACK DUE TO SQL ERROR';
    END;

    -- 1. Atomicity & Isolation: Start Transaction
    START TRANSACTION;

    -- 2. Isolation (Pessimistic Concurrency): Lock vehicle row
    SELECT status, rental_rate, branch_id INTO v_veh_status, v_rate, v_branch_id
    FROM vehicles
    WHERE vehicle_id = p_veh_id
    FOR UPDATE;

    -- 3. Consistency checks
    IF v_veh_status IS NULL THEN
        ROLLBACK;
        SET p_status_message = 'ROLLBACK: Vehicle does not exist';
    ELSEIF v_veh_status <> 'AVAILABLE' THEN
        ROLLBACK;
        SET p_status_message = 'ROLLBACK: Vehicle is not available';
    ELSEIF p_return < p_pickup THEN
        ROLLBACK;
        SET p_status_message = 'ROLLBACK: Return date precedes pickup date';
    ELSE
        -- 4. Check for overlapping reservations:
        -- Condition: Existing.pickup <= New.return AND Existing.return >= New.pickup
        SELECT COUNT(*) INTO v_overlap
        FROM rentals
        WHERE vehicle_id = p_veh_id
          AND status IN ('BOOKED', 'ACTIVE')
          AND pickup_date <= p_return
          AND expected_return_date >= p_pickup;

        IF v_overlap > 0 THEN
            ROLLBACK;
            SET p_status_message = 'ROLLBACK: Vehicle already reserved for dates (double-booking prevented)';
        ELSE
            -- 5. All validation passed: calculate amount and commit
            SET v_days = DATEDIFF(p_return, p_pickup) + 1;
            SET v_amount = calculate_rental_amount(v_days, v_rate);

            INSERT INTO rentals (
                customer_id, vehicle_id, branch_id, pickup_date, expected_return_date,
                rental_days, daily_rate, rental_amount, extra_charges, final_amount,
                status, notes, created_by
            ) VALUES (
                p_cust_id, p_veh_id, v_branch_id, p_pickup, p_return,
                v_days, v_rate, v_amount, 0.00, v_amount,
                'BOOKED', 'Academic transaction demonstration rental', 1
            );

            -- 6. Durability: Commit all changes atomically
            COMMIT;
            SET p_status_message = 'TRANSACTION COMMITTED: Rental created successfully';
        END IF;
    END IF;
END$$
DELIMITER ;

-- Test Query 4.1.1: Verify stored procedure demonstration with invalid date range (triggers rollback)
CALL demo_rental_transaction(1, 1, '2026-11-20', '2026-11-15', @result_msg);
SELECT @result_msg AS transaction_result;

-- Clean up demonstration procedure (leaves production schema pristine)
DROP PROCEDURE IF EXISTS demo_rental_transaction;

-- ============================================================================
-- END OF adbms_demonstration.sql
-- ============================================================================
