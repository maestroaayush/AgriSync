const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('./models/user');
const Inventory = require('./models/Inventory');
const Delivery = require('./models/Delivery');
const Warehouse = require('./models/Warehouse');
const Notification = require('./models/Notification');

const seedFarmerData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Check if farmer already exists
    let farmer = await User.findOne({ email: 'farmer@test.com' });
    
    if (!farmer) {
      console.log('👤 Creating test farmer account...');
      const hashedPassword = await bcrypt.hash('password123', 12);
      
      farmer = new User({
        name: 'John Farmer',
        email: 'farmer@test.com',
        password: hashedPassword,
        role: 'farmer',
        location: 'Mumbai, Maharashtra',
        coordinates: [19.0760, 72.8777],
        phone: '+91-9876543210',
        isVerified: true
      });
      
      await farmer.save();
      console.log('✅ Farmer account created: farmer@test.com / password123');
    } else {
      console.log('👤 Using existing farmer account');
    }

    // Create warehouse if it doesn't exist
    let warehouse = await Warehouse.findOne({ location: 'Mumbai, Maharashtra' });
    if (!warehouse) {
      console.log('🏢 Creating warehouse...');
      warehouse = new Warehouse({
        location: 'Mumbai, Maharashtra',
        capacityLimit: 50000
      });
      await warehouse.save();
      console.log('✅ Warehouse created for Mumbai');
    }

    // Clear existing test data for this farmer
    await Inventory.deleteMany({ user: farmer._id });
    await Delivery.deleteMany({ farmer: farmer._id });
    await Notification.deleteMany({ user: farmer._id });

    // Add sample inventory data
    console.log('📦 Adding sample inventory...');
    const inventoryItems = [
      {
        user: farmer._id,
        itemName: 'Rice',
        quantity: 500,
        unit: 'kg',
        location: 'Mumbai, Maharashtra',
        category: 'grains',
        price: 45,
        qualityGrade: 'Premium',
        description: 'Basmati rice, premium quality',
        addedByRole: 'farmer'
      },
      {
        user: farmer._id,
        itemName: 'Wheat',
        quantity: 300,
        unit: 'kg',
        location: 'Mumbai, Maharashtra',
        category: 'grains',
        price: 35,
        qualityGrade: 'A',
        description: 'Organic wheat flour grade',
        addedByRole: 'farmer'
      },
      {
        user: farmer._id,
        itemName: 'Tomatoes',
        quantity: 150,
        unit: 'kg',
        location: 'Mumbai, Maharashtra',
        category: 'vegetables',
        price: 25,
        qualityGrade: 'A',
        description: 'Fresh red tomatoes',
        addedByRole: 'farmer'
      },
      {
        user: farmer._id,
        itemName: 'Onions',
        quantity: 200,
        unit: 'kg',
        location: 'Mumbai, Maharashtra',
        category: 'vegetables',
        price: 20,
        qualityGrade: 'Standard',
        description: 'Yellow onions, locally grown',
        addedByRole: 'farmer'
      },
      {
        user: farmer._id,
        itemName: 'Mangoes',
        quantity: 100,
        unit: 'kg',
        location: 'Mumbai, Maharashtra',
        category: 'fruits',
        price: 60,
        qualityGrade: 'Premium',
        description: 'Alphonso mangoes, export quality',
        addedByRole: 'farmer'
      }
    ];

    for (const item of inventoryItems) {
      await new Inventory(item).save();
    }
    console.log(`✅ Added ${inventoryItems.length} inventory items`);

    // Add sample delivery requests
    console.log('🚚 Adding sample deliveries...');
    const deliveries = [
      {
        farmer: farmer._id,
        pickupLocation: 'Mumbai, Maharashtra',
        dropoffLocation: 'Delhi Market',
        goodsDescription: 'Rice',
        quantity: 100,
        urgency: 'normal',
        status: 'pending'
      },
      {
        farmer: farmer._id,
        pickupLocation: 'Mumbai, Maharashtra',
        dropoffLocation: 'Pune Wholesale Market',
        goodsDescription: 'Tomatoes',
        quantity: 50,
        urgency: 'urgent',
        status: 'in_transit'
      },
      {
        farmer: farmer._id,
        pickupLocation: 'Mumbai, Maharashtra',
        dropoffLocation: 'Nashik Distribution Center',
        goodsDescription: 'Wheat',
        quantity: 75,
        urgency: 'normal',
        status: 'delivered'
      }
    ];

    for (const delivery of deliveries) {
      await new Delivery(delivery).save();
    }
    console.log(`✅ Added ${deliveries.length} delivery requests`);

    // Add sample notifications
    console.log('🔔 Adding sample notifications...');
    const notifications = [
      {
        user: farmer._id,
        title: 'Welcome to AgriSync!',
        message: 'Your account has been set up successfully. Start managing your inventory and deliveries.',
        type: 'info',
        isRead: false
      },
      {
        user: farmer._id,
        title: 'Low Stock Alert',
        message: 'Tomatoes stock is running low (150 kg remaining)',
        type: 'warning',
        isRead: false
      },
      {
        user: farmer._id,
        title: 'Delivery Completed',
        message: 'Your wheat delivery to Nashik Distribution Center has been completed successfully.',
        type: 'success',
        isRead: true
      }
    ];

    for (const notification of notifications) {
      await new Notification(notification).save();
    }
    console.log(`✅ Added ${notifications.length} notifications`);

    console.log('\n🎉 Sample data setup complete!');
    console.log('👤 Login credentials:');
    console.log('   Email: farmer@test.com');
    console.log('   Password: password123');
    console.log('   Role: farmer');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up sample data:', error);
    process.exit(1);
  }
};

seedFarmerData();
