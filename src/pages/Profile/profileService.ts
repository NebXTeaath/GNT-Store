// src/pages/Profile/profileService.ts
import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useUserProfileQuery, useUpdateProfileMutation } from '@/components/global/hooks/useUserProfileData';
import { UserProfile, PincodeValidationResult, ProfileAddress } from "./types";

export const useProfileService = (
    validatePincode: (pincode: string) => Promise<PincodeValidationResult>,
    setLoadingMessage: (message: string) => void,
    setIsLoadingProfile: (isLoading: boolean) => void
) => {
    const { user } = useAuth();
    const { data: profileDataFromQuery, isLoading: isQueryLoading, isFetching: isQueryFetching, isError, refetch } = useUserProfileQuery();
    const { mutate: updateProfile, isPending: isUpdating } = useUpdateProfileMutation();

    const [localProfile, setLocalProfile] = useState<UserProfile | null>(null);
    const [isPincodeLoading, setIsPincodeLoading] = useState(false);
    const [charCounts, setCharCounts] = useState({ name: 0, line1: 0, line2: 0, city: 0, state: 0, country: 0, phone: 0, zip: 0 });
    const profileExists = !!profileDataFromQuery;

    useEffect(() => {
        if (!user) { setLocalProfile(null); return; }
        if (profileDataFromQuery) {
            const profileWithAuthEmail = { ...profileDataFromQuery, email: user.email || profileDataFromQuery.email || "" };
            setLocalProfile(profileWithAuthEmail);
            setCharCounts({ name: profileWithAuthEmail.name?.length || 0, line1: profileWithAuthEmail.address?.line1?.length || 0, line2: profileWithAuthEmail.address?.line2?.length || 0, city: profileWithAuthEmail.address?.city?.length || 0, state: profileWithAuthEmail.address?.state?.length || 0, zip: profileWithAuthEmail.address?.zip?.length || 0, country: profileWithAuthEmail.address?.country?.length || 0, phone: profileWithAuthEmail.phone?.length || 0 });
        } else if (!isQueryLoading && !isQueryFetching && !isError) {
            const defaultProfile: UserProfile = { userId: user.id, name: user.user_metadata?.name || "", email: user.email || "", phone: "", address: { line1: "", line2: "", city: "", state: "", zip: "", country: "" }, profileDocId: user.id };
            setLocalProfile(defaultProfile);
            setCharCounts({ name: defaultProfile.name.length, line1: 0, line2: 0, city: 0, state: 0, country: 0, phone: 0, zip: 0 });
        }
    }, [profileDataFromQuery, isQueryLoading, isQueryFetching, isError, user]);

    const handlePincodeValidation = useCallback(async (pincode: string) => {
        setIsPincodeLoading(true); try { const result = await validatePincode(pincode); if (result.valid && result.city && result.state) { setLocalProfile(prev => { if (!prev) return null; const currentAddress = prev.address || {}; return { ...prev, address: { ...currentAddress, zip: pincode, city: result.city, state: result.state } as ProfileAddress }; }); setCharCounts(prev => ({ ...prev, city: result.city?.length || 0, state: result.state?.length || 0, zip: pincode.length })); toast.success("Pincode validated"); } else { toast.error(result.message || "Invalid pincode"); } } catch (error) { toast.error("Failed to validate pincode."); } finally { setIsPincodeLoading(false); }
    }, [validatePincode]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target; let processedValue = value; const fieldName = name.includes('.') ? name.split('.')[1] : name; const maxLengths: { [key: string]: number } = { name: 50, phone: 10, zip: 6, line1: 50, line2: 50, city: 50, state: 50, country: 50 };
        if (maxLengths[fieldName] && value.length > maxLengths[fieldName]) { processedValue = value.slice(0, maxLengths[fieldName]); } if ((fieldName === 'phone' || fieldName === 'zip') && !/^\d*$/.test(processedValue)) { return; }
        setCharCounts(prev => ({ ...prev, [fieldName]: processedValue.length })); if (fieldName === 'zip' && processedValue.length === 6) { handlePincodeValidation(processedValue); }
        setLocalProfile(prev => { if (!prev) return null; const newProfile = { ...prev }; if (name.startsWith('address.')) { const addressField = fieldName as keyof ProfileAddress; const currentAddress = newProfile.address || {}; newProfile.address = { ...currentAddress, [addressField]: processedValue }; } else if (name === 'phone') { newProfile.phone = processedValue; } else if (name === 'name') { newProfile.name = processedValue; } return newProfile; });
    }, [handlePincodeValidation]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault(); if (!localProfile || !user || !localProfile.address) { toast.error("Profile data missing."); return; }
        if (localProfile.phone && !/^\d{10}$/.test(localProfile.phone)) { toast.error("Phone must be 10 digits"); return; } if (localProfile.address.zip && !/^\d{6}$/.test(localProfile.address.zip)) { toast.error("Pincode must be 6 digits"); return; } if (!localProfile.name?.trim()) { toast.error("Name required."); return; } if (!localProfile.address.line1?.trim()) { toast.error("Address Line 1 required."); return; } if (!localProfile.address.city?.trim()) { toast.error("City required."); return; } if (!localProfile.address.state?.trim()) { toast.error("State required."); return; } if (!localProfile.address.zip?.trim()) { toast.error("Pincode required."); return; } if (!localProfile.address.country?.trim()) { toast.error("Country required."); return; }
        setIsLoadingProfile(true); setLoadingMessage("Saving profile..."); const payload = { name: localProfile.name, mobile: localProfile.phone, address: localProfile.address };
        await updateProfile(payload, { onSuccess: () => { toast.success("Profile saved!"); }, onError: (err) => { toast.error(`Save failed: ${err.message}`); }, onSettled: () => { setIsLoadingProfile(false); setLoadingMessage(""); } });
    }, [localProfile, user, updateProfile, setIsLoadingProfile, setLoadingMessage]);

    const refreshProfileData = useCallback(() => { console.log("[ProfileService] Triggering Supabase profile refetch."); setLoadingMessage("Refreshing profile data..."); setIsLoadingProfile(true); refetch().finally(() => { setIsLoadingProfile(false); setLoadingMessage(""); }); }, [refetch, setLoadingMessage, setIsLoadingProfile]);

    return { localProfile, isLoading: isQueryLoading || isQueryFetching, isSaving: isUpdating, isPincodeLoading, isError, profileExists, charCounts, handleInputChange, handleSubmit, refreshProfileData };
};