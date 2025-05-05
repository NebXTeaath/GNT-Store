// src\lib\authHelpers.ts
import { account } from './appwrite';
import { Models } from 'appwrite'; // Import Models for type safety

// Type for Appwrite User object
type AppwriteUser = Models.User<Models.Preferences>;

// Removed manual caching and debouncing variables

/**
 * Safely gets the current Appwrite user account.
 * Handles 401 errors gracefully by returning null.
 * Designed to be used as the queryFn in TanStack Query.
 * TanStack Query handles caching, deduplication, and background updates.
 * @returns {Promise<AppwriteUser | null>} The user object or null.
 */
export async function getCurrentUserSafe(): Promise<AppwriteUser | null> {
    console.log("[getCurrentUserSafe] Attempting to get Appwrite user..."); // Debug log
    try {
        // Attempt to get the user directly using the Appwrite SDK
        const user = await account.get();
        console.log("[getCurrentUserSafe] User found:", user.$id);
        return user;
    } catch (error: any) {
        // Specifically check for Appwrite's 401 Unauthorized code or similar messages
        if (error?.code === 401 || error?.message?.includes('Unauthorized') || error?.message?.includes('session is invalid') || error?.message?.includes('User (role: guests) missing scope (account)')) {
            // User is not logged in or session expired. This is an expected case.
             if (import.meta.env.VITE_ENVIRONMENT === 'development') {
                // Log only in development to avoid console noise in production
                console.warn(`[getCurrentUserSafe] No active Appwrite session found (${error?.code ?? 'N/A'}). Returning null.`);
             }
            return null; // Return null for unauthorized/no session
        } else {
            // Log unexpected errors during development for debugging
             if (import.meta.env.VITE_ENVIRONMENT === 'development') {
                console.error('[getCurrentUserSafe] Unexpected error fetching user:', error);
             }
             // For other errors (network issues, server errors), also return null
             // to prevent breaking the app and allow TanStack Query to handle retries if configured.
            return null;
        }
    }
}