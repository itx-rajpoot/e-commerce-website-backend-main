const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const sliderRoutes = require('./routes/sliders');
const chatRoutes = require('./routes/chat');
const productRoutes = require('./routes/products'); 
const categoryRoutes = require('./routes/categories');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const cron = require('node-cron');
const cleanupOldOrders = require('./scripts/cleanupOrders');
const User = require('./models/User');


const app = express();

// Enhanced CORS configuration
const allowedOrigins = [
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:8081'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Handle preflight requests
app.options('*', cors());

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sliders', sliderRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/products', productRoutes); 
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);


// Schedule daily cleanup of old cancelled orders at 2 AM

cron.schedule('0 2 * * *', () => {
  console.log('Running scheduled order cleanup...');
  cleanupOldOrders();
});

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shopdb';
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    // Initialize admin user if helper exists
    try {
      if (typeof User.initAdmin === 'function') {
        await User.initAdmin();
        console.log('🔐 Admin user initialization checked');
      }
    } catch (initErr) {
      console.warn('Admin initialization error:', initErr.message || initErr);
    }
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Global error handler to capture uncaught errors in routes
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err && (err.stack || err.message || err));
  if (res.headersSent) return next(err);
  res.status(500).json({ message: 'Server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API URL: http://localhost:${PORT}/api`);
  console.log(`🖼️ Uploads served from: http://localhost:${PORT}/uploads`);
});

