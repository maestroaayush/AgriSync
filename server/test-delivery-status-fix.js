const mongoose = require('mongoose');
require('dotenv').config();

async function testDeliveryStatusUpdate() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      retryWrites: true,
    });
    console.log('✅ Connected to MongoDB');
    
    const Delivery = require('./models/Delivery');
    
    // Get the specific delivery that's causing issues
    const deliveryId = '68a7d8925eca7e90bd690bc1';
    console.log('🔍 Looking for delivery:', deliveryId);
    
    const delivery = await Delivery.findById(deliveryId);
    
    if (!delivery) {
      console.log('❌ Delivery not found');
      return;
    }
    
    console.log('📦 Current delivery details:');
    console.log('- ID:', delivery._id);
    console.log('- Status:', delivery.status);
    console.log('- warehouseLocation type:', typeof delivery.warehouseLocation);
    console.log('- warehouseLocation value:', delivery.warehouseLocation);
    console.log('- warehouseLocation is ObjectId?:', mongoose.Types.ObjectId.isValid(delivery.warehouseLocation));
    
    // Simulate the validation logic from our fix
    console.log('\n🔧 Testing warehouseLocation validation logic...');
    
    if (delivery.warehouseLocation) {
      if (typeof delivery.warehouseLocation === 'string') {
        console.log('🔧 warehouseLocation is string, needs conversion');
        
        if (mongoose.Types.ObjectId.isValid(delivery.warehouseLocation)) {
          console.log('✅ String is valid ObjectId, can convert');
          // Test conversion
          const converted = new mongoose.Types.ObjectId(delivery.warehouseLocation);
          console.log('✅ Converted to:', converted);
        } else {
          console.log('⚠️ String is not valid ObjectId, would need warehouse lookup');
        }
      } else if (!mongoose.Types.ObjectId.isValid(delivery.warehouseLocation)) {
        console.log('⚠️ warehouseLocation is not valid ObjectId');
      } else {
        console.log('✅ warehouseLocation is already valid ObjectId');
      }
    } else {
      console.log('ℹ️ warehouseLocation is not set');
    }
    
    // Test saving the delivery (without actually modifying it)
    console.log('\n💾 Testing delivery save operation...');
    try {
      // Just validate without saving
      await delivery.validate();
      console.log('✅ Delivery validation passed - save would succeed');
    } catch (validationError) {
      console.log('❌ Delivery validation failed:', validationError.message);
      console.log('Error details:', validationError);
    }
    
    console.log('\n🎯 Test completed successfully');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Error details:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔗 MongoDB connection closed');
  }
}

testDeliveryStatusUpdate();
