// src/config/db.ts

import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        // Mongoose connects and maintains connection pool
        await mongoose.connect(process.env.MONGODB_URL!);
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
        console.error('❌ MongoDB initial connection error: Could not connect to Atlas.', err);
        // Exit process if the initial connection fails (fail-fast principle)
        process.exit(1);
    }
};

export default connectDB;