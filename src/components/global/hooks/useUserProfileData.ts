// --- File: src/components/global/hooks/useUserProfileData.ts ---
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { account } from '@/lib/appwrite'; // Assuming appwrite client is here
import {
    getUserProfile, // Direct backend call
    createUserProfile, // Direct backend call
    updateUserProfile, // Direct backend call
   // deleteUserProfile, // Removed unused import
} from '@/lib/userProfile';
import { formatProfileForUI } from '@/pages/Profile/cachedUserProfile'; // Keep the formatter
import { RawProfileData, FormattedUserProfile, ProfileData } from '@/pages/Profile/types';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';

// --- Query Hook ---

const USER_PROFILE_QUERY_KEY = 'userProfile';

/**
 * Fetches the user profile using the direct backend function and formats it.
 * TanStack Query handles the caching.
 * @param userId The ID of the user whose profile to fetch.
 * @returns Formatted user profile or null if not found/error.
 */
const fetchFormattedUserProfile = async (userId: string): Promise<FormattedUserProfile | null> => {
    try {
        console.log(`[TanStack Query] Fetching profile for user: ${userId}`);
        const rawProfile: RawProfileData | null = await getUserProfile(userId);
        if (rawProfile) {
            // Use the existing formatter
            return formatProfileForUI(rawProfile, userId);
        }
        return null; // No profile found
    } catch (error) {
        console.error("[TanStack Query] Error fetching user profile:", error);
        // Let TanStack Query handle the error state, don't throw here
        // unless you want the query to always be in an error state on backend failure.
        // Returning null signifies 'not found' or fetch error handled by isError.
        return null;
    }
};

/**
 * TanStack Query hook to get the formatted user profile.
 * Handles fetching, caching, and background updates.
 * @returns Query result object for the user profile.
 */
export const useUserProfileQuery = () => {
    const [userId, setUserId] = useState<string | null>(null);

    // Get user ID asynchronously
    useEffect(() => {
        const fetchUserId = async () => {
            try {
                const user = await account.get();
                setUserId(user?.$id || null);
            } catch {
                setUserId(null); // Not logged in
            }
        };
        fetchUserId();
    }, []);


    return useQuery<FormattedUserProfile | null, Error>({
        queryKey: [USER_PROFILE_QUERY_KEY, userId],
        queryFn: () => {
            if (!userId) {
                // Or throw new Error("User not authenticated"); to put query in error state
                 console.warn("[TanStack Query] No userId, skipping fetch.");
                 return Promise.resolve(null); // Return null immediately if no userId
            }
            return fetchFormattedUserProfile(userId);
        },
        enabled: !!userId, // Only run the query if userId is available
        staleTime: 1000 * 60 * 5, // Cache is considered fresh for 5 minutes
        gcTime: 1000 * 60 * 30, // Keep data in cache for 30 minutes even if inactive
        refetchOnWindowFocus: true, // Refetch when window regains focus
        refetchOnReconnect: true, // Refetch on network reconnect
    });
};


// --- Mutation Hooks ---

/**
 * TanStack Mutation hook for creating a user profile.
 * @returns Mutation result object for creating a profile.
 */
export const useCreateProfileMutation = () => {
    const queryClient = useQueryClient();
    const [userId, setUserId] = useState<string | null>(null);

     // Get user ID asynchronously
     useEffect(() => {
        const fetchUserId = async () => {
            try {
                const user = await account.get();
                setUserId(user?.$id || null);
            } catch {
                setUserId(null); // Not logged in
            }
        };
        fetchUserId();
    }, []);


    return useMutation<FormattedUserProfile, Error, Omit<ProfileData, 'userId'>>({
        mutationFn: async (profileData) => {
             if (!userId) throw new Error("User not authenticated for creation.");
            const rawCreatedProfile = await createUserProfile(userId, profileData);
            // Assume createUserProfile returns the created document
            return formatProfileForUI(rawCreatedProfile, userId);
        },
        onSuccess: (data) => {
            // Update the cache immediately with the new profile
            queryClient.setQueryData([USER_PROFILE_QUERY_KEY, userId], data);
            // Optionally invalidate if you want a background refetch anyway
            // queryClient.invalidateQueries({ queryKey: [USER_PROFILE_QUERY_KEY, userId] });
            toast.success("Profile created successfully!");
            console.log("[TanStack Mutation] Profile created:", data);

        },
        onError: (error) => {
            console.error("[TanStack Mutation] Error creating profile:", error);
            toast.error(`Failed to create profile: ${error.message}`);
        },
        // REMOVED: enabled: !!userId,
    });
};

