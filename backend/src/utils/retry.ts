import { delay } from "./delay.js";

export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  retries = 3,
  baseDelayMs = 700
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === retries) {
        break;
      }
      const delayMs = baseDelayMs * 2 ** attempt;
      await delay(delayMs);
    }
  }

  throw lastError;
}
