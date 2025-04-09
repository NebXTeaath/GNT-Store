// src/pages/Profile/profileService.ts
import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useUserProfileQuery, useCreateProfileMutation, useUpdateProfileMutation, } from "@/components/global/hooks/useUserProfileData";
import { UserProfile, PincodeValidationResult, ProfileData } from "./types"; // Ensure UserProfile allows null in Address fields initially if needed

/**
 * Custom hook that manages profile FORM data and interactions, using TanStack Query for data fetching/mutation.
 */
export const useProfileService = (
    validatePincode: (pincode: string) => Promise<PincodeValidationResult>,
    setLoadingMessage: (message: string) => void,
    setIsLoadingProfile: (isLoading: boolean) => void
) => {
    const { user } = useAuth();
    // Get query states including isError
    const { data: profileData, isLoading: isQueryLoading, isFetching: isQueryFetching, isError, refetch } = useUserProfileQuery();
    const { mutate: createProfile, isPending: isCreating } = useCreateProfileMutation();
    const { mutate: updateProfile, isPending: isUpdating } = useUpdateProfileMutation();

    const [localProfile, setLocalProfile] = useState<UserProfile | null>(null);
    const [isPincodeLoading, setIsPincodeLoading] = useState(false);
    const [charCounts, setCharCounts] = useState({ name: 0, line1: 0, line2: 0, city: 0, state: 0, country: 0, phone: 0, zip: 0 });

    // Effect to initialize local form state - MODIFIED
    useEffect(() => {
        // Only proceed if the user context is available
        if (!user) {
            setLocalProfile(null); // Clear profile if user logs out
            return;
        }

        // Case 1: Query returned data successfully
        if (profileData) {
            console.log("[ProfileService] Syncing local form state with query data:", profileData);
            setLocalProfile(profileData);
            setCharCounts({
                name: profileData.name?.length || 0,
                line1: profileData.address?.line1?.length || 0, // Safe access
                line2: profileData.address?.line2?.length || 0,
                city: profileData.address?.city?.length || 0,
                state: profileData.address?.state?.length || 0,
                country: profileData.address?.country?.length || 0,
                phone: profileData.phone?.length || 0,
                zip: profileData.address?.zip?.length || 0
            });
        }
        // Case 2: Query finished loading/fetching, there was NO error, but NO data was found
        else if (!isQueryLoading && !isQueryFetching && !isError) {
            console.log("[ProfileService] No profile data found after fetch, setting default for form.");
            const defaultProfile: UserProfile = {
                userId: user.$id,
                name: user.name || "", // Pre-fill from auth if available
                email: user.email || "", // Always use auth email
                phone: "",
                address: { // Ensure address exists with empty strings
                    line1: "",
                    line2: "",
                    city: "",
                    state: "",
                    zip: "",
                    country: ""
                },
                profileDocId: undefined
            };
            setLocalProfile(defaultProfile);
            // Reset char counts for empty form
            setCharCounts({ name: defaultProfile.name.length, line1: 0, line2: 0, city: 0, state: 0, country: 0, phone: 0, zip: 0 });
        }
        // Case 3: Still loading, or error occurred, or no user yet
        // Do nothing, localProfile remains null, letting the View component show Skeleton or Error state.

    }, [profileData, isQueryLoading, isQueryFetching, isError, user]); // Added isError and user dependency

    // Effect to update form email if auth email changes - MODIFIED
    useEffect(() => {
        // Update local form state only if it exists and differs from auth user email
        // Ensure user context is available
        if (user && localProfile && localProfile.email !== user.email) {
            console.log("[ProfileService] Auth email changed, updating form email.");
            setLocalProfile(prev => prev ? { ...prev, email: user.email } : null);
        }
    }, [user?.email, localProfile]); // Keep localProfile dependency


    // handlePincodeValidation (ensure safe access to address)
    const handlePincodeValidation = useCallback(async (pincode: string) => {
        setIsPincodeLoading(true);
        try {
            const result = await validatePincode(pincode);
            if (result.valid && result.city && result.state) {
                setLocalProfile(prev => {
                    if (!prev) return null;
                    // Ensure prev.address exists before spreading
                    const currentAddress = prev.address || { line1: "", line2: "", city: "", state: "", zip: "", country: "" };
                    return {
                        ...prev,
                        address: {
                            ...currentAddress, // Spread potentially empty address
                            zip: pincode,
                            city: result.city || "",
                            state: result.state || "",
                        },
                    };
                });
                setCharCounts(prevCounts => ({
                    ...prevCounts,
                    city: result.city?.length || 0,
                    state: result.state?.length || 0,
                    zip: pincode.length,
                }));
                toast.success("Pincode validated successfully");
            } else {
                toast.error(result.message || "Invalid pincode");
            }
        } catch (error) {
            console.error("Pincode validation error:", error);
            toast.error("Failed to validate pincode.");
        } finally {
            setIsPincodeLoading(false);
        }
    }, [validatePincode]);


    // handleInputChange (ensure safe access to address)
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        // --- Character Count Update & Input Processing ---
        if (name === 'name' || name === 'phone' || name.startsWith('address.')) {
            const fieldName = name.includes('.') ? name.split('.')[1] : name;
            const maxLengths: { [key: string]: number } = { name: 50, phone: 10, zip: 6, line1: 50, line2: 50, city: 50, state: 50, country: 50 };
            let processedValue = value;

            if (maxLengths[fieldName] && value.length > maxLengths[fieldName]) {
                processedValue = value.slice(0, maxLengths[fieldName]);
            }
            if ((fieldName === 'phone' || fieldName === 'zip') && !/^\d*$/.test(processedValue)) {
                return; // Prevent non-digit input
            }

            setCharCounts(prev => ({ ...prev, [fieldName]: processedValue.length }));

            if (fieldName === 'zip' && processedValue.length === 6) {
                handlePincodeValidation(processedValue);
            }
        }

        // --- Update localProfile state ---
        setLocalProfile(prev => {
            if (!prev) return null; // Should not happen if logic is correct, but safe check

            let newProfile = { ...prev };

            if (name.includes('.')) {
                const [parent, child] = name.split('.');
                 // Ensure address object exists before updating nested property
                if (parent === 'address') {
                    const currentAddress = newProfile.address || { line1: "", line2: "", city: "", state: "", zip: "", country: "" };
                    newProfile = {
                        ...newProfile,
                        address: {
                            ...currentAddress,
                            [child]: value, // Use original value for state update
                        },
                    };
                }
                // Handle other potential nested structures if needed
            } else {
                // Use type assertion carefully or ensure UserProfile allows index signature
                 (newProfile as any)[name] = value; // Use original value for state update
            }
            return newProfile;
        });

    }, [handlePincodeValidation]);


    // handleSubmit (ensure safe access to address)
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Ensure localProfile and address exist before accessing nested properties
        if (!localProfile || !user || !localProfile.address) {
            toast.error("Profile data or user context is missing.");
            return;
        }

        // Use optional chaining for safety, though checks above should suffice
        if (localProfile.phone && !/^\d{10}$/.test(localProfile.phone)) { toast.error("Phone number must be exactly 10 digits"); return; }
        if (localProfile.address.zip && !/^\d{6}$/.test(localProfile.address.zip)) { toast.error("Pincode must be exactly 6 digits"); return; }
        if (!localProfile.name?.trim()) { toast.error("Full Name cannot be empty."); return; }
        if (!localProfile.address.line1?.trim()) { toast.error("Address Line 1 cannot be empty."); return; }
        if (!localProfile.address.city?.trim()) { toast.error("City cannot be empty."); return; }
        if (!localProfile.address.state?.trim()) { toast.error("State cannot be empty."); return; }
        if (!localProfile.address.country?.trim()) { toast.error("Country cannot be empty."); return; }
        if (!localProfile.address.zip?.trim()) { toast.error("Pincode cannot be empty."); return; } // Added Pincode check

        // Prepare payloads safely using optional chaining or fallbacks
        const updatePayload: Partial<Omit<ProfileData, 'userId' | 'email'>> = {
            name: localProfile.name || "",
            addressLine1: localProfile.address.line1 || "",
            addressLine2: localProfile.address.line2 || "",
            city: localProfile.address.city || "",
            state: localProfile.address.state || "",
            country: localProfile.address.country || "",
            pincode: localProfile.address.zip || "",
            mobile: localProfile.phone || "",
        };

        const createPayload: Omit<ProfileData, 'userId'> = {
            name: localProfile.name || "",
            email: localProfile.email || user.email || "",
            addressLine1: localProfile.address.line1 || "",
            addressLine2: localProfile.address.line2 || "",
            city: localProfile.address.city || "",
            state: localProfile.address.state || "",
            country: localProfile.address.country || "",
            pincode: localProfile.address.zip || "",
            mobile: localProfile.phone || "",
        };

        setIsLoadingProfile(true);
        setLoadingMessage(localProfile.profileDocId ? "Updating profile..." : "Creating profile...");

        try {
            if (localProfile.profileDocId) {
                updateProfile(
                    { documentId: localProfile.profileDocId, data: updatePayload },
                    { onSettled: () => setIsLoadingProfile(false) }
                );
            } else {
                 // Double-check with latest query data before creating unnecessarily
                const currentQueryData = profileData; // Use cached data directly if needed or rely on query state
                 if (currentQueryData?.profileDocId) {
                    console.warn("[ProfileService] Local state had no docId, but query found one. Updating instead.");
                    updateProfile(
                        { documentId: currentQueryData.profileDocId, data: updatePayload },
                        { onSettled: () => setIsLoadingProfile(false) }
                    );
                } else {
                    createProfile(
                        createPayload,
                        { onSettled: () => setIsLoadingProfile(false) }
                    );
                }
            }
        } catch (error) {
            console.error("Error dispatching profile mutation:", error);
            toast.error("An unexpected error occurred while saving.");
            setIsLoadingProfile(false);
        }
    };

    const refreshProfileData = useCallback(() => {
        console.log("[ProfileService] Triggering TanStack Query refetch.");
        setLoadingMessage("Refreshing profile data...");
        // Prevent showing default form during refresh, keep localProfile as is until data arrives
        // setLocalProfile(null); // <<<--- DO NOT reset localProfile here
        refetch().finally(() => {
            setLoadingMessage("");
        });
    }, [refetch, setLoadingMessage]);


    // syncFormWithQuery (Rarely needed, use with caution)
     const syncFormWithQuery = useCallback(() => {
         const currentQueryData = profileData; // Consider using queryClient.getQueryData if immediate sync needed
         if (currentQueryData) {
             setLocalProfile(currentQueryData);
             // update char counts if needed...
         }
     }, [profileData]);


    return {
        localProfile,
        setLocalProfile, // Expose if manual updates needed elsewhere
        isLoading: isQueryLoading || isQueryFetching, // Combined loading state
        isSaving: isCreating || isUpdating,
        isPincodeLoading,
        isError, // Expose query error state
        profileExists: !!profileData, // Based on query data existence
        charCounts,
        handleInputChange,
        handleSubmit,
        refreshProfileData,
        syncFormWithQuery, // Expose if needed
    };
};