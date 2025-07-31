const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');
const protectedRoutes = require('./routes/auth');
const inventoryRoutes = require('./routes/inventory');
const deliveryRoutes = require('./routes/delivery');
const warehouseRoutes = require('./routes/warehouse');
const outgoingRoutes = require('./routes/outgoing');
const notificationRoutes = require('./routes/notifications');
const orderRoutes = require('./routes/orders');
const errorHandler = require('./middleware/errorHandler');
const reportRoutes = require('./routes/reports');
const usersRoutes = require('./routes/users');
const summaryRoutes = require('./routes/summary');


// Load environment variables first
dotenv.config();

console.log('🔧 Environment variables loaded:');
console.log('MONGO_URI exists:', !!process.env.MONGO_URI);
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);

// Ensure critical environment variables are loaded
if (!process.env.MONGO_URI) {
  console.error('❌ MONGO_URI environment variable is required!');
  console.error('📝 Please check your .env file in the server directory.');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET environment variable is required!');
  console.error('📝 Please check your .env file in the server directory.');
  process.exit(1);
}

// Use environment variables directly
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const NODE_ENV = process.env.NODE_ENV || 'development';

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Logging middleware
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}
const authRoutes = require('./routes/auth');
// API v1 routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/protected', protectedRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/deliveries', deliveryRoutes);
app.use('/api/v1/warehouse', warehouseRoutes);
app.use('/api/v1/outgoing', outgoingRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/summary', summaryRoutes);
app.use('/api/v1/export', require('./routes/export'));

// Backward compatibility (keep old routes working)
app.use('/api/auth', authRoutes);
app.use('/api/protected', protectedRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/warehouse', warehouseRoutes);
app.use('/api/outgoing', outgoingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/summary', summaryRoutes);
app.use('/api/export', require('./routes/export'));

// Default route
app.get('/', (req, res) => res.send('AgriSync API Running'));

// Start Server
app.use(errorHandler);

console.log('🔗 Attempting to connect to MongoDB...');
console.log('MONGO_URI:', MONGO_URI ? 'EXISTS' : 'UNDEFINED');

mongoose.connect(MONGO_URI)
.then(() => {
  console.log('✅ Connected to MongoDB successfully!');
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
})
.catch(err => {
  console.error('❌ MongoDB connection failed:', err.message);
  process.exit(1);
});
