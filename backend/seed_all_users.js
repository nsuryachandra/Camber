require('dotenv').config();
const pool = require('./db/pool');
const bcrypt = require('bcryptjs');

async function seedUsers() {
  const adminHash = bcrypt.hashSync('Admin@123', 10);
  const custHash = bcrypt.hashSync('Customer@123', 10);

  const sql = `
    INSERT INTO users (full_name, email, password_hash, role, customer_id) VALUES
    ('Priya Sharma', 'admin@camber.in', ?, 'ADMIN', NULL),
    ('Priya Sharma', 'admin@fleetpro.in', ?, 'ADMIN', NULL),
    ('Rahul Verma', 'staff@camber.in', ?, 'STAFF', NULL),
    ('Rahul Verma', 'staff@fleetpro.in', ?, 'STAFF', NULL),
    ('N Suryachandra', 'customer@camber.in', ?, 'CUSTOMER', 1),
    ('N Suryachandra', 'nsuryachandra16@gmail.com', ?, 'CUSTOMER', 1)
    ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash), full_name=VALUES(full_name), role=VALUES(role);
  `;

  await pool.query(sql, [adminHash, adminHash, adminHash, adminHash, custHash, custHash]);
  const [users] = await pool.query('SELECT user_id, full_name, email, role FROM users');
  console.log('Successfully updated users:', users);
  process.exit(0);
}

seedUsers().catch((err) => {
  console.error(err);
  process.exit(1);
});
