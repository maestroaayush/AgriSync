const mongoose = require('mongoose');
require('dotenv').config();

async function checkCoordinates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agrisync');
    console.log('Connected to MongoDB');
    
    const Delivery = require('./models/Delivery');
    const User = require('./models/user');
    
    // Check for transporters
    const transporter = await User.findOne({ role: 'transporter' });
    console.log('\nTransporter found:', transporter ? transporter.name : 'None');
    if (transporter) {
      console.log('Transporter ID:', transporter._id);
      console.log('Transporter Email:', transporter.email);
    }
    
    const deliveries = await Delivery.find({ status: 'assigned' }).populate('transporter', 'name').limit(3);
    
    console.log('Sample deliveries with coordinates:');
    deliveries.forEach((delivery, index) => {
      console.log(`\n--- Delivery ${index + 1} ---`);
      console.log('ID:', delivery._id);
      console.log('Description:', delivery.goodsDescription);
      console.log('Status:', delivery.status);
      console.log('Transporter:', delivery.transporter ? delivery.transporter.name : 'None');
      console.log('Pickup Location:', delivery.pickupLocation);
      console.log('Pickup Coords:', JSON.stringify(delivery.pickupCoordinates, null, 2));
      console.log('Dropoff Location:', delivery.dropoffLocation);
      console.log('Dropoff Coords:', JSON.stringify(delivery.dropoffCoordinates, null, 2));
    });
    
    // Check if transporter has deliveries
    if (transporter) {
      const transporterDeliveries = await Delivery.find({ transporter: transporter._id });
      console.log(`\nTransporter ${transporter.name} has ${transporterDeliveries.length} deliveries assigned`);
    }
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkCoordinates();
