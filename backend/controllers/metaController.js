// Meta — small reference datasets used by frontend forms (dropdown options).
const db = require('../db/pool');
const { asyncHandler } = require('../middleware/error');

// GET /api/meta/form-data — branches, vehicle types + available vehicles in one call
const formData = asyncHandler(async (req, res) => {
  const branches = await db.query(
    `SELECT branch_id, branch_name, city FROM branches WHERE status = 'ACTIVE' ORDER BY branch_name`);
  const vehicleTypes = await db.query(
    `SELECT vehicle_type_id, type_name FROM vehicle_types ORDER BY type_name`);
  const availableVehicles = await db.query(
    `SELECT vehicle_id, registration_number, brand, model, rental_rate, type_name
     FROM available_vehicles
     ORDER BY rental_rate`);
  const activeCustomers = await db.query(
    `SELECT customer_id, name, phone FROM customers WHERE status = 'ACTIVE' ORDER BY name`);

  res.json({ branches, vehicle_types: vehicleTypes, available_vehicles: availableVehicles, active_customers: activeCustomers });
});

module.exports = { formData };
