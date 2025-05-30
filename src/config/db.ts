import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    const dbURI = process.env.MONGO_URI || 'mongodb://localhost:27017/mydatabase';
    await mongoose.connect(dbURI, {});
    console.log('MongoDB connected successfully! 🎉');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1); // Exiting with a little sadness, but we'll try again! 🥺
  }
};

export default connectDB;
// db.ts