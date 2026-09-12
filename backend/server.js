require('dotenv').config();
const connectDB = require('./src/config/db');
const app = require('./src/app');
const { startReminderScheduler } = require('./src/services/reminder.service');

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[server] http://localhost:${PORT}`);
    });
    startReminderScheduler();
  })
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });