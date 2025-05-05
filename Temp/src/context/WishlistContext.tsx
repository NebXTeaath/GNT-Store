// src/context/WishlistContext.tsx
import React, { createContext, useContext, ReactNode, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, QueryKey } from '@tanstack/react-query'; // Import QueryKey
import { toast } from "sonner";
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';
import { FunctionsError, FunctionsHttpError, FunctionsRelayError, FunctionsFetchError } from '@supabase/supabase-js'; // Import Function error types

// Types for Supabase Function responses
type SupabaseFunctionResponse<T> = { data: T | null; error: FunctionsError | FunctionsHttpError | FunctionsRelayError | FunctionsFetchError | null };

// Interfaces
export interface WishlistItem {
    id: string; // Product UUID
    slug: string;
    title: string;
    price: number;
    discount_price: number;
    image: string;
}

interface WishlistContextType {
    wishlistItems: WishlistItem[];
    addToWishlist: (item: Omit<WishlistItem, 'quantity'>) => Promise<boolean>; // Removed quantity from item type
    removeFromWishlist: (id: string) => Promise<boolean>;
    clearWishlist: () => Promise<boolean>;
    isInWishlist: (id: string) => boolean;
    isLoading: boolean;
    isAuthenticated: boolean;
    refetchWishlist: () => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const useWishlist = () => {
    const context = useContext(WishlistContext);
    if (context === undefined) {
        throw new Error('useWishlist must be used within a WishlistProvider');
    }
    return context;
};

// Fetch wishlist data using the 'wishlist' Edge Function (GET)
async function fetchWishlistData(): Promise<WishlistItem[]> {
    try {
        const { data, error } = await supabase.functions.invoke<WishlistItem[]>('wishlist', { method: 'GET' });
        if (error) {
            if (error instanceof FunctionsHttpError && error.context.status === 401) {
                console.warn('Unauthorized fetching wishlist, likely logged out.');
                return [];
            }
            throw error;
        }
        return data ?? [];
    } catch (error: any) {
        console.error('Error fetching wishlist:', error);
        return []; // Return empty on error
    }
}

export const WishlistProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user, isAuthenticated } = useAuth();
    const userId = user?.id;
    const queryClient = useQueryClient();

    // --- TanStack Query for fetching wishlist data ---
    const wishlistQueryKey: QueryKey = useMemo(() => ['wishlist', userId], [userId]);

    const {
        data: wishlistItems = [], // Default to empty array
        isLoading: isWishlistLoading,
        isFetching: isWishlistFetching,
        isError: isWishlistError,
        error: wishlistError,
        refetch: refetchWishlist,
    } = useQuery<WishlistItem[], Error>({
        queryKey: wishlistQueryKey,
        queryFn: fetchWishlistData,
        enabled: !!userId && isAuthenticated, // Only fetch if logged in
        staleTime: 5 * 60 * 1000, // 5 minutes stale time
        gcTime: 15 * 60 * 1000, // 15 minutes garbage collection time
        refetchOnWindowFocus: true,
        placeholderData: [], // Use empty array as placeholder
        retry: 1,
    });

    // Check if an item is in the wishlist
    const isInWishlist = useCallback((id: string): boolean => wishlistItems.some(item => item.id === id), [wishlistItems]);

    // --- TanStack Mutations for wishlist actions ---

    // FIX 3 & 4: Correct the variable types
    interface WishlistAddPayload { product_uuid: string; }
    interface WishlistRemovePayload { product_uuid: string; }
    // FIX 1: Define the expected success data type for addItemMutation, allowing null for errors
    interface AddItemResponse { alreadyExisted: boolean; item?: any; }

    // Generic mutation hook (can be reused)
    const useWishlistMutation = <TVariables, TData = any>(
        mutationFn: (vars: TVariables) => Promise<SupabaseFunctionResponse<TData>>,
        options?: {
            invalidate?: boolean;
            successToast?: string;
            errorToastPrefix?: string;
            onMutate?: (vars: TVariables) => void;
            onSuccess?: (data: TData | null, variables: TVariables) => void // Allow TData | null
        }
    ) => {
        return useMutation<TData | null, Error, TVariables>({ // Allow TData | null in result
            mutationFn: async (variables) => {
                options?.onMutate?.(variables);
                const { data, error } = await mutationFn(variables);
                if (error) {
                    throw new Error(error.message || 'API call failed');
                }
                return data; // Return data (can be null)
            },
            onSuccess: (data, variables) => {
                if (options?.invalidate !== false) {
                    queryClient.invalidateQueries({ queryKey: wishlistQueryKey });
                }
                if (options?.successToast) {
                    toast.success(options.successToast, { id: `wish-${JSON.stringify(variables)}` });
                }
                options?.onSuccess?.(data, variables); // Pass data (or null) to callback
            },
            onError: (error, variables) => {
                toast.error(`${options?.errorToastPrefix || 'Error'}: ${error.message}`, { id: `wish-${JSON.stringify(variables)}` });
            },
        });
    };

    // Add Item Mutation - FIX 1 & 3 applied
    const { mutateAsync: addItemMutation } = useWishlistMutation<WishlistAddPayload, AddItemResponse>( // TData is AddItemResponse (not null here as success has shape)
        (vars) => supabase.functions.invoke('wishlist', { method: 'POST', body: vars }),
        {
            errorToastPrefix: 'Wishlist Add Failed',
            onSuccess: (data, vars) => { // data is AddItemResponse | null
                 if (data?.alreadyExisted) { // Check if data exists and has the property
                     toast.info("Item already in wishlist", { id:`wish-${vars.product_uuid}`});
                 } else {
                     toast.success("Added to wishlist", { id:`wish-${vars.product_uuid}`});
                 }
            }
        }
    );

    // Remove Item Mutation - FIX 4 applied
    const { mutateAsync: removeItemMutation } = useWishlistMutation<WishlistRemovePayload>(
        (vars) => supabase.functions.invoke(`wishlist?product_uuid=${vars.product_uuid}`, { method: 'DELETE' }),
        { successToast: "Removed from wishlist", errorToastPrefix: 'Wishlist Remove Failed' }
    );

    // Clear Wishlist Mutation
    const { mutateAsync: clearWishlistMutation } = useWishlistMutation<void>(
        () => supabase.functions.invoke(`wishlist?clear=true`, { method: 'DELETE' }),
        {
            successToast: "Wishlist cleared",
            errorToastPrefix: 'Wishlist Clear Failed',
            // FIX 2: Explicitly type the empty array
            onSuccess: () => queryClient.setQueryData<WishlistItem[]>(wishlistQueryKey, [])
        }
    );

    // --- Wishlist Action Handlers ---

    const addToWishlist = useCallback(async (item: Omit<WishlistItem, 'quantity'>): Promise<boolean> => {
        if (!isAuthenticated) { toast.error("Please log in", { id: "wish-login-toast" }); return false; }
        if (isInWishlist(item.id)) { toast.info("Already in wishlist", { id: "wish-exists-info" }); return true; }
        try {
             // Pass correct payload shape
            await addItemMutation({ product_uuid: item.id });
            return true;
        } catch (e) { return false; }
    }, [isAuthenticated, isInWishlist, addItemMutation]);

    const removeFromWishlist = useCallback(async (id: string): Promise<boolean> => {
        if (!isAuthenticated) return false;
        try {
             // Pass correct payload shape
            await removeItemMutation({ product_uuid: id });
            return true;
        } catch (e) { return false; }
    }, [isAuthenticated, removeItemMutation]);

    const clearWishlist = useCallback(async (): Promise<boolean> => {
        if (!isAuthenticated) { toast.error("Please log in", { id: "wish-login-toast" }); return false; }
        if (wishlistItems.length === 0) { toast.info("Wishlist already empty", { id: "wish-empty-info" }); return true; }
        try {
             // Call mutation without arguments
            await clearWishlistMutation();
            return true;
        } catch (e) { return false; }
    }, [isAuthenticated, wishlistItems.length, clearWishlistMutation]);

    // Display error toast if fetching fails
    useEffect(() => {
        if (isWishlistError && wishlistError) {
            toast.error("Error loading wishlist", { id: "wish-load-fail", description: wishlistError.message });
        }
    }, [isWishlistError, wishlistError]);

    // --- Context Provider Value ---
    const contextValue: WishlistContextType = {
        wishlistItems,
        addToWishlist,
        removeFromWishlist,
        clearWishlist,
        isInWishlist,
        isLoading: isWishlistLoading || isWishlistFetching,
        isAuthenticated,
        refetchWishlist,
    };

    return (
        <WishlistContext.Provider value={contextValue}>
            {children}
        </WishlistContext.Provider>
    );
};