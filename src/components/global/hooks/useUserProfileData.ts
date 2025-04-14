// --- File: src/components/global/hooks/useUserProfileData.ts ---
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { account } from '@/lib/appwrite'; 
import { getCurrentUserSafe } from '@/lib/authHelpers';

import {
    getUserProfile,
    createUserProfile,
    updateUserProfile,
} from '@/lib/userProfile';
import { formatProfileForUI } from '@/pages/Profile/cachedUserProfile';
import { RawProfileData, FormattedUserProfile, ProfileData } from '@/pages/Profile/types';
import { toast } from 'sonner';
import { useEffect, useState, useCallback } from 'react';

// --- Query Keys ---
const USER_PROFILE_QUERY_KEY = 'userProfile';

/**
 * Custom hook to get and manage the current user ID
 * This centralizes the user ID fetching logic
 */
export const useCurrentUserId = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUserId = useCallback(async () => {
    try {
      setIsLoading(true);
      const user = await getCurrentUserSafe();
      setUserId(user?.$id || null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to get user'));
      setUserId(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserId();
  }, [fetchUserId]);

  return { userId, isLoading, error, refetch: fetchUserId };
};

/**
 * Fetches the user profile using the direct backend function and formats it.
 * TanStack Query handles the caching.
 * @param userId The ID of the user whose profile to fetch.
 * @returns Formatted user profile or null if not found/error.
 */
const fetchFormattedUserProfile = async (userId: string): Promise<FormattedUserProfile | null> => {
    if (!userId) return null;
    
    try {
        console.log(`[TanStack Query] Fetching profile for user: ${userId}`);
        const rawProfile: RawProfileData | null = await getUserProfile(userId);
        if (rawProfile) {
            return formatProfileForUI(rawProfile, userId);
        }
        return null; // No profile found
    } catch (error) {
        console.error("[TanStack Query] Error fetching user profile:", error);
        return null;
    }
};

/**
 * TanStack Query hook to get the formatted user profile.
 * Handles fetching, caching, and background updates.
 * @returns Query result object for the user profile.
 */
export const useUserProfileQuery = () => {
    const { userId, isLoading: isUserIdLoading } = useCurrentUserId();

    return useQuery<FormattedUserProfile | null, Error>({
        queryKey: [USER_PROFILE_QUERY_KEY, userId],
        queryFn: () => fetchFormattedUserProfile(userId || ''),
        enabled: !!userId && !isUserIdLoading, // Only run the query if userId is available
        staleTime: 1000 * 60 * 5, // Cache is considered fresh for 5 minutes
        gcTime: 1000 * 60 * 30, // Keep data in cache for 30 minutes even if inactive
        refetchOnWindowFocus: true, // Refetch when window regains focus
        refetchOnReconnect: true, // Refetch on network reconnect
    });
};

/**
 * TanStack Mutation hook for creating a user profile.
 * @returns Mutation result object for creating a profile.
 */
export const useCreateProfileMutation = () => {
    const queryClient = useQueryClient();
    const { userId } = useCurrentUserId();

    return useMutation<FormattedUserProfile, Error, Omit<ProfileData, 'userId'>>({
        mutationFn: async (profileData) => {
            if (!userId) throw new Error("User not authenticated for creation.");
            const rawCreatedProfile = await createUserProfile(userId, profileData);
            return formatProfileForUI(rawCreatedProfile, userId);
        },
        onSuccess: (data) => {
            if (userId) {
                queryClient.setQueryData([USER_PROFILE_QUERY_KEY, userId], data);
                toast.success("Profile created successfully!");
                console.log("[TanStack Mutation] Profile created:", data);
            }
        },
        onError: (error) => {
            console.error("[TanStack Mutation] Error creating profile:", error);
            toast.error(`Failed to create profile: ${error.message}`);
        },
    });
};

/**
 * TanStack Mutation hook for updating a user profile.
 * @returns Mutation result object for updating a profile.
 */
export const useUpdateProfileMutation = () => {
    const queryClient = useQueryClient();
    const { userId } = useCurrentUserId();

    return useMutation<
        FormattedUserProfile,
        Error,
        { documentId: string; data: Partial<Omit<ProfileData, 'userId'>> }
    >({
        mutationFn: async ({ documentId, data }) => {
            if (!userId) throw new Error("User not authenticated for update.");
            const rawUpdatedProfile = await updateUserProfile(documentId, data);
            return formatProfileForUI(rawUpdatedProfile, userId);
        },
        onSuccess: (data) => {
            if (userId) {
                queryClient.setQueryData([USER_PROFILE_QUERY_KEY, userId], data);
                toast.success("Profile updated successfully!");
                console.log("[TanStack Mutation] Profile updated:", data);
            }
        },
        onError: (error) => {
            console.error("[TanStack Mutation] Error updating profile:", error);
            toast.error(`Failed to update profile: ${error.message}`);
        },
    });
};

/**
 * TanStack Mutation hook for updating only the email in a profile.
 * @returns Mutation result object for updating profile email.
 */
export const useUpdateProfileEmailMutation = () => {
    const queryClient = useQueryClient();
    const { userId } = useCurrentUserId();

    return useMutation<
        FormattedUserProfile,
        Error,
        { documentId: string; email: string }
    >({
        mutationFn: async ({ documentId, email }) => {
            if (!userId) throw new Error("User not authenticated for email update.");
            const rawUpdatedProfile = await updateUserProfile(documentId, { email });
            return formatProfileForUI(rawUpdatedProfile, userId);
        },
        onSuccess: (data) => {
            if (userId) {
                queryClient.setQueryData([USER_PROFILE_QUERY_KEY, userId], data);
                console.log("[TanStack Mutation] Profile email updated in DB:", data);
            }
        },
        onError: (error) => {
            console.error("[TanStack Mutation] Error updating profile email:", error);
            toast.error(`Failed to update profile email: ${error.message}`);
            throw error;
        },
    });
};