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

async function addCoordinatesToDeliveries() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agrisync');
    console.log('Connected to MongoDB');

    const Delivery = require('./models/Delivery');
    const User = require('./models/user');

    // Get a farmer and transporter for sample deliveries
    const farmer = await User.findOne({ role: 'farmer' });
    const transporter = await User.findOne({ role: 'transporter' });

    if (!farmer || !transporter) {
      console.log('No farmer or transporter found. Creating sample deliveries anyway...');
    }

    // Check existing deliveries
    const existingDeliveries = await Delivery.find({});
    console.log(`Found ${existingDeliveries.length} existing deliveries`);

    if (existingDeliveries.length === 0) {
      // Create sample deliveries with coordinates
      const sampleDeliveries = [
        {
          farmer: farmer?._id,
          transporter: transporter?._id,
          goodsDescription: "Organic Wheat",
          quantity: "500 kg",
          pickupLocation: locations[0].address,
          dropoffLocation: warehouses[0].address,
          pickupCoordinates: locations[0].coordinates,
          dropoffCoordinates: warehouses[0].coordinates,
          status: "assigned",
          urgency: "high",
          scheduledPickupTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
          scheduledDeliveryTime: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours from now
          items: [
            { crop: "Wheat", quantity: 500, unit: "kg", pricePerUnit: 25 }
          ]
        },
        {
          farmer: farmer?._id,
          transporter: transporter?._id,
          goodsDescription: "Fresh Tomatoes",
          quantity: "200 kg",
          pickupLocation: locations[1].address,
          dropoffLocation: warehouses[1].address,
          pickupCoordinates: locations[1].coordinates,
          dropoffCoordinates: warehouses[1].coordinates,
          status: "assigned",
          urgency: "medium",
          scheduledPickupTime: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
          scheduledDeliveryTime: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours from now
          items: [
            { crop: "Tomatoes", quantity: 200, unit: "kg", pricePerUnit: 40 }
          ]
        },
        {
          farmer: farmer?._id,
          transporter: transporter?._id,
          goodsDescription: "Onions Bulk",
          quantity: "300 kg",
          pickupLocation: locations[2].address,
          dropoffLocation: warehouses[0].address,
          pickupCoordinates: locations[2].coordinates,
          dropoffCoordinates: warehouses[0].coordinates,
          status: "assigned",
          urgency: "low",
          scheduledPickupTime: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours from now
          scheduledDeliveryTime: new Date(Date.now() + 10 * 60 * 60 * 1000), // 10 hours from now
          items: [
            { crop: "Onions", quantity: 300, unit: "kg", pricePerUnit: 20 }
          ]
        },
        {
          farmer: farmer?._id,
          goodsDescription: "Rice Premium",
          quantity: "400 kg",
          pickupLocation: locations[3].address,
          dropoffLocation: warehouses[1].address,
          pickupCoordinates: locations[3].coordinates,
          dropoffCoordinates: warehouses[1].coordinates,
          status: "pending",
          urgency: "medium",
          items: [
            { crop: "Rice", quantity: 400, unit: "kg", pricePerUnit: 30 }
          ]
        },
        {
          farmer: farmer?._id,
          goodsDescription: "Organic Carrots",
          quantity: "150 kg",
          pickupLocation: locations[4].address,
          dropoffLocation: warehouses[0].address,
          pickupCoordinates: locations[4].coordinates,
          dropoffCoordinates: warehouses[0].coordinates,
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
          delivery.pickupCoordinates = locations[i % locations.length].coordinates;
          delivery.dropoffCoordinates = warehouses[i % warehouses.length].coordinates;
          
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
      pickupCoordinates: { $exists: true },
      dropoffCoordinates: { $exists: true }
    });

    console.log(`\n📊 Final Statistics:`);
    console.log(`Total deliveries: ${finalDeliveries.length}`);
    console.log(`Deliveries with coordinates: ${withCoords.length}`);
    console.log(`Ready for route optimization: ${withCoords.length > 0 ? '✅ Yes' : '❌ No'}`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addCoordinatesToDeliveries();
