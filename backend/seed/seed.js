require('dotenv').config();
const connectDB = require('../src/config/db');
const mongoose = require('mongoose');
const User = require('../src/models/User.model');
const Item = require('../src/models/Item.model');
const Claim = require('../src/models/Claim.model');

const IMG = {
  headphones: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80',
  backpack: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&q=80',
  keys: 'https://images.unsplash.com/photo-1517260739337-6799d239ce83?w=500&q=80',
  bottle: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500&q=80',
  book: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&q=80',
  laptop: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500&q=80',
  umbrella: 'https://images.unsplash.com/photo-1602085489216-742e5a078ba4?w=500&q=80',
  airpods: 'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=500&q=80',
  wallet: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=500&q=80',
  watch: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=500&q=80',
};

async function seed() {
  await connectDB();
  await Promise.all([User.deleteMany({}), Item.deleteMany({}), Claim.deleteMany({})]);

  const admin = await User.create({
    name: 'Elena Stark',
    email: 'admin@campus.edu',
    password: 'Admin@123',
    role: 'admin',
  });
  const guard = await User.create({
    name: 'Marcus Reed',
    email: 'guard@campus.edu',
    password: 'Guard@123',
    role: 'guard',
    studentId: 'SEC-1101',
  });
  const alex = await User.create({
    name: 'Alex Morgan',
    email: 'alex@student.edu',
    password: 'Student@123',
    role: 'student',
    studentId: 'STU-2201',
  });
  const maya = await User.create({
    name: 'Maya Chen',
    email: 'maya@student.edu',
    password: 'Student@123',
    role: 'student',
    studentId: 'STU-2202',
  });

  const foundItems = await Item.insertMany([
    {
      title: 'Sony Wireless Headphones',
      description: 'Black over-ear noise cancelling headphones with worn ear pads.',
      type: 'found',
      category: 'Electronics',
      location: 'Library',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      image: IMG.headphones,
      status: 'active',
      handoverStatus: 'in_vault',
      handedOverAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      secretFeature: 'Scratch shaped like a star on the left ear cup',
      createdBy: guard._id,
    },
    {
      title: 'Navy Blue Backpack',
      description: 'Medium backpack with a white keychain bottle opener.',
      type: 'found',
      category: 'Bags',
      location: 'Student Center',
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      image: IMG.backpack,
      status: 'active',
      handoverStatus: 'in_vault',
      handedOverAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
      secretFeature: 'A orange stitch near the zipper',
      createdBy: maya._id,
    },
    {
      title: 'Bunch of Keys with Fridge Magnet',
      description: 'Keys on a ring carrying a round fridge magnet.',
      type: 'found',
      category: 'Keys',
      location: 'Cafeteria',
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      image: IMG.keys,
      status: 'active',
      handoverStatus: 'in_vault',
      handedOverAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      secretFeature: 'Small star scratch on the car key',
      createdBy: guard._id,
    },
    {
      title: 'AirPods Pro Case',
      description: 'White AirPods case with a yellow loop strap.',
      type: 'found',
      category: 'Electronics',
      location: 'Sports Complex',
      date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      image: IMG.airpods,
      status: 'active',
      handoverStatus: 'in_vault',
      handedOverAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      secretFeature: 'Enamel pin of a cat on the case',
      createdBy: alex._id,
    },
  ]);

  const lostItems = await Item.insertMany([
    {
      title: 'Sony Wireless Headphones',
      description: 'Lost black Sony headphones, probably left in the library yesterday.',
      type: 'lost',
      category: 'Electronics',
      location: 'Library',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      image: IMG.headphones,
      status: 'active',
      createdBy: alex._id,
    },
    {
      title: 'Black Umbrella',
      description: 'Compact black foldable umbrella, maybe near the lecture hall.',
      type: 'lost',
      category: 'Other',
      location: 'Admin Block',
      date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      image: IMG.umbrella,
      status: 'active',
      createdBy: maya._id,
    },
    {
      title: 'Leather Wallet',
      description: 'Brown leather wallet with campus ID inside.',
      type: 'lost',
      category: 'Accessories',
      location: 'Cafeteria',
      date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      image: IMG.wallet,
      status: 'active',
      createdBy: alex._id,
    },
    {
      title: 'Dell Laptop Charger',
      description: 'Dell 65W charger, accidentally left plugged in the student lab.',
      type: 'lost',
      category: 'Electronics',
      location: 'Engineering Block',
      date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      image: IMG.laptop,
      status: 'active',
      createdBy: maya._id,
    },
  ]);

  const claim1 = await Claim.create({
    item: foundItems[0]._id,
    claimant: alex._id,
    proofAnswer: 'The scratch shaped like a star is on the left ear cup',
    note: 'Left them on the third table of the silent zone.',
    status: 'pending',
  });

  const claim2 = await Claim.create({
    item: foundItems[3]._id,
    claimant: maya._id,
    proofAnswer: 'The yellow loop strap and the cat pin on the case',
    note: 'Dropped them after evening practice at the gym.',
    status: 'pending',
  });

  await mongoose.disconnect();
  console.log('[seed] done:');
  console.log('  admin@campus.edu / Admin@123  (admin)');
  console.log('  guard@campus.edu / Guard@123  (guard)');
  console.log('  alex@student.edu / Student@123 (student)');
  console.log('  maya@student.edu / Student@123 (student)');
  console.log(`  4 found items, 4 lost items, 2 pending claims (${claim1._id}, ${claim2._id})`);
}

seed().catch(async (err) => {
  console.error('[seed] error', err);
  await mongoose.disconnect();
  process.exit(1);
});