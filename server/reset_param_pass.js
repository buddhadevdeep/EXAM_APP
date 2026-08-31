const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { dbPromise } = require('./config/db');
const { User } = require('./models/mongoose.model');

async function run() {
  await dbPromise;
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('123456', salt);
  await User.updateOne({ email: 'param@gmail.com' }, { $set: { password_hash: passwordHash } });
  console.log('RESET SUCCESS: Password for param@gmail.com is now 123456');
  await mongoose.disconnect();
}

run();
