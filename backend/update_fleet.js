const mysql = require('mysql2/promise');
const config = require('./config');

const updates = [
  { id: 1, brand: 'Toyota', model: 'Fortuner 4x4 AT', type_id: 3, year: 2023, fuel: 'DIESEL', trans: 'AUTOMATIC', seats: 7, rate: 4500, reg: 'KA05ZA4567' },
  { id: 2, brand: 'Toyota', model: 'Fortuner Legender', type_id: 3, year: 2024, fuel: 'DIESEL', trans: 'AUTOMATIC', seats: 7, rate: 5200, reg: 'KA01FT7890' },
  { id: 3, brand: 'Toyota', model: 'Innova Crysta 2.4 Z', type_id: 4, year: 2023, fuel: 'DIESEL', trans: 'MANUAL', seats: 7, rate: 3200, reg: 'KA03FG6789' },
  { id: 4, brand: 'Toyota', model: 'Innova Hycross Hybrid', type_id: 4, year: 2024, fuel: 'HYBRID', trans: 'AUTOMATIC', seats: 7, rate: 3600, reg: 'KA04IN1234' },
  { id: 5, brand: 'Mahindra', model: 'XUV700 AX7 Luxury', type_id: 3, year: 2023, fuel: 'DIESEL', trans: 'AUTOMATIC', seats: 7, rate: 3400, reg: 'KA01XV8901' },
  { id: 6, brand: 'Mahindra', model: 'Scorpio-N Z8', type_id: 3, year: 2024, fuel: 'DIESEL', trans: 'MANUAL', seats: 7, rate: 3200, reg: 'KA03VW6789' },
  { id: 7, brand: 'Hyundai', model: 'Creta SX(O)', type_id: 3, year: 2024, fuel: 'PETROL', trans: 'AUTOMATIC', seats: 5, rate: 2800, reg: 'KA02TU2345' },
  { id: 8, brand: 'Tata', model: 'Harrier Fearless+', type_id: 3, year: 2023, fuel: 'DIESEL', trans: 'AUTOMATIC', seats: 5, rate: 3100, reg: 'KA04XY0123' },
  { id: 10, brand: 'Honda', model: 'City ZX i-VTEC', type_id: 2, year: 2023, fuel: 'PETROL', trans: 'AUTOMATIC', seats: 5, rate: 2400, reg: 'KA01CD2345' },
  { id: 11, brand: 'Hyundai', model: 'Verna SX Turbo', type_id: 2, year: 2024, fuel: 'PETROL', trans: 'AUTOMATIC', seats: 5, rate: 2500, reg: 'KA03GH6789' },
  { id: 13, brand: 'Maruti Suzuki', model: 'Swift ZXi+', type_id: 1, year: 2023, fuel: 'PETROL', trans: 'MANUAL', seats: 5, rate: 1500, reg: 'KA05MJ1234' },
  { id: 14, brand: 'Hyundai', model: 'i20 Asta(O)', type_id: 1, year: 2023, fuel: 'PETROL', trans: 'MANUAL', seats: 5, rate: 1600, reg: 'KA01AB5678' },
  { id: 15, brand: 'Tata', model: 'Punch Creative', type_id: 1, year: 2024, fuel: 'PETROL', trans: 'MANUAL', seats: 5, rate: 1700, reg: 'KA02LM3456' },
  { id: 16, brand: 'Tata', model: 'Punch EV Empowered', type_id: 6, year: 2024, fuel: 'ELECTRIC', trans: 'AUTOMATIC', seats: 5, rate: 2000, reg: 'KA04PE8890' },
  { id: 18, brand: 'Tata', model: 'Nexon EV Empowered', type_id: 6, year: 2024, fuel: 'ELECTRIC', trans: 'AUTOMATIC', seats: 5, rate: 2400, reg: 'KA05TU9012' },
  { id: 19, brand: 'Hyundai', model: 'Ioniq 5 Long Range', type_id: 6, year: 2024, fuel: 'ELECTRIC', trans: 'AUTOMATIC', seats: 5, rate: 4200, reg: 'KA01EV9999' }
];

async function run() {
  const conn = await mysql.createConnection(config.db);
  for (const v of updates) {
    await conn.query(
      `UPDATE vehicles 
       SET brand = ?, model = ?, vehicle_type_id = ?, manufacturing_year = ?, 
           fuel_type = ?, transmission = ?, seating_capacity = ?, rental_rate = ?, 
           registration_number = ?, status = 'AVAILABLE' 
       WHERE vehicle_id = ?`,
      [v.brand, v.model, v.type_id, v.year, v.fuel, v.trans, v.seats, v.rate, v.reg, v.id]
    );
    console.log(`Updated vehicle ${v.id}: ${v.brand} ${v.model}`);
  }
  await conn.end();
  console.log('Successfully updated all vehicles with diverse fleet!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
