const app = require('../src/app');
const connectDB = require('../src/config/db');

connectDB().catch(() => {});

module.exports = app;