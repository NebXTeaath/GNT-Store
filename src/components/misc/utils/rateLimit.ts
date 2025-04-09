// src/utils/rateLimit.ts
/**
 * A simple rate limiter using the browser's localStorage.
 * This function checks and updates the number of OTP send attempts.
 * Limit: 3 attempts per 20 minutes.
 *
 * @param key A unique key string for this OTP process (e.g., "signupOtp" or "forgotPasswordOtp")
 * @returns true if sending is allowed; false if the limit has been reached.
 */
export function canSendOtp(key: string): boolean {
    const limit = 3;
    const windowMs = 20 * 60 * 1000; // 20 minutes in milliseconds
    const stored = localStorage.getItem(key);
    let data: { count: number; firstAttempt: number };
  
    if (stored) {
      data = JSON.parse(stored);
    } else {
      data = { count: 0, firstAttempt: Date.now() };
    }
  
    // If the time window has passed, reset the counter.
    if (Date.now() - data.firstAttempt > windowMs) {
      data = { count: 0, firstAttempt: Date.now() };
    }
  
    if (data.count < limit) {
      // Increment the counter and update localStorage.
      data.count++;
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } else {
      return false;
    }
  }
  