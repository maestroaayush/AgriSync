const mongoose = require('mongoose');
const User = require('./models/user');
const bcrypt = require('bcryptjs');

async function checkMarketVendors() {
  try {
    await mongoose.connect('mongodb+srv://mrvandiary:iamaayush318@agridb.pxzpzfg.mongodb.net/agrisync?retryWrites=true&w=majority&appName=AgriDB');
    
    console.log('Connected to MongoDB');
    
    // Check for market vendor users
    const marketVendors = await User.find({ role: 'market_vendor' });
    
    console.log('\n=== MARKET VENDOR USERS ===');
    if (marketVendors.length > 0) {
      for (const vendor of marketVendors) {
        console.log(`${vendor.email} - ${vendor.name} (verified: ${vendor.emailVerified}, approved: ${vendor.approved})`);
      }
    } else {
      console.log('No market vendor users found');
      
      // Create a test market vendor user
      console.log('\nCreating test market vendor user...');
      
      const hashedPassword = await bcrypt.hash('password123', 12);
      const marketVendor = new User({
        name: 'Sam Vendor',
        email: 'vendor@test.com',
        password: hashedPassword,
        role: 'market_vendor',
        emailVerified: true,
        approved: true,
        location: 'City Market',
        phone: '+1234567890'
      });
      
      await marketVendor.save();
      console.log('✅ Market vendor user created: vendor@test.com');
    }
    
    // Show all user roles in the system
    console.log('\n=== ALL USER ROLES ===');
    const roleStats = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    for (const stat of roleStats) {
      console.log(`${stat._id}: ${stat.count} users`);
    }
    
    console.log('\n=== FINAL CREDENTIALS ===');
    console.log('admin@agrisync.com - admin123 (admin)');
    console.log('farmer1@test.com - password123 (farmer)');
    console.log('farmer2@test.com - password123 (farmer)');
    console.log('warehouse@test.com - password123 (warehouse_manager)');
    console.log('transporter@test.com - password123 (transporter)');
    console.log('vendor@test.com - password123 (market_vendor)');
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    mongoose.disconnect();
  }
}

checkMarketVendors();
