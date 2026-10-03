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
  const body = await res.json();
  return { status: res.status, body };
}

async function runTests() {
  console.log('🚀 Starting Full 2-Sided Architecture E2E Tests...\n');

  // 1. Public Meta & Vehicles
  console.log('1. Testing Public Endpoints...');
  const metaRes = await request('/public/meta');
  assert.strictEqual(metaRes.status, 200);
  assert(Array.isArray(metaRes.body.branches), 'branches should be array');
  assert(Array.isArray(metaRes.body.vehicle_types), 'vehicle_types should be array');
  console.log(`   ✔ Public meta OK (${metaRes.body.branches.length} branches, ${metaRes.body.vehicle_types.length} vehicle types)`);

  const publicVehicles = await request('/public/vehicles');
  assert.strictEqual(publicVehicles.status, 200);
  assert(Array.isArray(publicVehicles.body.data), 'public vehicles should be array');
  console.log(`   ✔ Public vehicles catalogue OK (${publicVehicles.body.data.length} vehicles available)`);

  // 2. Admin Login & Add Vehicle (if fleet is empty)
  console.log('\n2. Testing Admin Authentication...');
  const adminLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@fleetpro.in', password: 'Admin@123' }),
  });
  assert.strictEqual(adminLogin.status, 200);
  assert.strictEqual(adminLogin.body.user.role, 'ADMIN');
  const adminToken = adminLogin.body.token;
  console.log('   ✔ Admin authenticated successfully as:', adminLogin.body.user.name);

  // Add a test vehicle for the showroom
  const testReg = `KA05EV${Math.floor(1000 + Math.random() * 9000)}`;
  const createVehRes = await request('/vehicles', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      registration_number: testReg,
      brand: 'Tata',
      model: 'Nexon EV Empowered',
      vehicle_type_id: 6, // Electric
      manufacturing_year: 2024,
      fuel_type: 'ELECTRIC',
      transmission: 'AUTOMATIC',
      seating_capacity: 5,
      rental_rate: 2800,
      branch_id: 1,
    }),
  });
  const vehicleId = createVehRes.body.vehicle?.vehicle_id || createVehRes.body.vehicle_id;
  assert(vehicleId, 'Vehicle ID must be returned');
  console.log(`   ✔ Test vehicle added to fleet: Tata Nexon EV (ID: ${vehicleId}, Reg: ${testReg})`);

  // 3. Customer Self-Service Registration
  console.log('\n3. Testing Customer Portal Registration...');
  const testEmail = `customer_${Date.now()}@gmail.com`;
  const testPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  const testLicense = `DL${Math.floor(1000000000 + Math.random() * 9000000000)}`;

  const regRes = await request('/auth/register-customer', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Aditya Verma',
      email: testEmail,
      password: 'Customer@123',
      phone: testPhone,
      driving_license_number: testLicense,
      address: 'Indiranagar 100ft Road, Bengaluru',
    }),
  });
  assert.strictEqual(regRes.status, 201);
  assert.strictEqual(regRes.body.user.role, 'CUSTOMER');
  assert(regRes.body.user.customer_id > 0, 'Customer ID must be present');
  const customerToken = regRes.body.token;
  console.log(`   ✔ Customer account created: ${regRes.body.user.name} (Customer ID: ${regRes.body.user.customer_id})`);

  // 4. Customer Profile Check
  console.log('\n4. Testing Customer Profile...');
  const profileRes = await request('/customer/profile', {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  assert.strictEqual(profileRes.status, 200);
  assert.strictEqual(profileRes.body.customer.name, 'Aditya Verma');
  console.log('   ✔ Customer profile retrieved successfully');

  // 5. Customer Booking Flow
  console.log('\n5. Testing Customer Self-Service Vehicle Booking...');
  const today = new Date().toISOString().slice(0, 10);
  const retDate = new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10);

  const bookRes = await request('/customer/book', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({
      vehicle_id: vehicleId,
      pickup_date: today,
      expected_return_date: retDate,
      notes: 'Customer portal test booking',
    }),
  });
  assert.strictEqual(bookRes.status, 201);
  const rentalId = bookRes.body.rental_id;
  assert(rentalId > 0);
  console.log(`   ✔ Vehicle booked successfully! Rental Agreement #${rentalId} created (Days: ${bookRes.body.rental_days}, Amount: ₹${bookRes.body.final_amount})`);

  // 6. Customer My Bookings List
  console.log('\n6. Testing Customer My Bookings View...');
  const myRentalsRes = await request('/customer/rentals', {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  assert.strictEqual(myRentalsRes.status, 200);
  assert(myRentalsRes.body.data.length >= 1);
  const myRental = myRentalsRes.body.data.find((r) => r.rental_id === rentalId);
  assert(myRental, 'Newly booked rental must appear in customer bookings');
  assert.strictEqual(myRental.brand, 'Tata');
  console.log(`   ✔ Customer bookings list contains rental #${rentalId} with status ${myRental.status}`);

  // 7. Customer Booking Cancellation
  console.log('\n7. Testing Customer Booking Cancellation...');
  const cancelRes = await request(`/customer/rentals/${rentalId}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  assert.strictEqual(cancelRes.status, 200);
  console.log('   ✔ Customer successfully cancelled upcoming reservation');

  console.log('\n🎉 ALL 2-SIDED PORTAL END-TO-END TESTS PASSED WITH 100% SUCCESS!\n');
}

runTests().catch((err) => {
  console.error('❌ E2E Test Failed:', err);
  process.exit(1);
});
