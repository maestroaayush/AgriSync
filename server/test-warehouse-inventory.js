const mongoose = require('mongoose');
const Inventory = require('./models/Inventory');
const Warehouse = require('./models/Warehouse');
const User = require('./models/user');

// MongoDB connection
const MONGODB_URI = 'mongodb://localhost:27017/agrisync';

async function testWarehouseInventory() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find a warehouse manager
    const warehouseManager = await User.findOne({ role: 'warehouse_manager' });
    if (!warehouseManager) {
      console.log('❌ No warehouse manager found in database');
      return;
    }
    console.log(`👤 Found warehouse manager: ${warehouseManager.name} at location: ${warehouseManager.location}`);

    // Check if warehouse exists for this manager's location
    let warehouse = await Warehouse.findOne({ location: warehouseManager.location });
    if (!warehouse) {
      console.log(`⚠️ No warehouse found for location: ${warehouseManager.location}`);
      // Create one if it doesn't exist
      warehouse = new Warehouse({
        location: warehouseManager.location,
        capacityLimit: 10000,
        manager: warehouseManager._id,
        isManuallyAdded: true,
        addedBy: warehouseManager._id
      });
      await warehouse.save();
      console.log(`✅ Created warehouse for location: ${warehouseManager.location}`);
    } else {
      console.log(`✅ Warehouse exists for location: ${warehouse.location}`);
      // Update manager if not set
      if (!warehouse.manager) {
        warehouse.manager = warehouseManager._id;
        await warehouse.save();
        console.log(`✅ Updated warehouse manager assignment`);
      }
    }

    // Check current inventory at this location
    const currentInventory = await Inventory.find({ location: warehouseManager.location });
    console.log(`\n📦 Current inventory at ${warehouseManager.location}: ${currentInventory.length} items`);
    
    if (currentInventory.length > 0) {
      console.log('Current items:');
      currentInventory.forEach(item => {
        console.log(`  - ${item.itemName}: ${item.quantity} ${item.unit} (added by role: ${item.addedByRole})`);
      });
    }

    // Test adding a new item
    console.log('\n🧪 Testing manual inventory addition...');
    const testItem = new Inventory({
      user: warehouseManager._id,
      itemName: 'Test Rice ' + Date.now(),
      quantity: 100,
      unit: 'kg',
      location: warehouseManager.location,
      category: 'grains',
      addedByRole: 'warehouse_manager',
      status: 'available',
      manualEntry: true,
      manualEntryReason: 'Test addition',
      description: 'Test item added via script'
    });

    await testItem.save();
    console.log(`✅ Test item added successfully with ID: ${testItem._id}`);

    // Verify it's in the inventory
    const updatedInventory = await Inventory.find({ location: warehouseManager.location });
    console.log(`\n📦 Updated inventory count: ${updatedInventory.length} items`);

    // Find the test item
    const foundTestItem = await Inventory.findById(testItem._id);
    if (foundTestItem) {
      console.log(`✅ Test item found in database:`, {
        id: foundTestItem._id,
        name: foundTestItem.itemName,
        quantity: foundTestItem.quantity,
        location: foundTestItem.location
      });
    } else {
      console.log('❌ Test item not found in database');
    }

    console.log('\n✅ Test completed successfully!');
    console.log('\n📝 Summary:');
    console.log(`  - Warehouse Manager: ${warehouseManager.name}`);
    console.log(`  - Location: ${warehouseManager.location}`);
    console.log(`  - Warehouse exists: Yes`);
    console.log(`  - Total inventory items: ${updatedInventory.length}`);
    console.log(`  - Test item added: Yes`);
    console.log('\n🔍 To verify in the app:');
    console.log('  1. Login as warehouse manager');
    console.log('  2. Check inventory list - you should see all items for this location');
    console.log('  3. The fetchInventory() function should use: /api/inventory/location/${user.location}');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the test
testWarehouseInventory();
