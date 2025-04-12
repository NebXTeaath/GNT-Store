// src/lib/authHelpers.ts
import { account } from './appwrite';

/**
 * Safely get the current user without throwing on 401 errors.
 * @returns The user object or null if not authenticated.
 */
export async function getCurrentUserSafe() {
    try {
        return await account.get();
    } catch (error: any) {
        if (error?.code === 401) {
            if (process.env.NODE_ENV === 'development') {
                console.warn('[Appwrite] No active session found.');
            }
            return null;
        }
        console.error('[Appwrite] Unexpected error in account.get():', error);
        return null;
    }
}
