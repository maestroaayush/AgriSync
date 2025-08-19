const mongoose = require('mongoose');
const User = require('./models/user');
const bcrypt = require('bcryptjs');

async function checkAdmin() {
  try {
    await mongoose.connect('mongodb+srv://mrvandiary:iamaayush318@agridb.pxzpzfg.mongodb.net/agrisync?retryWrites=true&w=majority&appName=AgriDB');
    
    console.log('Connected to MongoDB');
    
    const admin = await User.findOne({ email: 'admin@agrisync.com' });
    if (admin) {
      console.log('Admin user found:');
      console.log('Email:', admin.email);
      console.log('Role:', admin.role);
      console.log('Email Verified:', admin.emailVerified);
      console.log('Approved:', admin.approved);
      console.log('Has password:', !!admin.password);
      
      // Test password
      if (admin.password) {
        const isMatch = await bcrypt.compare('admin123', admin.password);
        console.log('Password "admin123" matches:', isMatch);
      }
    } else {
      console.log('No admin user found with email admin@agrisync.com');
      
      // Check all users
      const users = await User.find({}).select('email role').limit(10);
      console.log('Available users:', users);
      
      // Create admin user if not exists
      console.log('Creating admin user...');
      const hashedPassword = await bcrypt.hash('admin123', 12);
      const newAdmin = new User({
        name: 'Admin User',
        email: 'admin@agrisync.com',
        password: hashedPassword,
        role: 'admin',
        emailVerified: true,
        approved: true,
        location: 'Main Office'
      });
      
      await newAdmin.save();
      console.log('Admin user created successfully!');
    }
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    mongoose.disconnect();
  }
}

checkAdmin();
