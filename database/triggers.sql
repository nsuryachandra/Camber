-- ============================================================================
-- triggers.sql — Keep vehicle status consistent with the rental lifecycle
--   * trg_rentals_after_insert : new ACTIVE rental (pickup) → vehicle RENTED
--   * trg_rentals_after_update : BOOKED→ACTIVE marks RENTED;
--                                COMPLETED/CANCELLED releases the vehicle
-- Only lifecycle-consistency triggers — nothing decorative.
-- ============================================================================

USE vehicle_rental_db;

DELIMITER $$

-- A BOOKED row is a future reservation only: the vehicle stays AVAILABLE and
-- the date-overlap validation protects the reserved window. The vehicle is
-- physically handed over at pickup (BOOKED → ACTIVE), which marks it RENTED.
DROP TRIGGER IF EXISTS trg_rentals_after_insert$$
CREATE TRIGGER trg_rentals_after_insert
AFTER INSERT ON rentals
FOR EACH ROW
BEGIN
  IF NEW.status = 'ACTIVE' THEN
    UPDATE vehicles
    SET status = 'RENTED'
    WHERE vehicle_id = NEW.vehicle_id
      AND status = 'AVAILABLE';
  END IF;
END$$

-- Lifecycle transitions:
--   BOOKED → ACTIVE            : vehicle leaves the pool (RENTED)
--   BOOKED/ACTIVE → COMPLETED  : vehicle returns to the pool (unless the
--                                return already flagged it MAINTENANCE)
--   BOOKED/ACTIVE → CANCELLED  : vehicle returns to the pool
DROP TRIGGER IF EXISTS trg_rentals_after_update$$
CREATE TRIGGER trg_rentals_after_update
AFTER UPDATE ON rentals
FOR EACH ROW
BEGIN
  IF NEW.status = 'ACTIVE' AND OLD.status = 'BOOKED' THEN
    UPDATE vehicles
    SET status = 'RENTED'
    WHERE vehicle_id = NEW.vehicle_id
      AND status = 'AVAILABLE';
  END IF;

  IF NEW.status IN ('COMPLETED', 'CANCELLED')
     AND OLD.status IN ('BOOKED', 'ACTIVE') THEN
    UPDATE vehicles
    SET status = 'AVAILABLE'
    WHERE vehicle_id = NEW.vehicle_id
      AND status = 'RENTED';
  END IF;
END$$

DELIMITER ;
