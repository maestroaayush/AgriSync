const mongoose = require('mongoose');
require('dotenv').config();

// Sample coordinates for Mumbai/Maharashtra region
const locations = [
  {
    name: "Pune Farmer Market",
    coordinates: { lat: 18.5204, lng: 73.8567 },
    address: "Pune, Maharashtra"
  },
  {
    name: "Nashik Agricultural Hub",
    coordinates: { lat: 19.9975, lng: 73.7898 },
    address: "Nashik, Maharashtra"
  },
  {
    name: "Aurangabad Crop Center",
    coordinates: { lat: 19.8762, lng: 75.3433 },
    address: "Aurangabad, Maharashtra"
  },
  {
    name: "Kolhapur Farm Depot",
    coordinates: { lat: 16.7050, lng: 74.2433 },
    address: "Kolhapur, Maharashtra"
  },
  {
    name: "Satara Organic Farm",
    coordinates: { lat: 17.6799, lng: 74.0200 },
    address: "Satara, Maharashtra"
  }
];

const warehouses = [
  {
    name: "Mumbai Central Warehouse",
    coordinates: { lat: 19.0760, lng: 72.8777 },
    address: "Mumbai, Maharashtra"
  },
  {
    name: "Pune Distribution Center",
    coordinates: { lat: 18.5204, lng: 73.8567 },
    address: "Pune, Maharashtra"
  }
];

