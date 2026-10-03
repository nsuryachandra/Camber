-- ============================================================================
-- triggers.sql — Keep vehicle status consistent with the rental lifecycle
--   * trg_rentals_after_insert : new ACTIVE rental (pickup) → vehicle RENTED
--   * trg_rentals_after_update : BOOKED→ACTIVE marks RENTED;
--                                COMPLETED/CANCELLED releases the vehicle
-- Only lifecycle-consistency triggers — nothing decorative.
-- ============================================================================

USE vehicle_rental_db;

DELIMITER $$

-- A rental in PENDING, BOOKED, or ACTIVE status reserves the vehicle:
-- the vehicle is marked RENTED so it is no longer shown in the available pool.
DROP TRIGGER IF EXISTS trg_rentals_after_insert$
CREATE TRIGGER trg_rentals_after_insert
AFTER INSERT ON rentals
FOR EACH ROW
BEGIN
  IF NEW.status IN ('PENDING', 'BOOKED', 'ACTIVE') THEN
    UPDATE vehicles
    SET status = 'RENTED'
    WHERE vehicle_id = NEW.vehicle_id
      AND status = 'AVAILABLE';
  END IF;
END$

-- Lifecycle transitions:
--   PENDING/BOOKED/ACTIVE: vehicle stays or moves to RENTED
--   COMPLETED/CANCELLED  : vehicle returns to AVAILABLE (unless flagged MAINTENANCE)
DROP TRIGGER IF EXISTS trg_rentals_after_update$
CREATE TRIGGER trg_rentals_after_update
AFTER UPDATE ON rentals
FOR EACH ROW
BEGIN
  IF NEW.status IN ('PENDING', 'BOOKED', 'ACTIVE') AND OLD.status NOT IN ('PENDING', 'BOOKED', 'ACTIVE') THEN
    UPDATE vehicles
    SET status = 'RENTED'
    WHERE vehicle_id = NEW.vehicle_id
      AND status = 'AVAILABLE';
  END IF;

  IF NEW.status IN ('COMPLETED', 'CANCELLED')
     AND OLD.status IN ('PENDING', 'BOOKED', 'ACTIVE') THEN
    UPDATE vehicles
    SET status = 'AVAILABLE'
    WHERE vehicle_id = NEW.vehicle_id
      AND status = 'RENTED';
  END IF;
END$

DELIMITER ;
