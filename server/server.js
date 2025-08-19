// Load environment variables first, before any other imports
const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const passport = require('passport');
const session = require('express-session');
const path = require('path');

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
const transporterRoutes = require('./routes/transporters');
const announcementRoutes = require('./routes/announcements');
const auditRoutes = require('./routes/audit');
const vendorRoutes = require('./routes/vendor');
const adminRoutes = require('./routes/admin');
const { auditMiddleware } = require('./middleware/auditMiddleware');
const auditService = require('./services/auditService');
const app = express();
const server = http.createServer(app);

// CORS Configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:3000',
  process.env.CLIENT_URL
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Allow curl/mobile apps
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
    "Cache-Control",
    "X-File-Name"
  ],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 300 : 1000, // 1000 in dev, 300 in production
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // More lenient for localhost in development
  skip: (req) => {
    if (process.env.NODE_ENV !== 'production') {
      const ip = req.ip || req.connection.remoteAddress;
      // Skip rate limiting for localhost
      return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
    }
    return false;
  }
});

// Apply rate limiting to all routes
app.use(limiter);

// More stringent rate limits for auth routes
// More relaxed limits for development environment
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes (reduced from 15 minutes)
  max: process.env.NODE_ENV === 'production' ? 15 : 50, // 50 attempts in dev, 15 in production
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for localhost in development
  skip: (req) => {
    if (process.env.NODE_ENV !== 'production') {
      const ip = req.ip || req.connection.remoteAddress;
      return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
    }
    return false;
  }
});

// Apply stricter rate limiting to auth routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Socket.IO Configuration
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  },
  allowEIO4: true,
  transports: ['polling', 'websocket']
});

// Make io accessible in routes
app.set('io', io);

// Middleware - Increase limit for profile picture uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Add audit logging middleware (skip static files and health checks)
app.use(auditMiddleware({
  skipRoutes: ['/health', '/static', '/favicon.ico'],
  skipMethods: ['OPTIONS']
}));

// Session configuration for passport
app.use(session({
  secret: process.env.SESSION_SECRET || 'agrisync-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    httpOnly: true, // Prevents client-side access to cookies
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict' // Protects against CSRF
  },
  name: 'sessionId', // Change session cookie name from default 'connect.sid'
}));

// Initialize Passport
require('./config/passport');
app.use(passport.initialize());
app.use(passport.session());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Development-only rate limit reset endpoint
if (process.env.NODE_ENV !== 'production') {
  app.post('/api/dev/reset-rate-limit', (req, res) => {
    try {
      // Clear rate limiting stores if they exist
      if (limiter.resetKey) {
        limiter.resetKey(req.ip);
      }
      if (authLimiter.resetKey) {
        authLimiter.resetKey(req.ip);
      }
      
      res.json({ 
        success: true, 
        message: 'Rate limiting reset for your IP address',
        ip: req.ip 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to reset rate limiting',
        error: error.message 
      });
    }
  });
  
  console.log('🧪 Development mode: Rate limit reset endpoint available at /api/dev/reset-rate-limit');
}

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/protected', protectedRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/delivery', deliveryRoutes); // Support both singular and plural
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/warehouse', warehouseRoutes);
app.use('/api/outgoing', outgoingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/transporters', transporterRoutes);
app.use('/api/export', require('./routes/export'));
app.use('/api/farmer', farmerRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/admin', adminRoutes);

// Direct routes for admin dashboard
const protect = require('./middleware/authMiddleware');
const User = require('./models/user');

app.get('/api/users', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ message: 'Server error fetching users' });
  }
});

app.get('/api/summary', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }

    const userCount = await User.countDocuments();
    let deliveryCount = 0;
    let orderCount = 0;
    let inventoryCount = 0;

    try {
      const Delivery = require('./models/Delivery');
      deliveryCount = await Delivery.countDocuments();
    } catch (e) {
      console.log('Delivery model not available');
    }

    try {
      const Order = require('./models/Order');
      orderCount = await Order.countDocuments();
    } catch (e) {
      console.log('Order model not available');
    }

    try {
      const Inventory = require('./models/Inventory');
      inventoryCount = await Inventory.countDocuments();
    } catch (e) {
      console.log('Inventory model not available');
    }

    const summary = {
      users: userCount,
      deliveries: deliveryCount,
      orders: orderCount,
      inventory: inventoryCount
    };

    res.json(summary);
  } catch (err) {
    console.error('Error fetching summary:', err);
    res.status(500).json({ message: 'Server error fetching summary' });
  }
});

// Health check route
app.get('/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Default route
app.get('/', (req, res) => res.send('AgriSync API Running'));

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-delivery-tracking', (deliveryId) => {
    socket.join(`delivery-${deliveryId}`);
    console.log(`Client ${socket.id} joined delivery tracking for ${deliveryId}`);
  });

  socket.on('leave-delivery-tracking', (deliveryId) => {
    socket.leave(`delivery-${deliveryId}`);
    console.log(`Client ${socket.id} left delivery tracking for ${deliveryId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start Server
const PORT = process.env.PORT || 5000;

// MongoDB connection options
const mongoOptions = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  maxPoolSize: 50,
};

// Connect to MongoDB and start server
async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI, mongoOptions);
    console.log('✅ MongoDB connected successfully');
    
    // Start audit service scheduled cleanup
    auditService.startScheduledCleanup();
    console.log('✅ Audit service initialized with automatic cleanup');
    
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🔗 API Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`💻 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
}

// Graceful shutdown function
async function gracefulShutdown() {
  try {
    console.log('🔄 Received shutdown signal, closing connections...');
    
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    
    // Close HTTP server
    server.close(() => {
      console.log('✅ HTTP server closed');
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      console.error('⚠️ Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  } catch (err) {
    console.error('❌ Error during shutdown:', err);
    process.exit(1);
  }
}

// Start the server
startServer();
