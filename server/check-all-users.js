const mongoose = require('mongoose');
const User = require('./models/user');
const bcrypt = require('bcryptjs');

async function checkAllUsers() {
  try {
    await mongoose.connect('mongodb+srv://mrvandiary:iamaayush318@agridb.pxzpzfg.mongodb.net/agrisync?retryWrites=true&w=majority&appName=AgriDB');
    
    console.log('Connected to MongoDB');
    
    const users = await User.find({});
    console.log('\n=== ALL USERS ===');
    
    for (const user of users) {
      console.log('\n---');
      console.log('Email:', user.email);
      console.log('Name:', user.name);
      console.log('Role:', user.role);
      console.log('Email Verified:', user.emailVerified);
      console.log('Approved:', user.approved);
      console.log('Has Password:', !!user.password);
      console.log('Google ID:', !!user.googleId);
      
      // Check if user has login issues
      if (!user.emailVerified && user.role !== 'admin' && !user.googleId) {
        console.log('⚠️  LOGIN ISSUE: Email not verified');
      }
      if (!user.approved && user.role !== 'admin') {
        console.log('⚠️  LOGIN ISSUE: Account not approved');
      }
      if (!user.password && !user.googleId) {
        console.log('⚠️  LOGIN ISSUE: No password set');
      }
    }
    
    console.log('\n=== FIXING USERS FOR TESTING ===');
    
    // Update all test users to be verified and approved
    const result = await User.updateMany(
      { 
        role: { $ne: 'admin' }, // Don't update admin users
        email: { $regex: /test\.com$/ } // Only update test emails
      },
      {
        $set: {
          emailVerified: true,
          approved: true
        }
      }
    );
    
    console.log(`Updated ${result.modifiedCount} test users`);
    
    // Show updated users
    const updatedUsers = await User.find({ email: { $regex: /test\.com$/ } });
    console.log('\n=== UPDATED TEST USERS ===');
    
    for (const user of updatedUsers) {
      console.log(`${user.email} (${user.role}): verified=${user.emailVerified}, approved=${user.approved}`);
    }
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    mongoose.disconnect();
  }
}

checkAllUsers();
