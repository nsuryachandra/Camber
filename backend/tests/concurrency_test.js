// backend/tests/concurrency_test.js
// Tests concurrent customer booking requests against the same vehicle with overlapping dates.
// Verifies Module 4 ACID (Isolation via SELECT ... FOR UPDATE) and double-booking prevention.

const assert = require('assert');

const BASE_URL = 'http://localhost:5000/api';

async function request(url, options = {}) {
  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    // no body
  }
  return { status: res.status, body };
}

async function runConcurrencyTest() {
  console.log('\n🔒 Starting Module 4: Concurrent Double-Booking Race Condition Test...\n');

  // 1. Admin Login & create a dedicated test vehicle
  const adminLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@fleetpro.in', password: 'Admin@123' }),
  });
  assert.strictEqual(adminLogin.status, 200);
  const adminToken = adminLogin.body.token;

  const testReg = `CONC${Math.floor(1000 + Math.random() * 9000)}`;
  const createVehRes = await request('/vehicles', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      registration_number: testReg,
      brand: 'Hyundai',
      model: 'Ioniq 5 Race Test',
      vehicle_type_id: 6, // Electric
      manufacturing_year: 2024,
      fuel_type: 'ELECTRIC',
      transmission: 'AUTOMATIC',
      seating_capacity: 5,
      rental_rate: 3500,
      branch_id: 1,
    }),
  });
  assert.strictEqual(createVehRes.status, 201);
  const vehicleId = createVehRes.body.vehicle?.vehicle_id;
  console.log(`   ✔ Test vehicle registered (ID: ${vehicleId}, Reg: ${testReg})`);

  // 2. Register Customer A
  const emailA = `cust_a_${Date.now()}@test.in`;
  const phoneA = `91${Math.floor(10000000 + Math.random() * 90000000)}`;
  const licA   = `DL${Math.floor(1000000000 + Math.random() * 9000000000)}`;
  const regA = await request('/auth/register-customer', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Concurrent Customer Alpha',
      email: emailA,
      password: 'Customer@123',
      phone: phoneA,
      driving_license_number: licA,
      address: 'Koramangala, Bengaluru',
    }),
  });
  assert.strictEqual(regA.status, 201);
  const tokenA = regA.body.token;

  // 3. Register Customer B
  const emailB = `cust_b_${Date.now()}@test.in`;
  const phoneB = `92${Math.floor(10000000 + Math.random() * 90000000)}`;
  const licB   = `DL${Math.floor(1000000000 + Math.random() * 9000000000)}`;
  const regB = await request('/auth/register-customer', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Concurrent Customer Beta',
      email: emailB,
      password: 'Customer@123',
      phone: phoneB,
      driving_license_number: licB,
      address: 'HSR Layout, Bengaluru',
    }),
  });
  assert.strictEqual(regB.status, 201);
  const tokenB = regB.body.token;
  console.log(`   ✔ Registered two distinct customer accounts (Alpha & Beta)`);

  // 4. Fire simultaneous overlapping booking requests
  // Both customers attempt to book vehicleId for the same overlapping date window (+15 to +18 days from now)
  const d1 = new Date();
  d1.setDate(d1.getDate() + 15);
  const pickupDate = d1.toISOString().slice(0, 10);

  const d2 = new Date();
  d2.setDate(d2.getDate() + 18);
  const returnDate = d2.toISOString().slice(0, 10);

  console.log(`   ⚡ Dispatching concurrent overlapping bookings for dates: ${pickupDate} → ${returnDate}...`);

  const [resA, resB] = await Promise.all([
    request('/customer/book', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        vehicle_id: vehicleId,
        pickup_date: pickupDate,
        expected_return_date: returnDate,
        notes: 'Alpha booking in race condition test',
      }),
    }),
    request('/customer/book', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({
        vehicle_id: vehicleId,
        pickup_date: pickupDate,
        expected_return_date: returnDate,
        notes: 'Beta booking in race condition test',
      }),
    }),
  ]);

  console.log(`   Response Alpha: status ${resA.status} - ${resA.body?.message || resA.body?.error}`);
  console.log(`   Response Beta:  status ${resB.status} - ${resB.body?.message || resB.body?.error}`);

  const statuses = [resA.status, resB.status];
  assert(statuses.includes(201), 'Exactly one concurrent booking MUST succeed with 201 Created');
  assert(statuses.includes(409), 'The competing concurrent booking MUST be rejected with 409 Conflict');

  console.log('   ✔ Concurrency verification succeeded: 1 accepted (201), 1 rejected (409 Conflict)');
  console.log('   ✔ Stored procedure SELECT ... FOR UPDATE serialized concurrent transactions without double-booking!\n');
}

runConcurrencyTest().catch((err) => {
  console.error('❌ Concurrency Test Failed:', err);
  process.exit(1);
});
