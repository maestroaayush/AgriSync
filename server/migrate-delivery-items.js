const mongoose = require('mongoose');
const Delivery = require('./models/Delivery');
require('dotenv').config();

async function migrateDeliveryItems() {
  try {
    console.log('🚀 Starting delivery items migration...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agrisync');
    console.log('✅ Connected to MongoDB');

    // Find all deliveries that don't have items array or have empty items array
    const deliveries = await Delivery.find({
      $or: [
        { items: { $exists: false } },
        { items: { $size: 0 } },
        { items: null }
      ]
    });

    console.log(`📦 Found ${deliveries.length} deliveries to migrate`);

    if (deliveries.length === 0) {
      console.log('✅ No deliveries need migration');
      return;
    }

    let migratedCount = 0;
    
    for (const delivery of deliveries) {
      try {
        // Create items array based on existing delivery data
        const items = [];
        
        if (delivery.goodsDescription && delivery.quantity) {
          // Try to parse if goodsDescription contains multiple items
          const description = delivery.goodsDescription.toLowerCase();
          
          // Common crop names and their variations
          const cropNames = [
            'rice', 'wheat', 'corn', 'maize', 'potato', 'tomato', 'onion', 'carrot',
            'cabbage', 'cauliflower', 'spinach', 'lettuce', 'beans', 'peas',
            'lentils', 'chickpeas', 'soybeans', 'sugarcane', 'cotton', 'jute',
            'tea', 'coffee', 'spices', 'herbs', 'fruits', 'vegetables', 'grains',
            'pulses', 'seeds', 'nuts', 'oil', 'milk', 'eggs', 'meat', 'fish'
          ];
          
          // Check if description contains a known crop name
          let cropName = 'Agricultural Product'; // default
          for (const crop of cropNames) {
            if (description.includes(crop)) {
              cropName = crop.charAt(0).toUpperCase() + crop.slice(1);
              break;
            }
          }
          
          // If no specific crop found, use the goodsDescription as is
          if (cropName === 'Agricultural Product' && delivery.goodsDescription) {
            cropName = delivery.goodsDescription;
          }
          
          items.push({
            crop: cropName,
            productName: delivery.goodsDescription,
            quantity: delivery.quantity || 1,
            unit: delivery.unit || 'kg',
            description: `Migrated from delivery ${delivery._id}`
          });
        }
        
        // Update the delivery with the items array
        await Delivery.findByIdAndUpdate(delivery._id, {
          $set: { items: items }
        });
        
        migratedCount++;
        console.log(`✅ Migrated delivery ${delivery._id}: ${items[0]?.crop || 'Unknown'} (${items[0]?.quantity || 0} ${items[0]?.unit || 'units'})`);
        
      } catch (error) {
        console.error(`❌ Failed to migrate delivery ${delivery._id}:`, error.message);
      }
    }
    
    console.log(`🎉 Migration completed! ${migratedCount}/${deliveries.length} deliveries migrated successfully`);
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the migration if this script is called directly
if (require.main === module) {
  migrateDeliveryItems();
}

module.exports = migrateDeliveryItems;
