"use strict";
// src/config/db.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const connectWithOptions = async () => {
    const uri = process.env.MONGODB_URL;
    // Extend buffer timeout beyond default 10s to accommodate serverless cold starts
    mongoose_1.default.set('bufferTimeoutMS', 30000);
    // Add robust timeouts and IPv4 preference to avoid DNS/IPv6 issues in serverless
    return mongoose_1.default.connect(uri, {
        serverSelectionTimeoutMS: 30000,
        connectTimeoutMS: 30000,
        socketTimeoutMS: 60000,
        family: 4,
        // Keep default buffering; alternatively, disable to fail fast:
        // bufferCommands: false,
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
        mongoose_1.default.connection.on('error', err => {
            console.error('❌ Mongoose connection error (Runtime):', err);
            // You may log this error but let the application continue
        });
        mongoose_1.default.connection.on('disconnected', () => {
            console.error('⚠️ Mongoose disconnected from the database. Services may be impaired.');
            // In a production app, this is where you would handle an auto-reconnect strategy.
        });
    }
    catch (err) {
        console.error('❌ MongoDB initial connection error:', err);
        // In serverless, do not exit the process; rethrow so the platform can retry
        throw err;
    }
};
exports.default = connectDB;
//# sourceMappingURL=db.js.map