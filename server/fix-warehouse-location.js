const mongoose = require('mongoose');
const User = require('./models/user');
const Warehouse = require('./models/Warehouse');
const Inventory = require('./models/Inventory');

// MongoDB connection
const MONGODB_URI = 'mongodb://localhost:27017/agrisync';

async function fixWarehouseLocation() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all warehouse managers
    const warehouseManagers = await User.find({ role: 'warehouse_manager' });
    console.log(`\n👥 Found ${warehouseManagers.length} warehouse manager(s):`);

    for (const manager of warehouseManagers) {
      console.log(`\n👤 Warehouse Manager: ${manager.name}`);
      console.log(`  - Email: ${manager.email}`);
      console.log(`  - Current Location: ${manager.location || 'NOT SET'}`);

      // If location is not set, set a default one
      if (!manager.location) {
        manager.location = 'Main Warehouse';
        await manager.save();
        console.log(`  ✅ Set default location to: ${manager.location}`);
      }

      // Check if warehouse exists for this location
      let warehouse = await Warehouse.findOne({ location: manager.location });
      if (!warehouse) {
        console.log(`  ⚠️ No warehouse found for location: ${manager.location}`);
        // Create warehouse
        warehouse = new Warehouse({
          location: manager.location,
          capacityLimit: 10000,
          manager: manager._id,
          isManuallyAdded: true,
          addedBy: manager._id,
          name: `${manager.location} Warehouse`
        });
        await warehouse.save();
        console.log(`  ✅ Created warehouse for location: ${manager.location}`);
      } else {
        console.log(`  ✅ Warehouse exists for location: ${warehouse.location}`);
        // Ensure manager is assigned
        if (!warehouse.manager || warehouse.manager.toString() !== manager._id.toString()) {
          warehouse.manager = manager._id;
          await warehouse.save();
          console.log(`  ✅ Updated warehouse manager assignment`);
        }
      }

      // Check inventory at this location
      const inventoryCount = await Inventory.countDocuments({ location: manager.location });
      console.log(`  📦 Inventory items at ${manager.location}: ${inventoryCount}`);

      // List all unique locations in inventory
      const allLocations = await Inventory.distinct('location');
      if (allLocations.length > 0) {
        console.log(`  📍 All unique inventory locations in database: ${allLocations.join(', ')}`);
      }
    }

    // Check for orphaned inventory (inventory without a matching warehouse)
    console.log('\n🔍 Checking for orphaned inventory...');
    const allInventoryLocations = await Inventory.distinct('location');
    const allWarehouseLocations = await Warehouse.distinct('location');
    
    const orphanedLocations = allInventoryLocations.filter(loc => !allWarehouseLocations.includes(loc));
    if (orphanedLocations.length > 0) {
      console.log(`⚠️ Found inventory at locations without warehouses: ${orphanedLocations.join(', ')}`);
      for (const location of orphanedLocations) {
        const count = await Inventory.countDocuments({ location });
        console.log(`  - ${location}: ${count} items`);
      }
    } else {
      console.log('✅ No orphaned inventory found');
    }

    console.log('\n✅ Location consistency check completed!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the fix
fixWarehouseLocation();
