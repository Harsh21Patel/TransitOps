// Bootstraps the very first Admin account so the app is usable before the
// full seed suite (Module: Seed Data) is run. Safe to re-run — it's a no-op
// if an Admin already exists.
//
// Usage: node seed/createAdmin.js

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const { ROLES } = require('../config/roles');

const run = async () => {
  await connectDB();

  const existingAdmin = await User.findOne({ role: ROLES.ADMIN });
  if (existingAdmin) {
    console.log(`[Seed] An Admin already exists: ${existingAdmin.email}`);
    await mongoose.connection.close();
    return;
  }

  const admin = await User.create({
    name: 'System Administrator',
    email: 'admin@transitops.com',
    password: 'Admin@12345',
    role: ROLES.ADMIN,
  });

  console.log('[Seed] Bootstrap admin created:');
  console.log(`  Email:    ${admin.email}`);
  console.log('  Password: Admin@12345');
  console.log('  ⚠ Change this password immediately after first login.');

  await mongoose.connection.close();
};

run().catch((err) => {
  console.error('[Seed] Failed:', err);
  process.exit(1);
});
