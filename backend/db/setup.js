// db/setup.js — One-shot database provisioner.
// Runs all SQL files in order: schema → views → functions → procedures →
// triggers → indexes → seed. Safe to re-run (schema.sql drops the database).
//
// Usage: npm run setup:db  (from backend/)
//
// The mysql2 driver does not understand the mysql-CLI `DELIMITER` directive,
// so statements are split here with a delimiter-aware parser (needed for
// stored routines whose bodies contain semicolons).
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('../config');

const SQL_DIR = path.resolve(__dirname, '../../database');

// Order matters: tables before views/routines, triggers before seed data
const FILES = [
  'schema.sql',
  'views.sql',
  'functions.sql',
  'procedures.sql',
  'triggers.sql',
  'indexes.sql',
  'seed.sql',
];

// Split a script into individual statements, honoring DELIMITER switches so
// BEGIN...END bodies (which contain ';') stay intact.
function splitStatements(script) {
  const statements = [];
  let delimiter = ';';
  let buffer = '';

  for (const rawLine of script.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (/^DELIMITER\s+/i.test(line)) {
      // Flush what we have, then switch delimiter (e.g. $$)
      if (buffer.trim()) statements.push(buffer.trim());
      buffer = '';
      delimiter = line.split(/\s+/)[1];
      continue;
    }
    // Skip pure comment lines
    if (line.startsWith('--') || line === '') {
      // keep newlines inside multi-line statements: only skip when buffer empty
      if (!buffer.trim()) continue;
      buffer += '\n' + rawLine; // comment inside a statement — keep line
      continue;
    }

    buffer += (buffer ? '\n' : '') + rawLine;

    // Statement ends when the line closes with the active delimiter
    if (line.endsWith(delimiter)) {
      let stmt = buffer.trim();
      if (delimiter !== ';') stmt = stmt.slice(0, -delimiter.length);
      buffer = '';
      if (stmt) statements.push(stmt);
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
  });

  try {
    for (const file of FILES) {
      const sql = fs.readFileSync(path.join(SQL_DIR, file), 'utf8');
      const statements = splitStatements(sql);
      process.stdout.write(`Applying ${file} (${statements.length} statements) ... `);
      for (const stmt of statements) {
        await conn.query(stmt);
      }
      console.log('OK');
    }
    console.log('\n✔ Database ready: schema, views, functions, procedures,');
    console.log('  triggers, indexes and seed data are all in place.');
    console.log('  Log in with admin@fleetpro.in / Admin@123');
  } finally {
    await conn.end();
  }
}

run().catch((err) => {
  console.error('\n✘ Database setup failed:');
  console.error(err.message);
  process.exit(1);
});
