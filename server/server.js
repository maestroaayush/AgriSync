const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const protectedRoutes = require('./routes/auth');
const inventoryRoutes = require('./routes/inventory');
const deliveryRoutes = require('./routes/delivery');
const warehouseRoutes = require('./routes/warehouse');
const outgoingRoutes = require('./routes/outgoing');
const notificationRoutes = require('./routes/notifications');
const orderRoutes = require('./routes/orders');
const reportRoutes = require('./routes/reports');
const farmerRoutes = require('./routes/farmer');
const analyticsRoutes = require('./routes/analytics');


dotenv.config();
const app = express();

// Middleware
app.use(express.json());
app.use(cors());
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);
app.use('/api/protected', protectedRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/warehouse', warehouseRoutes);
app.use('/api/outgoing', outgoingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/export', require('./routes/export'));
app.use('/api/farmer', farmerRoutes);
app.use('/api/analytics', analyticsRoutes);

// Default route
app.get('/', (req, res) => res.send('AgriSync API Running'));

// Start Server
const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI)
.then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
.catch(err => console.error(err));
