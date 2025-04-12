import express from 'express';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import cors from 'cors';

import stkRoutes from './routes/stkRoutes.js'; 
import transactionRoutes from './routes/transactionRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 9000;
const DATABASE_URL = process.env.DATABASE_URL;

// Connect to MongoDB Atlas
mongoose.connect(DATABASE_URL)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  });

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.options('*', cors());

// Middleware
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// API Routes
app.use('/api', stkRoutes); 
app.use('/api/transactions', transactionRoutes);

// Home route for testing
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Aloe Flora Limited Server is up and running!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Aloe Flora Limited Server is running on port ${PORT}`);
});

export { app, PORT };
