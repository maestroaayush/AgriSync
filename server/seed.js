const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/user');
const Inventory = require('./models/Inventory');
const Delivery = require('./models/Delivery');
const Warehouse = require('./models/Warehouse');
const Notification = require('./models/Notification');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const seedData = async () => {
  try {
    console.log('Starting to seed database...');

    // Clear existing data
    await User.deleteMany({});
    await Inventory.deleteMany({});
    await Delivery.deleteMany({});
    await Warehouse.deleteMany({});
    await Notification.deleteMany({});

    // Create test users
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('password123', saltRounds);

    const farmer1 = new User({
      name: 'John Farmer',
      email: 'farmer1@test.com',
      password: hashedPassword,
      role: 'farmer',
      location: 'Farm Valley',
      phone: '555-0101',
      approved: true,
      coordinates: { latitude: 27.6, longitude: 85.2, address: 'Farm Valley' }
    });

    const farmer2 = new User({
      name: 'Mary Grower',
      email: 'farmer2@test.com',
      password: hashedPassword,
      role: 'farmer',
      location: 'Green Hills',
      phone: '555-0102',
      approved: true,
      coordinates: { latitude: 27.8, longitude: 85.4, address: 'Green Hills' }
    });

    const warehouseManager = new User({
      name: 'Bob Manager',
      email: 'warehouse@test.com',
      password: hashedPassword,
      role: 'warehouse_manager',
      location: 'Central Warehouse',
      phone: '555-0201',
      approved: true,
      coordinates: { latitude: 27.7, longitude: 85.3, address: 'Central Warehouse' }
    });

    const transporter = new User({
      name: 'Alex Driver',
      email: 'transporter@test.com',
      password: hashedPassword,
      role: 'transporter',
      location: 'Transport Hub',
      phone: '555-0301',
      approved: true,
      coordinates: { latitude: 27.7, longitude: 85.3, address: 'Transport Hub' },
      currentLocation: { 
        latitude: 27.7, 
        longitude: 85.3, 
        address: 'Transport Hub', 
        lastUpdated: new Date(),
        isOnline: true 
      }
    });

    await Promise.all([farmer1.save(), farmer2.save(), warehouseManager.save(), transporter.save()]);
    console.log('✅ Users created');

    // Create multiple warehouses for better data distribution
    const centralWarehouse = new Warehouse({
      name: 'Central Storage Facility',
      location: 'Central Warehouse',
      manager: warehouseManager._id,
      capacityLimit: 15000,
      currentCapacity: 0,
      contact: {
        email: 'warehouse@test.com',
        phone: '555-0201'
      }
    });

    const secondaryWarehouse = new Warehouse({
      name: 'Secondary Storage Hub',
      location: 'Farm Valley',
      manager: warehouseManager._id,
      capacityLimit: 8000,
      currentCapacity: 0,
      contact: {
        email: 'warehouse@test.com',
        phone: '555-0202'
      }
    });

    await Promise.all([centralWarehouse.save(), secondaryWarehouse.save()]);
    console.log('✅ Warehouses created');

    // Create sample inventory items with dates spread over the last 30 days
    const inventoryItems = [];
    const currentDate = new Date();
    
    // Create farmer inventory items
    for (let i = 0; i < 15; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const itemDate = new Date(currentDate.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
      
      const items = [
        {
          user: Math.random() > 0.5 ? farmer1._id : farmer2._id,
          itemName: 'Wheat',
          quantity: Math.floor(Math.random() * 500) + 100,
          unit: 'kg',
          location: Math.random() > 0.5 ? 'Farm Valley' : 'Green Hills',
          addedByRole: 'farmer',
          createdAt: itemDate,
          updatedAt: itemDate
        },
        {
          user: Math.random() > 0.5 ? farmer1._id : farmer2._id,
          itemName: 'Rice',
          quantity: Math.floor(Math.random() * 300) + 50,
          unit: 'kg',
          location: Math.random() > 0.5 ? 'Farm Valley' : 'Green Hills',
          addedByRole: 'farmer',
          createdAt: itemDate,
          updatedAt: itemDate
        },
        {
          user: Math.random() > 0.5 ? farmer1._id : farmer2._id,
          itemName: 'Tomatoes',
          quantity: Math.floor(Math.random() * 200) + 25,
          unit: 'kg',
          location: Math.random() > 0.5 ? 'Farm Valley' : 'Green Hills',
          addedByRole: 'farmer',
          createdAt: itemDate,
          updatedAt: itemDate
        }
      ];
      
      inventoryItems.push(...items);
    }

    // Create warehouse inventory items for the warehouse manager
    const warehouseItems = ['Wheat', 'Rice', 'Tomatoes', 'Corn', 'Potatoes', 'Barley', 'Soybeans'];
    for (let i = 0; i < 25; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const itemDate = new Date(currentDate.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
      const randomItem = warehouseItems[Math.floor(Math.random() * warehouseItems.length)];
      
      inventoryItems.push({
        user: warehouseManager._id,
        itemName: randomItem,
        quantity: Math.floor(Math.random() * 800) + 200,
        unit: 'kg',
        location: 'Central Warehouse',
        addedByRole: 'warehouse_manager',
        createdAt: itemDate,
        updatedAt: itemDate
      });
    }

    // Create items for secondary warehouse
    for (let i = 0; i < 15; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const itemDate = new Date(currentDate.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
      const randomItem = warehouseItems[Math.floor(Math.random() * warehouseItems.length)];
      
      inventoryItems.push({
        user: warehouseManager._id,
        itemName: randomItem,
        quantity: Math.floor(Math.random() * 400) + 100,
        unit: 'kg',
        location: 'Farm Valley',
        addedByRole: 'warehouse_manager',
        createdAt: itemDate,
        updatedAt: itemDate
      });
    }

    await Inventory.insertMany(inventoryItems);
    console.log('✅ Inventory items created');

    // Create sample deliveries with various statuses and dates
    const deliveries = [];
    const statuses = ['pending', 'assigned', 'in_transit', 'delivered'];
    const goodsTypes = ['Wheat', 'Rice', 'Tomatoes', 'Corn', 'Potatoes', 'Barley', 'Soybeans', 'Onions', 'Carrots', 'Cabbage'];
    const locations = ['Farm Valley', 'Green Hills', 'Riverside Farm', 'Mountain View', 'Sunset Fields'];
    const destinations = ['Central Warehouse', 'Farm Valley', 'Green Market', 'City Store', 'Processing Plant'];
const urgencyLevels = ['low', 'normal', 'high', 'urgent'];
    
    // Create deliveries specifically for transporter (first 10) with varied statuses
    for (let i = 0; i < 10; i++) {
      const daysAgo = Math.floor(Math.random() * 45);
      const deliveryDate = new Date(currentDate.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
      
      // Ensure good status distribution for transporter deliveries
      let status;
      if (i < 3) status = 'delivered';        // First 3 are delivered
      else if (i < 5) status = 'in_transit'; // Next 2 are in transit
      else if (i < 8) status = 'assigned';   // Next 3 are assigned
      else status = 'pending';                // Last 2 are pending
      
      deliveries.push({
        farmer: Math.random() > 0.5 ? farmer1._id : farmer2._id,
        pickupLocation: locations[Math.floor(Math.random() * locations.length)],
        dropoffLocation: destinations[Math.floor(Math.random() * destinations.length)],
        goodsDescription: goodsTypes[Math.floor(Math.random() * goodsTypes.length)],
        quantity: Math.floor(Math.random() * 500) + 50,
        status: status,
        transporter: transporter._id, // Always assign to our transporter
        receivedByWarehouse: status === 'delivered' ? true : Math.random() > 0.5,
        urgency: urgencyLevels[Math.floor(Math.random() * urgencyLevels.length)],
        pickupLat: 27.7 + (Math.random() - 0.5) * 0.5, // Random coordinates around base location
        pickupLng: 85.3 + (Math.random() - 0.5) * 0.5,
        dropoffLat: 27.7 + (Math.random() - 0.5) * 0.5,
        dropoffLng: 85.3 + (Math.random() - 0.5) * 0.5,
        estimatedDistance: Math.floor(Math.random() * 150) + 10, // Distance in km
        estimatedTime: Math.floor(Math.random() * 6) + 1, // Time in hours
        notes: ['Handle with care', 'Fragile items', 'Keep dry', 'Temperature sensitive', ''][Math.floor(Math.random() * 5)],
        createdAt: deliveryDate,
        updatedAt: deliveryDate
      });
    }
    
    // Create additional deliveries (some for other transporters, some unassigned)
    for (let i = 10; i < 35; i++) {
      const daysAgo = Math.floor(Math.random() * 45);
      const deliveryDate = new Date(currentDate.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
      
      // Ensure better status distribution for other deliveries  
      let randomStatus;
      if (i < 18) randomStatus = 'delivered';        // Some delivered
      else if (i < 25) randomStatus = 'in_transit'; // Some in transit
      else if (i < 30) randomStatus = 'assigned';   // Some assigned
      else randomStatus = 'pending';                // Some pending
      
      const isAssignedToTransporter = Math.random() > 0.7; // 30% chance of being assigned to our transporter
      
      deliveries.push({
        farmer: Math.random() > 0.5 ? farmer1._id : farmer2._id,
        pickupLocation: locations[Math.floor(Math.random() * locations.length)],
        dropoffLocation: destinations[Math.floor(Math.random() * destinations.length)],
        goodsDescription: goodsTypes[Math.floor(Math.random() * goodsTypes.length)],
        quantity: Math.floor(Math.random() * 500) + 50,
        status: randomStatus,
        transporter: isAssignedToTransporter ? transporter._id : null,
        receivedByWarehouse: randomStatus === 'delivered' ? true : Math.random() > 0.5,
        urgency: urgencyLevels[Math.floor(Math.random() * urgencyLevels.length)],
        pickupLat: 27.7 + (Math.random() - 0.5) * 0.5, // Random coordinates around base location
        pickupLng: 85.3 + (Math.random() - 0.5) * 0.5,
        dropoffLat: 27.7 + (Math.random() - 0.5) * 0.5,
        dropoffLng: 85.3 + (Math.random() - 0.5) * 0.5,
        estimatedDistance: Math.floor(Math.random() * 150) + 10, // Distance in km
        estimatedTime: Math.floor(Math.random() * 6) + 1, // Time in hours
        notes: ['Handle with care', 'Fragile items', 'Keep dry', 'Temperature sensitive', ''][Math.floor(Math.random() * 5)],
        createdAt: deliveryDate,
        updatedAt: deliveryDate
      });
    }

    await Delivery.insertMany(deliveries);
    console.log('✅ Deliveries created');

    // Create sample notifications for all user types
    const notifications = [
      // Farmer notifications
      {
        user: farmer1._id,
        title: 'Inventory Low Stock Alert',
        message: 'Your wheat inventory is running low. Consider restocking.',
        type: 'warning',
        read: false
      },
      {
        user: farmer2._id,
        title: 'Delivery Completed',
        message: 'Your rice delivery has been completed successfully.',
        type: 'success',
        read: false
      },
      {
        user: farmer1._id,
        title: 'New Order Request',
        message: 'You have received a new order for tomatoes.',
        type: 'info',
        read: true
      },
      // Transporter notifications
      {
        user: transporter._id,
        title: 'New Delivery Assignment',
        message: 'You have been assigned a new delivery: 250kg Wheat from Farm Valley to Central Warehouse.',
        type: 'info',
        read: false
      },
      {
        user: transporter._id,
        title: 'Route Optimization Available',
        message: 'We found a more efficient route for your delivery to Green Market. Check your routes tab.',
        type: 'success',
        read: false
      },
      {
        user: transporter._id,
        title: 'Fuel Efficiency Alert',
        message: 'Your fuel efficiency has improved by 8% this month. Great job!',
        type: 'success',
        read: true
      },
      {
        user: transporter._id,
        title: 'Delivery Reminder',
        message: 'You have 3 deliveries scheduled for pickup today. Please check your dashboard.',
        type: 'warning',
        read: false
      },
      // Warehouse manager notifications
      {
        user: warehouseManager._id,
        title: 'Capacity Warning',
        message: 'Central Warehouse is at 85% capacity. Consider redistributing stock.',
        type: 'warning',
        read: false
      },
      {
        user: warehouseManager._id,
        title: 'Incoming Delivery',
        message: 'Delivery of 400kg Rice is arriving at Central Warehouse in 2 hours.',
        type: 'info',
        read: false
      }
    ];

    await Notification.insertMany(notifications);
    console.log('✅ Notifications created');

    console.log('\n🎉 Database seeded successfully!');
    console.log('\nTest login credentials:');
    console.log('Farmer 1: farmer1@test.com / password123');
    console.log('Farmer 2: farmer2@test.com / password123');
    console.log('Warehouse Manager: warehouse@test.com / password123');
    console.log('Transporter: transporter@test.com / password123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Run the seed script
seedData();
