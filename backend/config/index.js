// Central configuration — reads environment variables once.
// Secrets never live in code; see .env.example.
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: true });

const config = {
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vehicle_rental_db',
    connectionLimit: 10,
    // Ensures DATETIME/TIMESTAMP come back as JS Date objects in local time
    dateStrings: false,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev_only_secret_change_me',
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  },
  port: Number(process.env.PORT || 5000),
};

module.exports = config;
