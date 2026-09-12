const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
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

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'campus-lost-found-api' });
});

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;