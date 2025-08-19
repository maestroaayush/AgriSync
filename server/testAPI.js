require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/user');
const Inventory = require('./models/Inventory');

async function testAPI() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Create or find a test farmer user
    let farmer = await User.findOne({ email: 'test.farmer@example.com' });
    
    if (!farmer) {
      const hashedPassword = await bcrypt.hash('password123', 12);
      farmer = new User({
        name: 'Test Farmer',
        email: 'test.farmer@example.com',
        password: hashedPassword,
        role: 'farmer',
        location: 'Mumbai Central Warehouse',
        approved: true,
        emailVerified: true
      });
      await farmer.save();
      console.log('✅ Created test farmer user');
    } else {
      console.log('✅ Test farmer user already exists');
    }

    // Generate JWT token for testing
    const token = jwt.sign(
      { id: farmer._id, role: farmer.role, email: farmer.email },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '1h' }
    );
    
    console.log('🔑 Test user login credentials:');
    console.log(`Email: test.farmer@example.com`);
    console.log(`Password: password123`);
    console.log(`JWT Token: ${token.substring(0, 50)}...`);
    
    // Test inventory addition
    console.log('\n📦 Testing inventory addition...');
    
    const testInventoryItem = {
      itemName: 'Test Wheat',
      quantity: 100,
      unit: 'kg',
      location: 'Mumbai Central Warehouse',
      category: 'grains',
      price: 25.50,
      qualityGrade: 'A',
      description: 'High quality wheat for testing'
    };

    try {
      const newItem = new Inventory({
        user: farmer._id,
        itemName: testInventoryItem.itemName,
        quantity: parseInt(testInventoryItem.quantity),
        unit: testInventoryItem.unit,
        location: testInventoryItem.location,
        category: testInventoryItem.category || 'other',
        price: parseFloat(testInventoryItem.price) || 0,
        qualityGrade: testInventoryItem.qualityGrade || 'Standard',
        description: testInventoryItem.description || '',
        addedByRole: farmer.role
      });
      
      await newItem.save();
      console.log('✅ Inventory item created successfully:', {
        id: newItem._id,
        itemName: newItem.itemName,
        quantity: newItem.quantity
      });
    } catch (err) {
      console.error('❌ Error creating inventory item:', err.message);
    }

    // Check existing inventory
    const existingInventory = await Inventory.find({ user: farmer._id });
    console.log(`📊 Farmer has ${existingInventory.length} inventory items`);

    console.log('\n🚀 You can now test the farmer dashboard with:');
    console.log('1. Open http://localhost:5173 in your browser');
    console.log('2. Login with: test.farmer@example.com / password123');
    console.log('3. Try adding inventory items');
    console.log('4. Try requesting deliveries');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testAPI();
