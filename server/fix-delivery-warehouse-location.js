const mongoose = require('mongoose');
require('dotenv').config();

const Delivery = require('./models/Delivery');
const Warehouse = require('./models/Warehouse');

async function fixWarehouseLocationFields() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    // Find all deliveries with string warehouseLocation
    const deliveriesWithStringWarehouse = await Delivery.find({
      warehouseLocation: { $type: 'string' }
    });
    
    console.log(`Found ${deliveriesWithStringWarehouse.length} deliveries with string warehouseLocation`);
    
    let fixed = 0;
    let removed = 0;
    
    for (const delivery of deliveriesWithStringWarehouse) {
      try {
        console.log(`Processing delivery ${delivery._id} with warehouseLocation: "${delivery.warehouseLocation}"`);
        
        // Try to find the corresponding warehouse
        const warehouse = await Warehouse.findOne({ location: delivery.warehouseLocation });
        
        if (warehouse) {
          // Update to ObjectId
          await Delivery.updateOne(
            { _id: delivery._id },
            { $set: { warehouseLocation: warehouse._id } }
          );
          console.log(`✅ Fixed delivery ${delivery._id}: "${delivery.warehouseLocation}" -> ${warehouse._id}`);
          fixed++;
        } else {
          // Remove invalid field
          await Delivery.updateOne(
            { _id: delivery._id },
            { $unset: { warehouseLocation: 1 } }
          );
          console.log(`⚠️ Removed invalid warehouseLocation from delivery ${delivery._id}: "${delivery.warehouseLocation}"`);
          removed++;
        }
      } catch (updateError) {
        console.error(`❌ Failed to fix delivery ${delivery._id}:`, updateError.message);
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`✅ Fixed: ${fixed} deliveries`);
    console.log(`⚠️ Removed: ${removed} invalid fields`);
    console.log(`❌ Total processed: ${deliveriesWithStringWarehouse.length} deliveries`);
    
    await mongoose.disconnect();
    console.log('Database cleanup completed');
    
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

fixWarehouseLocationFields();
