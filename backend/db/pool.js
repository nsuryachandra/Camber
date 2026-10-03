// MySQL connection pool. All queries go through this module so the pool,
// charset and timezone are configured in exactly one place.
const mysql = require('mysql2/promise');
const config = require('../config');

const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: config.db.connectionLimit,
  namedPlaceholders: false,
  decimalNumbers: false, // keep DECIMAL as string → no float rounding surprises
  supportBigNumbers: true,
});

// pool.query helper — returns [rows] for convenience
async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

// pool.execute helper (prepared statements) — same shape
async function execute(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

// Run a set of operations on a single connection inside one transaction.
// Usage: await withTransaction(async (conn) => { await conn.query(...) });
async function withTransaction(handler) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await handler(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { pool, query, execute, withTransaction };
