const Item = require('../models/Item.model');
const { notifyDropOffReminder } = require('./notification.service');

const REMIND_AFTER_HOURS = Number(process.env.HANDOVER_REMIND_AFTER_HOURS || 6);
const REMIND_EVERY_HOURS = Number(process.env.HANDOVER_REMIND_EVERY_HOURS || 6);
const CHECK_INTERVAL_MS = Number(
  process.env.HANDOVER_REMIND_CHECK_MS || REMIND_EVERY_HOURS * 60 * 60 * 1000
);

async function checkPendingDropOffs() {
  if (process.env.VERCEL) return 0;
  const now = Date.now();
  const firstRemind = new Date(now - REMIND_AFTER_HOURS * 60 * 60 * 1000);
  const remindAgain = new Date(now - REMIND_EVERY_HOURS * 60 * 60 * 1000);

  const items = await Item.find({
    type: 'found',
    status: 'active',
    handoverStatus: 'pending',
    createdAt: { $lte: firstRemind },
    $or: [{ lastReminderAt: null }, { lastReminderAt: { $lte: remindAgain } }],
  }).populate('createdBy', 'name email');

  let sent = 0;
  for (const item of items) {
    if (!item.createdBy) continue;
    await notifyDropOffReminder(item);
    item.lastReminderAt = new Date();
    await item.save();
    sent += 1;
  }
  if (sent > 0) console.log(`[reminder] ${sent} drop-off reminder(s) sent`);
  return sent;
}

function startReminderScheduler() {
  if (process.env.VERCEL) {
    console.log('[reminder] scheduler disabled on Vercel (run it via a cron job)');
    return null;
  }
  checkPendingDropOffs().catch((err) => console.error('[reminder] initial run failed', err.message));
  const timer = setInterval(() => {
    checkPendingDropOffs().catch((err) => console.error('[reminder] run failed', err.message));
  }, CHECK_INTERVAL_MS);
  console.log(`[reminder] scheduler started (every ${CHECK_INTERVAL_MS / (60 * 60 * 1000)}h)`);
  return timer;
}

module.exports = { checkPendingDropOffs, startReminderScheduler };