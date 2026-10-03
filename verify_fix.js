const db = require('./backend/db/pool');

async function testBackend() {
  try {
    // 1. Check public vehicles query
    const where = [
      "v.status = 'AVAILABLE'",
      "NOT EXISTS (SELECT 1 FROM rentals r WHERE r.vehicle_id = v.vehicle_id AND r.status IN ('PENDING', 'BOOKED', 'ACTIVE'))",
    ];
    const clause = ` WHERE ${where.join(' AND ')}`;
    const [rows] = await db.pool.query(
      `SELECT v.vehicle_id, v.brand, v.model, v.status
       FROM vehicles v
       ${clause}
       ORDER BY v.rental_rate ASC`
    );
    console.log('Available vehicles count in showroom:', rows.length);
    const hasI20 = rows.some(r => r.model.toLowerCase().includes('i20'));
    console.log('Is booked Hyundai i20 in available showroom?:', hasI20 ? 'YES (BUG)' : 'NO (CORRECT! Excluded from showroom while reserved)');

    // 2. Check Surya (customer_id = 32) profile stats
    const [stats] = await db.pool.query(
      `SELECT COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END), 0) AS completed_trips,
              COUNT(*) AS total_trips,
              COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN final_amount ELSE 0 END), 0) AS total_spent,
              COALESCE(SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END), 0) AS active_trips,
              COALESCE(SUM(CASE WHEN status IN ('BOOKED', 'PENDING') THEN 1 ELSE 0 END), 0) AS upcoming_trips
       FROM rentals WHERE customer_id = ?`,
      [32]
    );
    console.log('Surya profile stats:', stats[0]);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

testBackend();
