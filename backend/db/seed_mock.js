// db/seed_mock.js — Optional script to populate realistic sample data
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('../config');

const MOCK_FILE = path.resolve(__dirname, '../../database/mock_data.sql');

function splitStatements(script) {
  const statements = [];
  let buffer = '';
  for (const rawLine of script.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.startsWith('--') || line === '') continue;
    buffer += (buffer ? '\n' : '') + rawLine;
    if (line.endsWith(';')) {
      statements.push(buffer.slice(0, -1).trim());
      buffer = '';
    }
  }
  if (buffer.trim()) statements.push(buffer.trim());
  return statements;
}

async function run() {
  const conn = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
  });

  try {
    const sql = fs.readFileSync(MOCK_FILE, 'utf8');
    const statements = splitStatements(sql);
    process.stdout.write(`Applying mock data (${statements.length} statements) ... `);
    for (const stmt of statements) {
      if (stmt.trim()) await conn.query(stmt);
    }
    console.log('OK');
    console.log('\n✔ Mock dataset applied successfully (26 vehicles, 20 customers, sample rentals).');
  } finally {
    await conn.end();
  }
}

run().catch((err) => {
  console.error('\n✘ Failed to apply mock data:');
  console.error(err.message);
  process.exit(1);
});
