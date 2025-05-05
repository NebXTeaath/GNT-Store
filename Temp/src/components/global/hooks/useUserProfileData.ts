// src/components/global/hooks/useUserProfileData.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { FormattedUserProfile, ProfileAddress } from '@/components/global/Profile/types';
import { toast } from 'sonner';

const USER_PROFILE_QUERY_KEY = 'userProfile';

const fetchUserProfile = async (userId: string | undefined): Promise<FormattedUserProfile | null> => {
    if (!userId) return null;
    try {
        const { data, error } = await supabase.from('user_profiles').select('*').eq('user_id', userId).maybeSingle();
        if (error) throw error; if (!data) return null;
        const authUser = (await supabase.auth.getUser()).data.user;
        const addressData = (data.address || {}) as ProfileAddress;
        const formattedProfile: FormattedUserProfile = { userId: data.user_id, name: data.name || "", email: authUser?.email || "", phone: data.mobile || "", address: { line1: addressData.line1 || "", line2: addressData.line2 || "", city: addressData.city || "", state: addressData.state || "", zip: addressData.zip || "", country: addressData.country || "" }, profileDocId: data.user_id };
        return formattedProfile;
    } catch (error) { console.error("[useUserProfileData] Error fetching profile:", error); throw error; }
};

export const useUserProfileQuery = () => {
    const { user, isLoadingAuth } = useAuth(); const userId = user?.id;
    return useQuery<FormattedUserProfile | null, Error>({ queryKey: [USER_PROFILE_QUERY_KEY, userId], queryFn: () => fetchUserProfile(userId), enabled: !!userId && !isLoadingAuth, staleTime: 300000, gcTime: 1800000, refetchOnWindowFocus: true });
};

interface UpdateProfilePayload {
    name?: string;
    mobile?: string; // Ensure this matches the actual column name ('mobile' or 'phone')
    address?: ProfileAddress;
    email?: string; // Add email if you intend to update it via this mutation
}

export const useUpdateProfileMutation = () => {
    const queryClient = useQueryClient(); const { user } = useAuth(); const userId = user?.id;
    return useMutation<FormattedUserProfile, Error, UpdateProfilePayload>({
        mutationFn: async (profileUpdates) => {
            if (!userId) throw new Error("User not authenticated.");

            // Prepare data for upsert - MUST include the primary key (user_id)
            const upsertData: { [key: string]: any } = {
                user_id: userId, // Include the user_id for upsert
                updated_at: new Date().toISOString() // Always update timestamp
            };

            // Add fields from payload if they exist
            if (profileUpdates.name !== undefined) upsertData.name = profileUpdates.name;
            if (profileUpdates.mobile !== undefined) upsertData.mobile = profileUpdates.mobile;
            if (profileUpdates.address !== undefined) upsertData.address = profileUpdates.address;

            console.log('[useUpdateProfileMutation] Upserting profile data:', upsertData); // Log payload

            // Use upsert() instead of update()
            const { data: upsertedData, error } = await supabase
                .from('user_profiles')
                .upsert(upsertData) // Pass the object with user_id
                .select() // Select the created/updated row
                .single(); // Expect exactly one row back after upsert

            // Check for errors after the upsert attempt
            if (error) {
                console.error('[useUpdateProfileMutation] Supabase upsert error:', error);
                throw error; // Throw the error to be caught by onError
            }

            // Check if data was actually returned (should always happen with upsert + single unless severe error)
            if (!upsertedData) {
                console.error('[useUpdateProfileMutation] Upsert failed: No data returned.');
                throw new Error("Upsert failed: No data returned.");
            }

            console.log('[useUpdateProfileMutation] Upsert successful, raw data:', upsertedData);

            // Format the returned data (same as before)
            const addressData = (upsertedData.address || {}) as ProfileAddress;
            const formattedProfile: FormattedUserProfile = {
                userId: upsertedData.user_id,
                name: upsertedData.name || "",
                email: user?.email || "", // Get email from auth context user
                phone: upsertedData.mobile || "",
                address: {
                    line1: addressData.line1 || "",
                    line2: addressData.line2 || "",
                    city: addressData.city || "",
                    state: addressData.state || "",
                    zip: addressData.zip || "",
                    country: addressData.country || ""
                },
                profileDocId: upsertedData.user_id // or relevant ID if different
            };

            console.log('[useUpdateProfileMutation] Formatted profile:', formattedProfile);
            return formattedProfile;
        },
        onSuccess: (data) => {
            // Update the cache with the new profile data
            queryClient.setQueryData([USER_PROFILE_QUERY_KEY, userId], data);
            console.log("[useUserProfileData] Profile upserted in DB & cache:", data);
            toast.success("Profile saved!"); // Add success feedback
        },
        onError: (error) => {
            // Log the error and potentially show a user-facing message
            console.error("[useUserProfileData] Mutation error updating/creating profile:", error);
            toast.error(`Failed to save profile: ${error.message}`); // Show error toast
        },
    });
};