const mongoose = require('mongoose');
const Inventory = require('./models/Inventory');

// MongoDB connection
const MONGODB_URI = 'mongodb://localhost:27017/agrisync';

async function cleanupTestInventory() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Remove test items
    const testItemsDeleted = await Inventory.deleteMany({
      itemName: { $regex: /^Test Rice/i }
    });
    console.log(`🗑️ Deleted ${testItemsDeleted.deletedCount} test items`);

    // Show remaining inventory by location
    const locations = await Inventory.distinct('location');
    console.log('\n📦 Remaining inventory by location:');
    
    for (const location of locations) {
      const items = await Inventory.find({ location });
      console.log(`\n📍 ${location}: ${items.length} items`);
      items.forEach(item => {
        console.log(`  - ${item.itemName}: ${item.quantity} ${item.unit}`);
      });
    }

    console.log('\n✅ Cleanup completed!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the cleanup
cleanupTestInventory();
