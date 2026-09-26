export const CATEGORIES = [
  'Electronics',
  'Accessories',
  'ID Card',
  'Books',
  'Clothing',
  'Keys',
  'Bags',
  'Water Bottle',
  'Stationery',
  'Other',
];

export const BUILDINGS = [
  'Library',
  'Admin Block',
  'Science Building',
  'Student Center',
  'Cafeteria',
  'Engineering Block',
  'Hostel A',
  'Hostel B',
  'Sports Complex',
  'Main Gate',
  'Other',
];

export const FEEDBACK_CATEGORIES = [
  { key: 'bug', label: 'Bug report', body: 'Something is broken or behaves unexpectedly.' },
  { key: 'feature', label: 'Feature request', body: 'An idea for something new you would use.' },
  { key: 'usability', label: 'Usability', body: 'Confusing, slow, or awkward to use.' },
  { key: 'content', label: 'Content / data', body: 'Wrong or missing items, buildings, or details.' },
  { key: 'other', label: 'Other', body: 'Anything that does not fit the rest.' },
];

export const DEMO_ACCOUNTS = [
  { label: 'Student', email: 'alex@student.edu', password: 'Student@123' },
  { label: 'Guard', email: 'guard@campus.edu', password: 'Guard@123' },
  { label: 'Admin', email: 'admin@campus.edu', password: 'Admin@123' },
];

export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID || '45785620669-dkjdct0n9rb230kjg21i9vipek7kvedb.apps.googleusercontent.com';