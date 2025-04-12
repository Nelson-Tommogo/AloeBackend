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

mongoose.connect(DATABASE_URL)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  });

const whitelist = [
  'https://aloefloraproducts.com',
  'http://aloefloraproducts.com',
  'http://localhost:3000',
  'https://localhost:3000'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || whitelist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('❌ Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 204,
  preflightContinue: false
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api', stkRoutes); 
app.use('/api/transactions', transactionRoutes);

app.get('/', (req, res) => {
  res.status(200).json({ message: 'Aloe Flora Limited Server is up and running!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Aloe Flora Limited Server is running on port ${PORT}`);
});

export { app, PORT };