async function addDeliveryData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agrisync');
    console.log('Connected to MongoDB');

    const Delivery = require('./models/Delivery');
    const User = require('./models/user');

    // Check if we have users
    let farmer = await User.findOne({ role: 'farmer' });
    let transporter = await User.findOne({ role: 'transporter' });

    if (!farmer) {
      // Create a sample farmer
      farmer = new User({
        name: 'Sample Farmer',
        email: 'farmer@example.com',
        password: 'password123',
        role: 'farmer',
        phone: '9876543210',
        location: 'Pune, Maharashtra'
      });
      await farmer.save();
      console.log('Created sample farmer');
    }

    if (!transporter) {
      // Create a sample transporter
      transporter = new User({
        name: 'Sample Transporter',
        email: 'transporter@example.com',
        password: 'password123',
        role: 'transporter',
        phone: '9876543211',
        location: 'Mumbai, Maharashtra'
      });
      await transporter.save();
      console.log('Created sample transporter');
    }

    // Check existing deliveries
    const existingDeliveries = await Delivery.find({});
    console.log(`Found ${existingDeliveries.length} existing deliveries`);

    if (existingDeliveries.length === 0) {
      // Create sample deliveries with coordinates
      const sampleDeliveries = [
        {
          farmer: farmer._id,
          transporter: transporter._id,
          goodsDescription: "Organic Wheat",
          quantity: 500,
          pickupLocation: locations[0].address,
          dropoffLocation: warehouses[0].address,
          pickupCoordinates: {
            latitude: locations[0].coordinates.lat,
            longitude: locations[0].coordinates.lng,
            address: locations[0].address
          },
          dropoffCoordinates: {
            latitude: warehouses[0].coordinates.lat,
            longitude: warehouses[0].coordinates.lng,
            address: warehouses[0].address
          },
          status: "assigned",
          urgency: "high",
          scheduledPickupTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
          scheduledDeliveryTime: new Date(Date.now() + 6 * 60 * 60 * 1000),
          items: [
            { crop: "Wheat", quantity: 500, unit: "kg", pricePerUnit: 25 }
          ]
        },
        {
          farmer: farmer._id,
          transporter: transporter._id,
          goodsDescription: "Fresh Tomatoes",
          quantity: 200,
          pickupLocation: locations[1].address,
          dropoffLocation: warehouses[1].address,
          pickupCoordinates: {
            latitude: locations[1].coordinates.lat,
            longitude: locations[1].coordinates.lng,
            address: locations[1].address
          },
          dropoffCoordinates: {
            latitude: warehouses[1].coordinates.lat,
            longitude: warehouses[1].coordinates.lng,
            address: warehouses[1].address
          },
          status: "assigned",
          urgency: "normal",
          scheduledPickupTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
          scheduledDeliveryTime: new Date(Date.now() + 8 * 60 * 60 * 1000),
          items: [
            { crop: "Tomatoes", quantity: 200, unit: "kg", pricePerUnit: 40 }
          ]
        },
        {
          farmer: farmer._id,
          transporter: transporter._id,
          goodsDescription: "Onions Bulk",
          quantity: 300,
          pickupLocation: locations[2].address,
          dropoffLocation: warehouses[0].address,
          pickupCoordinates: {
            latitude: locations[2].coordinates.lat,
            longitude: locations[2].coordinates.lng,
            address: locations[2].address
          },
          dropoffCoordinates: {
            latitude: warehouses[0].coordinates.lat,
            longitude: warehouses[0].coordinates.lng,
            address: warehouses[0].address
          },
          status: "assigned",
          urgency: "low",
          scheduledPickupTime: new Date(Date.now() + 6 * 60 * 60 * 1000),
          scheduledDeliveryTime: new Date(Date.now() + 10 * 60 * 60 * 1000),
          items: [
            { crop: "Onions", quantity: 300, unit: "kg", pricePerUnit: 20 }
          ]
        },
        {
          farmer: farmer._id,
          goodsDescription: "Rice Premium",
          quantity: 400,
          pickupLocation: locations[3].address,
          dropoffLocation: warehouses[1].address,
          pickupCoordinates: {
            latitude: locations[3].coordinates.lat,
            longitude: locations[3].coordinates.lng,
            address: locations[3].address
          },
          dropoffCoordinates: {
            latitude: warehouses[1].coordinates.lat,
            longitude: warehouses[1].coordinates.lng,
            address: warehouses[1].address
          },
          status: "pending",
          urgency: "normal",
          items: [
            { crop: "Rice", quantity: 400, unit: "kg", pricePerUnit: 30 }
          ]
        },
        {
          farmer: farmer._id,
          goodsDescription: "Organic Carrots",
          quantity: 150,
          pickupLocation: locations[4].address,
          dropoffLocation: warehouses[0].address,
          pickupCoordinates: {
            latitude: locations[4].coordinates.lat,
            longitude: locations[4].coordinates.lng,
            address: locations[4].address
          },
          dropoffCoordinates: {
            latitude: warehouses[0].coordinates.lat,
            longitude: warehouses[0].coordinates.lng,
            address: warehouses[0].address
          },
          status: "pending",
          urgency: "high",
          items: [
            { crop: "Carrots", quantity: 150, unit: "kg", pricePerUnit: 35 }
          ]
        }
      ];

      for (const deliveryData of sampleDeliveries) {
        const delivery = new Delivery(deliveryData);
        await delivery.save();
        console.log(`Created delivery: ${deliveryData.goodsDescription}`);
      }

      console.log(`\n✅ Created ${sampleDeliveries.length} sample deliveries with coordinates`);
    } else {
      // Update existing deliveries with coordinates if they don't have them
      let updated = 0;
      for (let i = 0; i < existingDeliveries.length && i < locations.length; i++) {
        const delivery = existingDeliveries[i];
        if (!delivery.pickupCoordinates || !delivery.dropoffCoordinates) {
          delivery.pickupCoordinates = {
            latitude: locations[i % locations.length].coordinates.lat,
            longitude: locations[i % locations.length].coordinates.lng,
            address: locations[i % locations.length].address
          };
          delivery.dropoffCoordinates = {
            latitude: warehouses[i % warehouses.length].coordinates.lat,
            longitude: warehouses[i % warehouses.length].coordinates.lng,
            address: warehouses[i % warehouses.length].address
          };
          
          // Update locations if they're missing
          if (!delivery.pickupLocation) {
            delivery.pickupLocation = locations[i % locations.length].address;
          }
          if (!delivery.dropoffLocation) {
            delivery.dropoffLocation = warehouses[i % warehouses.length].address;
          }
          
          await delivery.save();
          updated++;
          console.log(`Updated delivery ${i + 1}: ${delivery.goodsDescription}`);
        }
      }
      console.log(`\n✅ Updated ${updated} existing deliveries with coordinates`);
    }

    // Show final stats
    const finalDeliveries = await Delivery.find({});
    const withCoords = await Delivery.find({
      'pickupCoordinates.latitude': { $exists: true },
      'dropoffCoordinates.latitude': { $exists: true }
    });

    console.log(`\n📊 Final Statistics:`);
    console.log(`Total deliveries: ${finalDeliveries.length}`);
    console.log(`Deliveries with coordinates: ${withCoords.length}`);
    console.log(`Ready for route optimization: ${withCoords.length > 0 ? '✅ Yes' : '❌ No'}`);

    if (withCoords.length > 0) {
      console.log('\n🗺️ Sample delivery coordinates:');
      withCoords.slice(0, 3).forEach((delivery, i) => {
        console.log(`${i + 1}. ${delivery.goodsDescription}:`);
        console.log(`   Pickup: ${delivery.pickupCoordinates.latitude}, ${delivery.pickupCoordinates.longitude}`);
        console.log(`   Dropoff: ${delivery.dropoffCoordinates.latitude}, ${delivery.dropoffCoordinates.longitude}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addDeliveryData();
