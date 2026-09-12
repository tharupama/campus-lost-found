const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error.middleware');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.get('/', (req, res) => {
  res.status(200).json({
    service: 'campus-lost-found-api',
    status: 'ok',
    health: '/api/health',
    docs: 'Frontend calls /api/* routes',
  });
});

app.get('/api/health', async (req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  let db = 'disconnected';
  let dbError = null;
  try {
    await connectDB();
    db = states[mongoose.connection.readyState] || 'unknown';
  } catch (err) {
    db = 'error';
    dbError = err.message;
  }
  res.status(200).json({
    status: 'ok',
    service: 'campus-lost-found-api',
    hasMongoUri: Boolean(process.env.MONGO_URI),
    db,
    dbError,
  });
});

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;