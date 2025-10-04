import mongoose from "mongoose";
/**
 * Executes a function safely within a Mongoose transaction.
 * Automatically commits or aborts transaction and ends session.
 * Optimized for production with better timeout handling.
 *
 * @param fn - The async function to execute inside the transaction. Receives the session as argument.
 * @param options - Transaction options for timeout and retry handling
 * @returns The result of the function `fn`
 */
export declare const withTransaction: <T>(fn: (session: mongoose.ClientSession) => Promise<T>, options?: {
    maxTimeMS?: number;
    retries?: number;
    retryDelay?: number;
}) => Promise<T>;
//# sourceMappingURL=withTransaction.d.ts.map