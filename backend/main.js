const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import our modules
const { db, initDatabase } = require('./database');
const { createBucketIfNotExists } = require('./s3');

// Import routes
const documentRoutes = require('./routes/documents');
const roomRoutes = require('./routes/rooms');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://vocastant-frontend-3873.s3-website.ap-south-1.amazonaws.com',
    'https://vocastant-frontend-3873.s3-website.ap-south-1.amazonaws.com',
    'https://d37ldj18o2bua6.cloudfront.net',
    'https://d1ye5bx9w8mu3e.cloudfront.net'
  ],
  credentials: true
}));
app.use(express.json());

// Initialize AWS and Database
const initializeServices = async () => {
  try {
    await createBucketIfNotExists();
    await initDatabase();
    console.log('✅ All services initialized successfully');
  } catch (error) {
    console.error('❌ Service initialization failed:', error);
    process.exit(1);
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'Vocastant Backend'
  });
});

// Mount routes
app.use('/api/documents', documentRoutes);
app.use('/api/rooms', roomRoutes);

// Start server
const startServer = async () => {
  await initializeServices();
  
  app.listen(PORT, () => {
    console.log(`🚀 Vocastant Backend running on port ${PORT}`);
    console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🗄️ Database: ${process.env.DB_NAME || 'vocastant'}`);
    console.log(`☁️ S3 Bucket: ${process.env.S3_BUCKET_NAME || 'vocastant-documents'}`);
  });
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
