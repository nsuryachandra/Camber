// server.js — entrypoint.
const app = require('./app');
const config = require('./config');
const { pool } = require('./db/pool');

const server = app.listen(config.port, () => {
  console.log(`FleetPro API listening on http://localhost:${config.port}`);
  console.log(`Connected to MySQL database "${config.db.database}" @ ${config.db.host}:${config.db.port}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${config.port} is busy. Retrying in 1.5s...`);
    setTimeout(() => {
      server.close();
      server.listen(config.port);
    }, 1500);
  } else {
    console.error('Server error:', err);
  }
});

// Graceful shutdown — close the pool so the process exits cleanly
async function shutdown() {
  console.log('\nShutting down… closing MySQL pool.');
  await pool.end().catch(() => {});
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
