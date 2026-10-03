const mysql = require('mysql2/promise');
const config = require('./config');

async function run() {
  const conn = await mysql.createConnection(config.db);

  // Set all inactive first
  await conn.query("UPDATE vehicles SET status = 'INACTIVE'");

  const fullFleet = [
    { id: 1, brand: 'Toyota', model: 'Fortuner', type_id: 3, year: 2024, fuel: 'DIESEL', trans: 'AUTOMATIC', seats: 7, rate: 4500, reg: 'KA05ZA4567' },
    { id: 2, brand: 'Toyota', model: 'Fortuner', type_id: 3, year: 2024, fuel: 'DIESEL', trans: 'AUTOMATIC', seats: 7, rate: 4500, reg: 'KA01FT7890' },
    { id: 3, brand: 'Toyota', model: 'Innova', type_id: 4, year: 2023, fuel: 'DIESEL', trans: 'MANUAL', seats: 7, rate: 3200, reg: 'KA03FG6789' },
    { id: 4, brand: 'Toyota', model: 'Innova', type_id: 4, year: 2024, fuel: 'DIESEL', trans: 'AUTOMATIC', seats: 7, rate: 3500, reg: 'KA04IN1234' },
    { id: 5, brand: 'Mahindra', model: 'Thar', type_id: 3, year: 2024, fuel: 'DIESEL', trans: 'MANUAL', seats: 4, rate: 3300, reg: 'KA01TH4444' },
    { id: 6, brand: 'Mahindra', model: 'Scorpio-N', type_id: 3, year: 2024, fuel: 'DIESEL', trans: 'AUTOMATIC', seats: 7, rate: 3200, reg: 'KA03SN7777' },
    { id: 10, brand: 'Honda', model: 'City', type_id: 2, year: 2024, fuel: 'PETROL', trans: 'AUTOMATIC', seats: 5, rate: 2400, reg: 'KA01HC1111' },
    { id: 13, brand: 'Maruti Suzuki', model: 'Swift', type_id: 1, year: 2023, fuel: 'PETROL', trans: 'MANUAL', seats: 5, rate: 1500, reg: 'KA05MJ1234' },
    { id: 14, brand: 'Maruti Suzuki', model: 'Swift', type_id: 1, year: 2024, fuel: 'PETROL', trans: 'MANUAL', seats: 5, rate: 1500, reg: 'KA01AB5678' },
    { id: 15, brand: 'Hyundai', model: 'i20', type_id: 1, year: 2024, fuel: 'PETROL', trans: 'MANUAL', seats: 5, rate: 1600, reg: 'KA02LM3456' },
    { id: 16, brand: 'Tata', model: 'Punch EV', type_id: 6, year: 2024, fuel: 'ELECTRIC', trans: 'AUTOMATIC', seats: 5, rate: 2000, reg: 'KA04PE8890' },
    { id: 18, brand: 'Tata', model: 'Nexon EV', type_id: 6, year: 2024, fuel: 'ELECTRIC', trans: 'AUTOMATIC', seats: 5, rate: 2400, reg: 'KA05TU9012' },
    { id: 7, brand: 'Force', model: 'Traveller', type_id: 7, year: 2023, fuel: 'DIESEL', trans: 'MANUAL', seats: 12, rate: 4200, reg: 'KA02FT9999' },
  ];

  for (const v of fullFleet) {
    await conn.query(
      `INSERT INTO vehicles 
        (vehicle_id, brand, model, vehicle_type_id, manufacturing_year,
         fuel_type, transmission, seating_capacity, rental_rate,
         registration_number, branch_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'AVAILABLE')
       ON DUPLICATE KEY UPDATE
         brand = VALUES(brand), model = VALUES(model), vehicle_type_id = VALUES(vehicle_type_id),
         manufacturing_year = VALUES(manufacturing_year), fuel_type = VALUES(fuel_type),
         transmission = VALUES(transmission), seating_capacity = VALUES(seating_capacity),
         rental_rate = VALUES(rental_rate), registration_number = VALUES(registration_number),
         branch_id = 1, status = 'AVAILABLE'`,
      [v.id, v.brand, v.model, v.type_id, v.year, v.fuel, v.trans, v.seats, v.rate, v.reg]
    );
    console.log(`Configured active vehicle: ${v.brand} ${v.model} (#${v.id})`);
  }

  const [activeRows] = await conn.query("SELECT vehicle_id, brand, model, vehicle_type_id, status FROM vehicles WHERE status = 'AVAILABLE'");
  console.log('\nTotal active available fleet:', activeRows.length);
  console.table(activeRows);

  await conn.end();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
