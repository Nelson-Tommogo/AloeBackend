import express from 'express';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import stkRoutes from './routes/stkRoutes.js'; 
import transactionRoutes from './routes/transactionRoutes.js';
import cors from 'cors';

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

const allowedOrigins = [
  'http://localhost:3000/',
  'https://localhost:3000',
  'http://localhost:9000',
  'http://aloefloraproducts.com',
  'https://aloefloraproducts.com'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

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
