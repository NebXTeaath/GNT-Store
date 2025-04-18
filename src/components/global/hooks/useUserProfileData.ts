// src/components/global/hooks/useUserProfileData.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { FormattedUserProfile, ProfileAddress } from '@/pages/Profile/types';

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
            const updateData: { [key: string]: any } = {};
            if (profileUpdates.name !== undefined) updateData.name = profileUpdates.name; if (profileUpdates.mobile !== undefined) updateData.mobile = profileUpdates.mobile; if (profileUpdates.address !== undefined) updateData.address = profileUpdates.address; updateData.updated_at = new Date().toISOString();
            const { data: updatedData, error } = await supabase.from('user_profiles').update(updateData).eq('user_id', userId).select().single();
            if (error) throw error; if (!updatedData) throw new Error("Update failed: No data returned.");
            const addressData = (updatedData.address || {}) as ProfileAddress;
            const formattedProfile: FormattedUserProfile = { userId: updatedData.user_id, name: updatedData.name || "", email: user?.email || "", phone: updatedData.mobile || "", address: { line1: addressData.line1 || "", line2: addressData.line2 || "", city: addressData.city || "", state: addressData.state || "", zip: addressData.zip || "", country: addressData.country || "" }, profileDocId: updatedData.user_id };
            return formattedProfile;
        },
        onSuccess: (data) => { queryClient.setQueryData([USER_PROFILE_QUERY_KEY, userId], data); console.log("[useUserProfileData] Profile updated in DB & cache:", data); },
        onError: (error) => { console.error("[useUserProfileData] Mutation error updating profile:", error); },
    });
};