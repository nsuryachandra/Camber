// Express application — middleware chain + API routes.
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

app.use(cors());
app.use(express.json({ limit: '100kb' }));

// Simple request log (helps during demos/viva)
app.use((req, res, next) => {
  if (req.path !== '/api/health') {
    console.log(`${new Date().toISOString()}  ${req.method} ${req.originalUrl}`);
  }
  next();
});

app.use('/api', routes);

// 404 + centralized error handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
