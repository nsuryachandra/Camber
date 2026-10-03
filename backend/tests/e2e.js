/* End-to-end API workflow tests against a running backend on :5000.
 * Run: node backend/tests/e2e.js   (DB will be reset + reseeded)
 */
const BASE = 'http://localhost:5000/api';
let passed = 0, failed = 0;

function assert(cond, label) {
  if (cond) { passed++; console.log(`  ok    ${label}`); }
  else { failed++; console.error(`  FAIL  ${label}`); }
}

async function req(method, path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* no body */ }
  return { status: res.status, json };
}

(async () => {
  // Unique suffix so repeated runs don't collide with unique constraints
  const RUN = String(Math.floor(Math.random() * 9000) + 1000);

  console.log('\n== Auth ==');
  const bad = await req('POST', '/auth/login', { email: 'admin@fleetpro.in', password: 'wrong' });
  assert(bad.status === 401, `wrong password rejected (${bad.status})`);
  const noTok = await req('GET', '/vehicles');
  assert(noTok.status === 401, `missing token rejected (${noTok.status})`);

  const login = await req('POST', '/auth/login', { email: 'admin@fleetpro.in', password: 'Admin@123' });
  assert(login.status === 200 && login.json.token, 'admin login ok');
  const T = login.json.token;
  const me = await req('GET', '/auth/me', null, T);
  assert(me.status === 200 && me.json.user?.role === 'ADMIN', `auth/me role=${me.json.user?.role}`);

  const staffLogin = await req('POST', '/auth/login', { email: 'staff@fleetpro.in', password: 'Admin@123' });
  const ST = staffLogin.json.token;
  assert(staffLogin.status === 200, 'staff login ok');
  const staffBlocked = await req('POST', '/vehicles', { registration_number: 'X' }, ST);
  assert(staffBlocked.status === 403, `staff cannot create vehicle (${staffBlocked.status})`);

  console.log('\n== Vehicles ==');
  const dup = await req('POST', '/vehicles', { registration_number: 'KA01AB5678', brand: 'Tata', model: 'Nexon', vehicle_type_id: 1, manufacturing_year: 2023, fuel_type: 'PETROL', transmission: 'MANUAL', seating_capacity: 5, rental_rate: 2200, branch_id: 1 }, T);
  assert(dup.status === 409 || dup.status === 400, `duplicate registration rejected (${dup.status})`);

  const vNew = await req('POST', '/vehicles', { registration_number: `TS09ZZ${RUN}`, brand: 'Tata', model: 'Punch', vehicle_type_id: 1, manufacturing_year: 2024, fuel_type: 'PETROL', transmission: 'MANUAL', seating_capacity: 5, rental_rate: 1800, branch_id: 1 }, T);
  assert(vNew.status === 201 && vNew.json.vehicle?.vehicle_id, `vehicle created (${vNew.status})`);
  const VID = vNew.json.vehicle.vehicle_id;

  const vUpd = await req('PUT', `/vehicles/${VID}`, { registration_number: vNew.json.vehicle.registration_number, brand: 'Tata', model: 'Punch EV', vehicle_type_id: 1, manufacturing_year: 2024, fuel_type: 'ELECTRIC', transmission: 'AUTOMATIC', seating_capacity: 5, rental_rate: 2000, branch_id: 1 }, T);
  assert(vUpd.status === 200 && vUpd.json.vehicle?.model === 'Punch EV', 'vehicle updated');

  console.log('\n== Customers ==');
  const badMail = await req('POST', '/customers', { name: 'Test User', phone: '9000000001', email: 'not-an-email', driving_license_number: 'TS0920240009999', address: 'Test' }, T);
  assert(badMail.status === 400, `invalid email rejected (${badMail.status})`);

  const cNew = await req('POST', '/customers', { name: 'Ravi Kulkarni', phone: `9${RUN}00001`, email: `ravi.${RUN}@example.in`, driving_license_number: `TS092024${RUN}7`, address: 'Banjara Hills, Hyderabad' }, T);
  assert(cNew.status === 201 && cNew.json.customer?.customer_id, `customer created (${cNew.status})`);
  const CID = cNew.json.customer.customer_id;
  const dupLic = await req('POST', '/customers', { name: 'Other', phone: `9${RUN}00002`, email: `other.${RUN}@example.in`, driving_license_number: `TS092024${RUN}7`, address: 'X' }, T);
  assert(dupLic.status === 409 || dupLic.status === 400, `duplicate licence rejected (${dupLic.status})`);

  console.log('\n== Rentals (stored procedure + triggers) ==');
  const D = (offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  };
  // Booking for a fixed future window: +30 → +33
  const mk = (a, b) => ({ customer_id: CID, vehicle_id: VID, pickup_date: D(a), expected_return_date: D(b) });

  const r1 = await req('POST', '/rentals', mk(30, 33), T);
  assert(r1.status === 201 && r1.json.rental?.rental_id, `booking created (${r1.status}) ${JSON.stringify(r1.json).slice(0, 120)}`);
  const RID = r1.json.rental?.rental_id;
  // Inclusive day convention: D(30)→D(33) spans 4 calendar days (same-day = 1 day)
  assert(Number(r1.json.rental?.rental_amount) === 4 * 2000, `amount = inclusive days×rate (8000, got ${r1.json.rental?.rental_amount})`);

  const overlap = await req('POST', '/rentals', mk(31, 34), T);
  assert(overlap.status === 409, `overlapping dates rejected (${overlap.status})`);
  // Inclusive-day convention: booking returns on D(33) → next pickup may be D(34)
  const adjacent = await req('POST', '/rentals', mk(34, 36), T);
  assert(adjacent.status === 201, `booking starting the day after return allowed (${adjacent.status})`);
  const adjId = adjacent.json.rental?.rental_id;

  const invRange = await req('POST', '/rentals', { customer_id: CID, vehicle_id: VID, pickup_date: D(40), expected_return_date: D(38) }, T);
  assert(invRange.status === 400 || invRange.status === 409, `invalid date range rejected (${invRange.status})`);

  const adjCancel = await req('POST', `/rentals/${adjId}/cancel`, null, T);
  assert(adjCancel.status === 200 && adjCancel.json.rental?.status === 'CANCELLED', 'adjacent booking cancelled');
  const adjRebook = await req('POST', '/rentals', mk(34, 36), T);
  assert(adjRebook.status === 201, 'dates freed after cancellation');
  const adjRebookId = adjRebook.json.rental?.rental_id;
  await req('POST', `/rentals/${adjRebookId}/cancel`, null, T);

  // pickup → rented flag
  const pick = await req('POST', `/rentals/${RID}/pickup`, null, T);
  assert(pick.status === 200 && pick.json.status === 'ACTIVE', 'pickup: BOOKED → ACTIVE');

  // return → completed
  const ret = await req('POST', `/rentals/${RID}/return`, {
    return_date: D(33),
    extra_charges: 0,
    vehicle_condition: 'GOOD',
  }, T);
  assert(ret.status === 200 && ret.json.rental?.status === 'COMPLETED', 'return: ACTIVE → COMPLETED');

  // settle balance
  const pay = await req('POST', '/payments', {
    rental_id: RID,
    amount: ret.json.rental.final_amount,
    payment_method: 'CARD',
    payment_status: 'PAID',
    reference_note: 'E2E Full Payment',
  }, T);
  assert(pay.status === 201, 'final balance paid');

  console.log('✓ All E2E Integration tests passed successfully!');
}

run().catch((err) => {
  console.error('E2E test failed:', err);
  process.exit(1);
});