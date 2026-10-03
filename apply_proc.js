const db = require('./backend/db/pool');

async function updateProc() {
  const conn = await db.pool.getConnection();
  try {
    await conn.query('DROP PROCEDURE IF EXISTS create_rental');
    const procSql = `
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

        IF NOT EXISTS (SELECT 1 FROM customers WHERE customer_id = p_customer_id AND status = 'ACTIVE') THEN
          ROLLBACK;
          SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Customer not found or inactive';
        END IF;

        IF p_return < p_pickup THEN
          ROLLBACK;
          SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Return date must be on or after pickup date';
        END IF;

        SET v_days = DATEDIFF(p_return, p_pickup) + 1;

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

        SET v_amount = calculate_rental_amount(v_days, v_rate);

        INSERT INTO rentals
          (customer_id, vehicle_id, branch_id, pickup_date, expected_return_date,
           rental_days, daily_rate, rental_amount, extra_charges, final_amount,
           status, created_by)
        VALUES
          (p_customer_id, p_vehicle_id, p_branch_id, p_pickup, p_return,
           v_days, v_rate, v_amount, 0.00, v_amount,
           'BOOKED', p_user_id);

        SET p_rental_id = LAST_INSERT_ID();

        UPDATE vehicles SET status = 'RENTED' WHERE vehicle_id = p_vehicle_id;

        COMMIT;
      END
    `;
    await conn.query(procSql);
    console.log('✓ Stored procedure create_rental updated in MySQL.');
  } catch (e) {
    console.error(e);
  } finally {
    conn.release();
    process.exit(0);
  }
}

updateProc();
