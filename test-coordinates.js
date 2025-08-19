const mongoose = require('mongoose');
require('dotenv').config();

async function checkCoordinates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agrisync');
    console.log('Connected to MongoDB');
    
    const Delivery = require('./server/models/Delivery');
    
    const deliveries = await Delivery.find({ status: 'assigned' }).limit(2);
    
    console.log('Sample deliveries with coordinates:');
    deliveries.forEach((delivery, index) => {
      console.log(`\n--- Delivery ${index + 1} ---`);
      console.log('ID:', delivery._id);
      console.log('Description:', delivery.goodsDescription);
      console.log('Status:', delivery.status);
      console.log('Pickup Location:', delivery.pickupLocation);
      console.log('Pickup Coords:', JSON.stringify(delivery.pickupCoordinates, null, 2));
      console.log('Dropoff Location:', delivery.dropoffLocation);
      console.log('Dropoff Coords:', JSON.stringify(delivery.dropoffCoordinates, null, 2));
    });
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkCoordinates();
