const Item = require('../models/Item.model');
const { notifyUser } = require('./notification.service');

const WEIGHTS = {
  category: 30,
  location: 35,
  timeWindow: 20,
  keyword: 15,
};

const MIN_SCORE = 60;

function normalize(text) {
  return (text || '').toLowerCase().split(/\s+/).filter(Boolean);
}

function timeWindowScore(a, b) {
  const days = Math.abs(new Date(a) - new Date(b)) / (1000 * 60 * 60 * 24);
  if (days <= 3) return 20;
  if (days <= 7) return 12;
  if (days <= 14) return 6;
  return 0;
}

function keywordScore(lost, found) {
  const lostWords = normalize(`${lost.title} ${lost.description}`).filter((w) => w.length > 3);
  const foundWords = new Set(normalize(`${found.title} ${found.description}`));
  const hits = lostWords.filter((w) => foundWords.has(w)).length;
  if (hits === 0) return 0;
  return Math.min(WEIGHTS.keyword, hits * 5);
}

async function runMatchEngine(foundItem) {
  const windowStart = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000);

  const candidates = await Item.find({
    type: 'lost',
    status: 'active',
    location: foundItem.location,
    date: { $gte: windowStart },
  }).populate('createdBy', 'name email');

  const matches = [];

  for (const lostItem of candidates) {
    let score = 0;
    if (lostItem.category === foundItem.category) score += WEIGHTS.category;
    score += WEIGHTS.location;
    score += timeWindowScore(lostItem.date, foundItem.date);
    score += keywordScore(lostItem, foundItem);

    if (score >= MIN_SCORE) {
      matches.push({ lostItemId: lostItem._id, foundItemId: foundItem._id, score });

      await notifyUser({
        user: lostItem.createdBy,
        type: 'match',
        title: 'Potential match spotted!',
        message: `Your lost "${lostItem.title}" might be the just-found "${foundItem.title}" (match score ${score}/100). The item isn't in the guard room yet — it will be available for pickup once the finder drops it off.`,
        items: [lostItem._id, foundItem._id],
        link: `/items/${foundItem._id}`,
      });
    }
  }

  return matches;
}

module.exports = { runMatchEngine, MIN_SCORE };