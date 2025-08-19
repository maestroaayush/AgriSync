const mongoose = require('mongoose');
const User = require('./models/user');
require('dotenv').config();

const fixAuthentication = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {});
    console.log('✅ MongoDB connected');
    
    // Update all existing users to be approved and verified
    const result = await User.updateMany(
      {}, 
      { $set: { approved: true, emailVerified: true } }
    );
    
    console.log(`✅ Updated ${result.modifiedCount} users to be approved and email verified`);
    
    // List all users to confirm
    const users = await User.find({}, 'name email role approved emailVerified');
    console.log('\n📋 User Status:');
    users.forEach(user => {
      console.log(`   ${user.email} (${user.role}) - Approved: ${user.approved}, Verified: ${user.emailVerified}`);
    });
    
    mongoose.disconnect();
    console.log('\n✅ Authentication fix completed!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
};

fixAuthentication();
