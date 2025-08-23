const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/user');

async function checkAdmins() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    const admins = await User.find({ role: 'admin' }).select('_id name email role');
    console.log('Found admins:', admins.length);
    console.log('Admin details:', admins);
    
    if (admins.length === 0) {
      console.log('❌ No admin users found in database!');
    } else {
      console.log('✅ Found admin users:', admins.map(admin => ({
        id: admin._id,
        name: admin.name,
        email: admin.email
      })));
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAdmins();
