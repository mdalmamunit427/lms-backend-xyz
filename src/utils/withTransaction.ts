
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
export const withTransaction = async <T>(
  fn: (session: mongoose.ClientSession) => Promise<T>,
  options: {
    maxTimeMS?: number;
    retries?: number;
    retryDelay?: number;
  } = {}
): Promise<T> => {
  const { maxTimeMS = 120000, retries = 2, retryDelay = 1000 } = options;
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    const session = await mongoose.startSession();
    
    try {
      // Set transaction timeout
      session.startTransaction({
        maxTimeMS,
        readConcern: { level: 'snapshot' },
        writeConcern: { w: 'majority', j: true }
      });

      const result = await fn(session);
      await session.commitTransaction();
      return result;
    } catch (error: any) {
      lastError = error;
      
      try {
        await session.abortTransaction();
      } catch (abortError) {
        console.error('Failed to abort transaction:', abortError);
      }
      
      // If this is the last attempt or a non-retryable error, throw
      if (attempt === retries || !isRetryableError(error)) {
        throw error;
      }
      
      // Wait before retry
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    } finally {
      try {
        session.endSession();
      } catch (endError) {
        console.error('Failed to end session:', endError);
      }
    }
  }
  
  throw lastError || new Error('Transaction failed after all retries');
};

/**
 * Determines if an error is retryable for transaction operations
 */
const isRetryableError = (error: any): boolean => {
  if (!error) return false;
  
  const retryableErrors = [
    'TransientTransactionError',
    'UnknownTransactionCommitResult',
    'WriteConflict',
    'NetworkTimeout',
    'ConnectionTimeout',
    'SocketTimeout'
  ];
  
  const errorMessage = error.message?.toLowerCase() || '';
  const errorName = error.name || '';
  
  return retryableErrors.some(retryableError => 
    errorName.includes(retryableError) || 
    errorMessage.includes(retryableError.toLowerCase())
  );
};