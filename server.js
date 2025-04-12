import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';

import stkRoutes from './routes/stkRoutes.js'; 
import transactionRoutes from './routes/transactionRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 9000;
const DATABASE_URL = process.env.DATABASE_URL;

mongoose.connect(DATABASE_URL)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  });

// Basic security headers (recommended to keep these)
app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  next();
});

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api', stkRoutes); 
app.use('/api/transactions', transactionRoutes);

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Aloe Flora Limited Server is up and running!',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Something went wrong on our end'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Aloe Flora Limited Server is running on port ${PORT}`);
});

export { app, PORT };