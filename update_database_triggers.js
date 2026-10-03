const db = require('./backend/db/pool');

async function applyUpdates() {
  const conn = await db.pool.getConnection();
  try {
    console.log('Applying database trigger & view updates...');

    // 1. Update trg_rentals_after_insert
    await conn.query('DROP TRIGGER IF EXISTS trg_rentals_after_insert');
    await conn.query(`
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
      END
    `);
    console.log('✓ trg_rentals_after_insert updated.');

    // 2. Update trg_rentals_after_update
    await conn.query('DROP TRIGGER IF EXISTS trg_rentals_after_update');
    await conn.query(`
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
      END
    `);
    console.log('✓ trg_rentals_after_update updated.');

    // 3. Update available_vehicles view
    await conn.query(`
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
      WHERE v.status = 'AVAILABLE'
        AND NOT EXISTS (
          SELECT 1 FROM rentals r
          WHERE r.vehicle_id = v.vehicle_id
            AND r.status IN ('PENDING', 'BOOKED', 'ACTIVE')
        )
    `);
    console.log('✓ available_vehicles view updated.');

    // 4. Update active_rentals view
    await conn.query(`
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
      WHERE r.status IN ('PENDING', 'BOOKED', 'ACTIVE')
    `);
    console.log('✓ active_rentals view updated.');

    // 5. Sync current vehicle status: Any vehicle with an open rental should be RENTED
    const [resRented] = await conn.query(`
      UPDATE vehicles v
      SET v.status = 'RENTED'
      WHERE v.vehicle_id IN (
        SELECT vehicle_id FROM rentals WHERE status IN ('PENDING', 'BOOKED', 'ACTIVE')
      ) AND v.status = 'AVAILABLE'
    `);
    console.log(`✓ Synchronized vehicle statuses to RENTED: ${resRented.changedRows} vehicles updated.`);

    // 6. Any vehicle WITHOUT an open rental that was marked RENTED should be AVAILABLE
    const [resAvail] = await conn.query(`
      UPDATE vehicles v
      SET v.status = 'AVAILABLE'
      WHERE v.status = 'RENTED'
        AND NOT EXISTS (
          SELECT 1 FROM rentals r WHERE r.vehicle_id = v.vehicle_id AND r.status IN ('PENDING', 'BOOKED', 'ACTIVE')
        )
    `);
    console.log(`✓ Synchronized vehicle statuses to AVAILABLE: ${resAvail.changedRows} vehicles released.`);

    console.log('All database updates applied successfully!');
  } catch (err) {
    console.error('Error applying database updates:', err);
    process.exit(1);
  } finally {
    conn.release();
    process.exit(0);
  }
}

applyUpdates();
