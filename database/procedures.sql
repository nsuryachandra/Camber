-- ============================================================================
-- procedures.sql — Stored procedures for critical, multi-table workflows
--   * create_rental  : validates availability, prices the rental, inserts it
--   * return_vehicle : completes a rental, records condition/charges,
--                      flips vehicle status (transaction-safe)
--   * cancel_rental  : cancels a booking and releases the vehicle
-- ============================================================================

USE vehicle_rental_db;

DELIMITER $$

-- ----------------------------------------------------------------------------
-- create_rental(customer, vehicle, dates) → new rental_id
-- Called by the backend inside a transaction. The overlap check uses
-- SELECT ... FOR UPDATE on the vehicle row so two concurrent bookings for the
-- same vehicle cannot both pass validation (serializes availability checks).
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS create_rental$$
CREATE PROCEDURE create_rental(
  IN  p_customer_id  INT UNSIGNED,
  IN  p_vehicle_id   INT UNSIGNED,
  IN  p_branch_id    INT UNSIGNED,
  IN  p_pickup       DATE,
  IN  p_return       DATE,
  IN  p_user_id      INT UNSIGNED,
  OUT p_rental_id    INT UNSIGNED
)
BEGIN
  DECLARE v_status      VARCHAR(20);
  DECLARE v_rate        DECIMAL(10,2);
  DECLARE v_days        INT;
  DECLARE v_amount      DECIMAL(10,2);
  DECLARE v_overlap     INT;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    RESIGNAL;
  END;

  START TRANSACTION;

  -- Lock the vehicle row for the duration of the check (concurrency safety)
  SELECT status, rental_rate INTO v_status, v_rate
  FROM vehicles
  WHERE vehicle_id = p_vehicle_id
  FOR UPDATE;

  IF v_status IS NULL THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Vehicle not found';
  END IF;

  IF v_status <> 'AVAILABLE' THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Vehicle is not available for booking';
  END IF;

  -- Customer must exist and be active
  IF NOT EXISTS (SELECT 1 FROM customers
                 WHERE customer_id = p_customer_id AND status = 'ACTIVE') THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Customer not found or inactive';
  END IF;

  -- Date sanity
  IF p_return < p_pickup THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Return date must be on or after pickup date';
  END IF;

  -- Same-day rental counts as 1 day
  SET v_days = DATEDIFF(p_return, p_pickup) + 1;

  -- ---- Overlap validation ---------------------------------------------------
  -- Two ranges overlap when: existing.pickup <= new.return
  --                      AND existing.return >= new.pickup
  SELECT COUNT(*) INTO v_overlap
  FROM rentals
  WHERE vehicle_id = p_vehicle_id
    AND status IN ('PENDING', 'BOOKED', 'ACTIVE')
    AND pickup_date <= p_return
    AND expected_return_date >= p_pickup;

  IF v_overlap > 0 THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Vehicle is already booked for the selected dates';
  END IF;

  -- ---- Price it via the stored function -------------------------------------
  SET v_amount = calculate_rental_amount(v_days, v_rate);

  -- ---- Insert ----------------------------------------------------------------
  INSERT INTO rentals
    (customer_id, vehicle_id, branch_id, pickup_date, expected_return_date,
     rental_days, daily_rate, rental_amount, extra_charges, final_amount,
     status, created_by)
  VALUES
    (p_customer_id, p_vehicle_id, p_branch_id, p_pickup, p_return,
     v_days, v_rate, v_amount, 0.00, v_amount,
     'BOOKED', p_user_id);

  SET p_rental_id = LAST_INSERT_ID();

  -- Authoritatively set vehicle to RENTED so it leaves the available showroom
  UPDATE vehicles SET status = 'RENTED' WHERE vehicle_id = p_vehicle_id;

  COMMIT;
END$$

-- ----------------------------------------------------------------------------
-- return_vehicle(rental, condition, extra charges) → completes the rental.
-- Transactional: rental row, payment balance check and vehicle status all
-- move together. Vehicle goes to AVAILABLE, or MAINTENANCE if requested.
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS return_vehicle$$
CREATE PROCEDURE return_vehicle(
  IN  p_rental_id      INT UNSIGNED,
  IN  p_condition      VARCHAR(10),
  IN  p_extra_charges  DECIMAL(10,2),
  IN  p_needs_maintenance TINYINT
)
BEGIN
  DECLARE v_status VARCHAR(20);

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT status INTO v_status
  FROM rentals
  WHERE rental_id = p_rental_id
  FOR UPDATE;

  IF v_status IS NULL THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Rental not found';
  END IF;

  IF v_status NOT IN ('BOOKED', 'ACTIVE') THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Only booked or active rentals can be returned';
  END IF;

  IF p_condition NOT IN ('GOOD', 'FAIR', 'DAMAGED') THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid vehicle condition';
  END IF;

  -- Block return while money is still owed (pending payments > 0)
  IF EXISTS (SELECT 1 FROM payments
             WHERE rental_id = p_rental_id AND payment_status = 'PENDING') THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Settle pending payments before completing the return';
  END IF;

  UPDATE rentals
  SET status             = 'COMPLETED',
      actual_return_date = CURRENT_DATE,
      vehicle_condition  = p_condition,
      extra_charges      = COALESCE(p_extra_charges, 0),
      final_amount       = rental_amount + COALESCE(p_extra_charges, 0)
  WHERE rental_id = p_rental_id;

  UPDATE vehicles
  SET status = IF(p_needs_maintenance = 1, 'MAINTENANCE', 'AVAILABLE')
  WHERE vehicle_id = (SELECT vehicle_id FROM rentals WHERE rental_id = p_rental_id);

  COMMIT;
END$$

-- ----------------------------------------------------------------------------
-- cancel_rental(id) → CANCELLED + release vehicle (only if still BOOKED/ACTIVE)
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS cancel_rental$$
CREATE PROCEDURE cancel_rental(
  IN p_rental_id INT UNSIGNED
)
BEGIN
  DECLARE v_status VARCHAR(20);

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT status INTO v_status
  FROM rentals
  WHERE rental_id = p_rental_id
  FOR UPDATE;

  IF v_status IS NULL THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Rental not found';
  END IF;

  IF v_status = 'COMPLETED' THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Completed rentals cannot be cancelled';
  END IF;

  IF v_status = 'CANCELLED' THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Rental is already cancelled';
  end if;

  UPDATE rentals SET status = 'CANCELLED' WHERE rental_id = p_rental_id;

  -- Release the vehicle only if it is still marked RENTED for this rental
  UPDATE vehicles v
  JOIN rentals r ON r.vehicle_id = v.vehicle_id
  SET v.status = 'AVAILABLE'
  WHERE r.rental_id = p_rental_id
    AND v.status = 'RENTED';

  COMMIT;
END$$

DELIMITER ;
