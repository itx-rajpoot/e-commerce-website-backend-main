const mongoose = require('mongoose');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shopdb';

async function createAdmin(username, email, password) {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const existing = await User.findOne({ username });
    if (existing) {
      console.log('Admin user already exists. Updating password/email if provided.');
      if (password) {
        const salt = await bcrypt.genSalt(10);
        existing.password = await bcrypt.hash(password, salt);
      }
      if (email) existing.email = email;
      await existing.save();
      console.log('✅ Admin user updated');
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    await User.create({
      username,
      email,
      password: hashed,
      role: 'admin'
    });

    console.log('✅ Admin user created');
    process.exit(0);
  } catch (err) {
    console.error('Error creating admin:', err);
    process.exit(1);
  }
}

// Read from args or fallback to defaults
const args = process.argv.slice(2);
const username = args[0] || process.env.ADMIN_USERNAME || 'admin';
const email = args[1] || process.env.ADMIN_EMAIL || 'admin@store.com';
const password = args[2] || process.env.ADMIN_PASSWORD || 'admin1234';

createAdmin(username, email, password);
