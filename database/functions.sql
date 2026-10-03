-- ============================================================================
-- functions.sql — Stored function for the rental pricing rule
-- ============================================================================

USE vehicle_rental_db;

DELIMITER $$

-- calculate_rental_amount(days, rate) → total for the rental period.
-- Pure function of its inputs; used by create_rental procedure + backend.
DROP FUNCTION IF EXISTS calculate_rental_amount$$
CREATE FUNCTION calculate_rental_amount(p_days INT, p_rate DECIMAL(10,2))
RETURNS DECIMAL(10,2)
DETERMINISTIC
NO SQL
BEGIN
  IF p_days IS NULL OR p_days < 1 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Rental must be at least 1 day';
  END IF;
  IF p_rate IS NULL OR p_rate <= 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Daily rate must be positive';
  end if;
  RETURN p_days * p_rate;
END$$

DELIMITER ;
