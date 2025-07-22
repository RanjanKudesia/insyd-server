import mongoose from 'mongoose';

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    console.log('Using existing MongoDB connection');
    return;
  }

  try {
    const conn = await mongoose.connect(`${process.env.MONGODB_URI}`, {
      // Connection options optimized for serverless
      maxPoolSize: 10,          // Maximum number of connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000,   // Close sockets after 45 seconds of inactivity
      bufferCommands: false     // Disable mongoose buffering
      // ✅ REMOVED: bufferMaxEntries (no longer supported)
    });

    isConnected = conn.connections[0].readyState === 1;
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
      isConnected = true;
    });

    return conn;

  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    isConnected = false;
    throw error;
  }
};

// Graceful shutdown
const closeConnection = async () => {
  try {
    await mongoose.connection.close();
    isConnected = false;
    console.log('📝 MongoDB connection closed');
  } catch (error) {
    console.error('❌ Error closing MongoDB connection:', error);
  }
};

export { connectDB, closeConnection };
export default connectDB;
