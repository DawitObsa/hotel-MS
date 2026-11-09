import 'dotenv/config';
import mongoose from 'mongoose';
import app from './app.js';

const required = ['MONGODB_URI', 'JWT_SECRET', 'ADMIN_SETUP_KEY'];
for (const key of required) if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
if (process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be at least 32 characters.');

const port = Number(process.env.PORT || 4000);
try {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  app.listen(port, () => console.log(`Hospital MS API listening on port ${port}`));
} catch (error) {
  console.error('Unable to connect to MongoDB:', error.message);
  process.exit(1);
}
