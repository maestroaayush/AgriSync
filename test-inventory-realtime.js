const mongoose = require('mongoose');
const io = require('socket.io-client');

// Import models
const User = require('./server/models/user');
const Delivery = require('./server/models/delivery');
const Inventory = require('./server/models/inventory');

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://mrvandiary:GbfP0gWECmnEE7o7@agrisync.i8ygw.mongodb.net/agrisync', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testInventoryRealTime() {
  try {
    console.log('🧪 Testing real-time inventory updates...');
    
    // Connect to Socket.IO server
    const socket = io('http://localhost:5000');
    
    socket.on('connect', () => {
      console.log('📡 Connected to Socket.IO server');
    });
    
    socket.on('inventory_updated', (data) => {
      console.log('📦 Inventory update event received:', data);
    });
    
    socket.on('delivery_completed', (data) => {
      console.log('🚚 Delivery completed event received:', data);
    });
    
    // Find a vendor user to test with
    const vendor = await User.findOne({ role: 'market_vendor' });
    if (!vendor) {
      console.log('❌ No vendor found for testing');
      process.exit(1);
    }
    
    console.log('👤 Testing with vendor:', vendor.name, '(ID:', vendor._id, ')');
    
    // Find an existing delivery to test with
    const delivery = await Delivery.findOne({ 
      status: { $ne: 'delivered' },
      vendor: vendor._id 
    }).populate('vendor');
    
    if (!delivery) {
      console.log('❌ No active delivery found for this vendor');
      process.exit(1);
    }
    
    console.log('📦 Testing with delivery:', delivery._id);
    console.log('📍 Delivery details:', {
      goodsDescription: delivery.goodsDescription,
      quantity: delivery.quantity,
      status: delivery.status,
      pickupLocation: delivery.pickupLocation,
      dropoffLocation: delivery.dropoffLocation
    });
    
    // Check current vendor inventory count
    const currentInventory = await Inventory.find({ user: vendor._id });
    console.log('📊 Current vendor inventory count:', currentInventory.length);
    
    // Wait a moment, then manually trigger the delivery completion logic
    setTimeout(async () => {
      try {
        console.log('\n🚀 Simulating delivery completion...');
        
        // Import the warehouse service to test the inventory function
        const WarehouseService = require('./server/services/warehouseService');
        
        // Create a test delivery object with required fields
        const testDelivery = {
          _id: delivery._id,
          goodsDescription: delivery.goodsDescription,
          quantity: delivery.quantity,
          unit: delivery.unit || 'kg',
          vendor: vendor._id,
          requestedBy: vendor._id
        };
        
        const deliveredBy = { name: 'Test Transporter' };
        
        // Test the inventory addition directly
        console.log('🔄 Adding delivery to vendor inventory...');
        const result = await WarehouseService.addDeliveryToVendorInventory(testDelivery, deliveredBy);
        
        if (result) {
          console.log('✅ Vendor inventory item created:', result._id);
          
          // Manually emit the Socket.IO event like the delivery route does
          socket.emit('inventory_updated', {
            type: 'increase',
            userId: vendor._id.toString(),
            itemName: testDelivery.goodsDescription,
            quantity: testDelivery.quantity,
            location: vendor.location,
            timestamp: new Date().toISOString()
          });
          
          console.log('📡 Socket.IO inventory_updated event emitted');
          
          // Check new inventory count
          const newInventory = await Inventory.find({ user: vendor._id });
          console.log('📊 New vendor inventory count:', newInventory.length);
          console.log('📈 Inventory increase:', newInventory.length - currentInventory.length);
          
        } else {
          console.log('❌ Failed to create vendor inventory item');
        }
        
      } catch (error) {
        console.error('❌ Error during inventory test:', error);
      }
      
      // Cleanup and exit
      setTimeout(() => {
        socket.disconnect();
        mongoose.disconnect();
        console.log('\n✅ Test completed');
        process.exit(0);
      }, 2000);
      
    }, 2000);
    
  } catch (error) {
    console.error('❌ Test setup error:', error);
    process.exit(1);
  }
}

// Run the test
testInventoryRealTime();
