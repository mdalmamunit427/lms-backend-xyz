// src/config/db.ts

import mongoose from 'mongoose';

// In serverless (Vercel), cache the connection across invocations
declare global {
    // eslint-disable-next-line no-var
    var __mongooseConn: Promise<typeof mongoose> | undefined;
}

const connectWithOptions = async () => {
    const uri = process.env.MONGODB_URL!;
    // Optimize buffer timeout for production performance
    mongoose.set('bufferTimeoutMS', 60000); // Increased to 60s for complex operations
    
    // Add robust timeouts and IPv4 preference to avoid DNS/IPv6 issues in serverless
    return mongoose.connect(uri, {
        serverSelectionTimeoutMS: 45000, // Increased for better reliability
        connectTimeoutMS: 45000,
        socketTimeoutMS: 120000, // Increased for complex operations
        family: 4,
        maxPoolSize: 10, // Increase connection pool size
        minPoolSize: 2, // Maintain minimum connections
        maxIdleTimeMS: 30000, // Close connections after 30s of inactivity
        heartbeatFrequencyMS: 10000, // Check connection health every 10s
        // Enable retryable writes for better reliability
        retryWrites: true,
        // Optimize for production workloads
        bufferCommands: false, // Disable buffering for immediate error feedback
    });
};

const connectDB = async () => {
    try {
        if (!process.env.MONGODB_URL) {
            throw new Error('MONGODB_URL is not set');
        }

        if (!global.__mongooseConn) {
            global.__mongooseConn = connectWithOptions();
        }

        await global.__mongooseConn;
        console.log('✅ MongoDB connected');

        // CRITICAL: Listeners for post-connection stability
        mongoose.connection.on('error', err => {
            console.error('❌ Mongoose connection error (Runtime):', err);
            // You may log this error but let the application continue
        });

        mongoose.connection.on('disconnected', () => {
            console.error('⚠️ Mongoose disconnected from the database. Services may be impaired.');
            // In a production app, this is where you would handle an auto-reconnect strategy.
        });

    } catch (err) {
        console.error('❌ MongoDB initial connection error:', err);
        // In serverless, do not exit the process; rethrow so the platform can retry
        throw err;
    }
};

export default connectDB;