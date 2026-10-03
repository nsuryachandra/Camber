require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { pool } = require('./pool');

async function seedCleanDatabase() {
  console.log('🔄 Cleaning up all mock data, fake collections, and fake booking histories...');

  // 1. Delete all payments, rentals, and maintenance (ZERO mock histories / fake collections)
  await pool.query('DELETE FROM payments');
  await pool.query('DELETE FROM rentals');
  await pool.query('DELETE FROM maintenance');

  // 2. Remove all mock / test users
  await pool.query(`
    DELETE FROM users 
    WHERE email LIKE 'customer_%' 
       OR email LIKE 'cust_%' 
       OR email LIKE '%@example.in'
       OR email LIKE '%@test.in'
       OR email LIKE '%@example.com'
       OR email LIKE '%fleetpro%'
       OR email IN ('ananya.patel@gmail.com', 'rajesh.sharma@gmail.com', 'priya.nair@gmail.com', 'vikram.malhotra@gmail.com')
  `);

  // 3. Remove all mock / test customers
  await pool.query(`
    DELETE FROM customers 
    WHERE email LIKE 'customer_%' 
       OR email LIKE 'cust_%' 
       OR email LIKE '%@example.in'
       OR email LIKE '%@test.in'
       OR email LIKE '%@example.com'
       OR email IN ('ananya.patel@gmail.com', 'rajesh.sharma@gmail.com', 'priya.nair@gmail.com', 'vikram.malhotra@gmail.com')
  `);

  // 4. Setup EXACTLY 2 branches: Branch 1 Hyd (ACTIVE), Branch 2 Guntur (INACTIVE)
  // First, point vehicles away from other branches to branch 1 so foreign keys are not violated
  await pool.query('UPDATE vehicles SET branch_id = 1 WHERE status != "INACTIVE"');

  // Update or insert Branch 1: Hyderabad (ACTIVE)
  const [b1] = await pool.query('SELECT branch_id FROM branches WHERE branch_id = 1');
  if (b1.length > 0) {
    await pool.query(`
      UPDATE branches 
      SET branch_name = 'CAMBER Hyderabad Hub', 
          address = 'Road No. 36, Jubilee Hills', 
          city = 'Hyderabad', 
          phone = '040-23554400', 
          manager_name = 'Suryachandra', 
          status = 'ACTIVE' 
      WHERE branch_id = 1
    `);
  } else {
    await pool.query(`
      INSERT INTO branches (branch_id, branch_name, address, city, phone, manager_name, status) 
      VALUES (1, 'CAMBER Hyderabad Hub', 'Road No. 36, Jubilee Hills', 'Hyderabad', '040-23554400', 'Suryachandra', 'ACTIVE')
    `);
  }

  // Update or insert Branch 2: Guntur (INACTIVE)
  const [b2] = await pool.query('SELECT branch_id FROM branches WHERE branch_id = 2');
  if (b2.length > 0) {
    await pool.query(`
      UPDATE branches 
      SET branch_name = 'CAMBER Guntur Hub', 
          address = 'Lakshmipuram Main Road', 
          city = 'Guntur', 
          phone = '0863-2233440', 
          manager_name = 'Branch Operations', 
          status = 'INACTIVE' 
      WHERE branch_id = 2
    `);
  } else {
    await pool.query(`
      INSERT INTO branches (branch_id, branch_name, address, city, phone, manager_name, status) 
      VALUES (2, 'CAMBER Guntur Hub', 'Lakshmipuram Main Road', 'Guntur', '0863-2233440', 'Branch Operations', 'INACTIVE')
    `);
  }

  // Remove any extra branches so ONLY Hyderabad (Active) and Guntur (Inactive) exist
  await pool.query('DELETE FROM branches WHERE branch_id NOT IN (1, 2)');

  // 5. Assign ALL vehicles to Branch 1 (Hyderabad) and set status = 'AVAILABLE'
  await pool.query("UPDATE vehicles SET branch_id = 1, status = 'AVAILABLE'");

  // 6. Ensure real customer profile for Suryachandra exists
  let suryaCustomerId = null;
  const [existingSurya] = await pool.query('SELECT customer_id FROM customers WHERE email = "nsuryachandra16@gmail.com"');
  if (existingSurya.length > 0) {
    suryaCustomerId = existingSurya[0].customer_id;
    await pool.query(
      'UPDATE customers SET name = "N Suryachandra", phone = "9481234567", driving_license_number = "AP0920220019481", address = "Road No. 36, Jubilee Hills, Hyderabad", status = "ACTIVE" WHERE customer_id = ?',
      [suryaCustomerId]
    );
  } else {
    const [resSurya] = await pool.query(
      'INSERT INTO customers (name, phone, email, driving_license_number, address, status) VALUES ("N Suryachandra", "9481234567", "nsuryachandra16@gmail.com", "AP0920220019481", "Road No. 36, Jubilee Hills, Hyderabad", "ACTIVE")'
    );
    suryaCustomerId = resSurya.insertId;
  }

  // 7. Ensure standard system accounts exist with fresh hashes
  const adminHash = await bcrypt.hash('Admin@123', 10);
  const customerHash = await bcrypt.hash('Customer@123', 10);

  // Admin: Admin (admin@camber.in / Admin@123)
  const [adminUser] = await pool.query('SELECT user_id FROM users WHERE email = "admin@camber.in"');
  if (adminUser.length > 0) {
    await pool.query('UPDATE users SET full_name = "Admin", password_hash = ?, role = "ADMIN", status = "ACTIVE" WHERE user_id = ?', [adminHash, adminUser[0].user_id]);
  } else {
    await pool.query('INSERT INTO users (full_name, email, password_hash, role, status) VALUES ("Admin", "admin@camber.in", ?, "ADMIN", "ACTIVE")', [adminHash]);
  }

  // Staff: Staff (staff@camber.in / Admin@123)
  const [staffUser] = await pool.query('SELECT user_id FROM users WHERE email = "staff@camber.in"');
  if (staffUser.length > 0) {
    await pool.query('UPDATE users SET full_name = "Staff", password_hash = ?, role = "STAFF", status = "ACTIVE" WHERE user_id = ?', [adminHash, staffUser[0].user_id]);
  } else {
    await pool.query('INSERT INTO users (full_name, email, password_hash, role, status) VALUES ("Staff", "staff@camber.in", ?, "STAFF", "ACTIVE")', [adminHash]);
  }

  // Customer: N Suryachandra (customer@camber.in / Customer@123)
  const [custUser] = await pool.query('SELECT user_id FROM users WHERE email = "customer@camber.in"');
  if (custUser.length > 0) {
    await pool.query('UPDATE users SET full_name = "N Suryachandra", customer_id = ?, password_hash = ?, role = "CUSTOMER", status = "ACTIVE" WHERE user_id = ?', [suryaCustomerId, customerHash, custUser[0].user_id]);
  } else {
    await pool.query('INSERT INTO users (customer_id, full_name, email, password_hash, role, status) VALUES (?, "N Suryachandra", "customer@camber.in", ?, "CUSTOMER", "ACTIVE")', [suryaCustomerId, customerHash]);
  }

  // Also ensure user's direct account nsuryachandra16@gmail.com is linked
  const [nsUser] = await pool.query('SELECT user_id FROM users WHERE email = "nsuryachandra16@gmail.com"');
  if (nsUser.length > 0) {
    await pool.query('UPDATE users SET customer_id = ?, role = "CUSTOMER", status = "ACTIVE" WHERE user_id = ?', [suryaCustomerId, nsUser[0].user_id]);
  }

  const [vCount] = await pool.query('SELECT COUNT(*) AS count FROM vehicles WHERE branch_id = 1');
  const [bList] = await pool.query('SELECT branch_id, branch_name, city, status FROM branches ORDER BY branch_id');

  console.log('✨ Clean database established successfully:');
  console.log(`  • Branches (${bList.length}):`);
  bList.forEach((b) => console.log(`    - [${b.branch_id}] ${b.branch_name} (${b.city}) -> ${b.status}`));
  console.log(`  • Vehicles: ${vCount[0].count} cars assigned to Branch 1 (Hyderabad Hub), all AVAILABLE`);
  console.log('  • Booking History: 0 records (Clean fresh ledger)');
  console.log('  • Payments/Collections: 0 records (Clean fresh ledger)');
  console.log('  • Users: Admin (admin@camber.in), Staff (staff@camber.in), Customer (customer@camber.in, nsuryachandra16@gmail.com)');
  process.exit(0);
}

seedCleanDatabase().catch((err) => {
  console.error('❌ Failed to clean and seed database:', err);
  process.exit(1);
});
