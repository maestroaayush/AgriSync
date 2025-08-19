require('dotenv').config();
const mongoose = require('mongoose');
const Warehouse = require('./models/Warehouse');

async function addSampleWarehouses() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Sample warehouses with various locations
    const sampleWarehouses = [
      { location: 'Mumbai Central Warehouse', capacityLimit: 10000 },
      { location: 'Delhi Storage Facility', capacityLimit: 15000 },
      { location: 'Pune Agricultural Hub', capacityLimit: 8000 },
      { location: 'Bangalore Logistics Center', capacityLimit: 12000 },
      { location: 'Chennai Distribution Center', capacityLimit: 9000 },
      { location: 'Hyderabad Storage Complex', capacityLimit: 11000 },
      { location: 'Kolkata Port Warehouse', capacityLimit: 7000 },
      { location: 'Ahmedabad Trade Center', capacityLimit: 6500 },
      { location: 'Jaipur Agricultural Storage', capacityLimit: 5000 },
      { location: 'Lucknow Grain Facility', capacityLimit: 8500 }
    ];

    for (const warehouseData of sampleWarehouses) {
      try {
        const existingWarehouse = await Warehouse.findOne({ location: warehouseData.location });
        if (!existingWarehouse) {
          const warehouse = new Warehouse(warehouseData);
          await warehouse.save();
          console.log(`✅ Added warehouse: ${warehouseData.location}`);
        } else {
          console.log(`⚠️ Warehouse already exists: ${warehouseData.location}`);
        }
      } catch (error) {
        console.error(`❌ Error adding warehouse ${warehouseData.location}:`, error.message);
      }
    }

    console.log('✅ Warehouse initialization complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error connecting to database:', error);
    process.exit(1);
  }
}

addSampleWarehouses();
