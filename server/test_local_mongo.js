const mongoose = require('mongoose');

async function test() {
  try {
    await mongoose.connect('mongodb://localhost:27017/smart_sql_exam', { serverSelectionTimeoutMS: 2000 });
    console.log('SUCCESS: Local MongoDB is running!');
    await mongoose.disconnect();
  } catch (err) {
    console.log('FAILED: Local MongoDB is not running: ' + err.message);
  }
}

test();
