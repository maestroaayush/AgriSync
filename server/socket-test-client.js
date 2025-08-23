// Simple Socket.IO test client
const io = require('socket.io-client');

console.log('🧪 Testing Socket.IO client connection...');

const socket = io('http://localhost:5000');

socket.on('connect', () => {
  console.log('📡 Connected to Socket.IO server with ID:', socket.id);
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from Socket.IO server');
});

socket.on('inventory_updated', (data) => {
  console.log('📦 Inventory update received:', data);
});

socket.on('delivery_completed', (data) => {
  console.log('🚚 Delivery completed received:', data);
});

// Test emitting an event (simulating what happens in delivery completion)
setTimeout(() => {
  console.log('🚀 Emitting test inventory_updated event...');
  socket.emit('inventory_updated', {
    type: 'increase',
    userId: '68a43f92c5f8753f916882c2', // Sample vendor ID
    itemName: 'Test Apple',
    quantity: 5,
    location: 'Test Market',
    timestamp: new Date().toISOString()
  });
}, 2000);

// Keep running for 10 seconds
setTimeout(() => {
  socket.disconnect();
  console.log('✅ Test completed');
  process.exit(0);
}, 10000);
