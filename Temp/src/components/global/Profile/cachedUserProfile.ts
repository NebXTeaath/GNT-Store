// src/pages/Profile/cachedUserProfile.ts
import { RawProfileData, FormattedUserProfile } from "./types";

/**
 * Formats a raw profile data object into the structure expected by the UI
 *
 * @param rawProfile - The raw profile data from API
 * @param userId - The user ID to associate with this profile
 * @returns A formatted profile object ready for UI consumption
 */
export function formatProfileForUI(rawProfile: RawProfileData, userId: string): FormattedUserProfile {
    // Add null checks for safety, although backend should ideally ensure structure
    const profileDocId = rawProfile?.$id; // Get document ID from raw data
    if (!profileDocId) {
        // It's possible rawProfile itself is null if getUserProfile failed/returned null
        console.warn("Raw profile data missing $id or rawProfile is null:", rawProfile);
    }

    return {
        userId: userId,
        name: rawProfile?.name || "",
        email: rawProfile?.email || "",
        phone: rawProfile?.mobile || "",
        address: {
            line1: rawProfile?.addressLine1 || "",
            line2: rawProfile?.addressLine2 || "",
            city: rawProfile?.city || "",
            state: rawProfile?.state || "",
            zip: rawProfile?.pincode || "",
            country: rawProfile?.country || "",
        },
        profileDocId: profileDocId || undefined, // Ensure it's string or undefined
    };
}