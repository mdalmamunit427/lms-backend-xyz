"use strict";
// src/config/db.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const connectDB = async () => {
    try {
        // Mongoose connects and maintains connection pool
        await mongoose_1.default.connect(process.env.MONGODB_URL);
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
        console.error('❌ MongoDB initial connection error: Could not connect to Atlas.', err);
        // Exit process if the initial connection fails (fail-fast principle)
        process.exit(1);
    }
};
exports.default = connectDB;
//# sourceMappingURL=db.js.map