/**
 * TanStack Mutation hook for updating a user profile.
 * @returns Mutation result object for updating a profile.
 */
export const useUpdateProfileMutation = () => {
    const queryClient = useQueryClient();
     const [userId, setUserId] = useState<string | null>(null);

     // Get user ID asynchronously
     useEffect(() => {
        const fetchUserId = async () => {
            try {
                const user = await account.get();
                setUserId(user?.$id || null);
            } catch {
                setUserId(null); // Not logged in
            }
        };
        fetchUserId();
    }, []);


    return useMutation<
        FormattedUserProfile,
        Error,
        { documentId: string; data: Partial<Omit<ProfileData, 'userId'>> } // Pass documentId and data
    >({
        mutationFn: async ({ documentId, data }) => {
            if (!userId) throw new Error("User not authenticated for update.");
            const rawUpdatedProfile = await updateUserProfile(documentId, data);
             // Assume updateUserProfile returns the updated document
            return formatProfileForUI(rawUpdatedProfile, userId);
        },
        onSuccess: (data) => {
            // Update the cache immediately
             queryClient.setQueryData([USER_PROFILE_QUERY_KEY, userId], data);
            // Optionally invalidate
            // queryClient.invalidateQueries({ queryKey: [USER_PROFILE_QUERY_KEY, userId] });
             toast.success("Profile updated successfully!");
             console.log("[TanStack Mutation] Profile updated:", data);
        },
        onError: (error) => {
            console.error("[TanStack Mutation] Error updating profile:", error);
            toast.error(`Failed to update profile: ${error.message}`);
        },
         // REMOVED: enabled: !!userId,
    });
};


/**
 * TanStack Mutation hook for updating only the email in a profile.
 * @returns Mutation result object for updating profile email.
 */
export const useUpdateProfileEmailMutation = () => {
    const queryClient = useQueryClient();
     const [userId, setUserId] = useState<string | null>(null);

     // Get user ID asynchronously
     useEffect(() => {
        const fetchUserId = async () => {
            try {
                const user = await account.get();
                setUserId(user?.$id || null);
            } catch {
                setUserId(null); // Not logged in
            }
        };
        fetchUserId();
    }, []);

    return useMutation<
        FormattedUserProfile,
        Error,
        { documentId: string; email: string } // Requires documentId and new email
    >({
        mutationFn: async ({ documentId, email }) => {
            if (!userId) throw new Error("User not authenticated for email update.");
            // Specifically update only the email field
            const rawUpdatedProfile = await updateUserProfile(documentId, { email });
            return formatProfileForUI(rawUpdatedProfile, userId);
        },
        onSuccess: (data) => {
            // Update the cache
            queryClient.setQueryData([USER_PROFILE_QUERY_KEY, userId], data);
            // queryClient.invalidateQueries({ queryKey: [USER_PROFILE_QUERY_KEY, userId] });
            console.log("[TanStack Mutation] Profile email updated in DB:", data);
            // Success toast might be handled in AuthContext after Appwrite update succeeds
        },
        onError: (error) => {
            console.error("[TanStack Mutation] Error updating profile email:", error);
            toast.error(`Failed to update profile email: ${error.message}`);
            // Re-throw if needed by the calling context (e.g., AuthContext)
            throw error;
        },
         // REMOVED: enabled: !!userId,
    });
};

// Note: Delete mutation omitted for brevity, but would follow the same pattern.