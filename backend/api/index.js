const app = require('../src/app');
const connectDB = require('../src/config/db');

let connected = false;

module.exports = async (req, res) => {
  if (!connected) {
    try {
      await connectDB();
      connected = true;
    } catch (err) {
      console.error('[api] db connection failed:', err.message);
      return res.status(503).json({
        message: 'Database connection failed. Retry in a moment.',
      });
    }
  }
  return app(req, res);
};