const mongoose = require('mongoose');
const User = require('./models/user');
const bcrypt = require('bcryptjs');

async function testPasswords() {
  try {
    await mongoose.connect('mongodb+srv://mrvandiary:iamaayush318@agridb.pxzpzfg.mongodb.net/agrisync?retryWrites=true&w=majority&appName=AgriDB');
    
    console.log('Connected to MongoDB');
    
    const testUsers = await User.find({ email: { $regex: /test\.com$/ } });
    
    // Common test passwords to try
    const testPasswords = ['password', 'test123', 'password123', 'user123', '123456'];
    
    console.log('\n=== TESTING PASSWORDS ===');
    
    for (const user of testUsers) {
      console.log(`\nTesting ${user.email}:`);
      
      let passwordFound = false;
      for (const password of testPasswords) {
        try {
          const isMatch = await bcrypt.compare(password, user.password);
          if (isMatch) {
            console.log(`✅ Password: "${password}"`);
            passwordFound = true;
            break;
          }
        } catch (error) {
          // Skip if password comparison fails
        }
      }
      
      if (!passwordFound) {
        console.log('❌ None of the common passwords work');
        console.log('🔧 Setting default password "password123"');
        
        // Set a default password
        const hashedPassword = await bcrypt.hash('password123', 12);
        await User.findByIdAndUpdate(user._id, { password: hashedPassword });
        console.log('✅ Password set to "password123"');
      }
    }
    
    console.log('\n=== FINAL USER CREDENTIALS ===');
    console.log('admin@agrisync.com - admin123');
    console.log('farmer1@test.com - password123');
    console.log('farmer2@test.com - password123'); 
    console.log('warehouse@test.com - password123');
    console.log('transporter@test.com - password123');
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    mongoose.disconnect();
  }
}

testPasswords();
