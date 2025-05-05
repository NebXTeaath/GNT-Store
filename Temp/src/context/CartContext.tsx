// src/context/CartContext.tsx
import React, { createContext, useContext, ReactNode, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient, QueryKey } from '@tanstack/react-query'; // Import QueryKey
import { toast } from "sonner";
import { useAuth } from './AuthContext';
import { useDiscount } from './DiscountContext';
import { supabase } from '@/lib/supabase';
import { FunctionsError, FunctionsHttpError, FunctionsRelayError, FunctionsFetchError } from '@supabase/supabase-js'; // Import Function error types


// Types for Supabase Function responses
type SupabaseFunctionResponse<T> = { data: T | null; error: FunctionsError | FunctionsHttpError | FunctionsRelayError | FunctionsFetchError | null };

export interface CartItem {
    id: string; // Product UUID
    title: string;
    price: number; // Original price
    discount_price: number; // Selling price (after potential base discount)
    quantity: number;
    image: string;
    slug: string; // For navigation
}
interface CartContextType {
    cartItems: CartItem[];
    addToCart: (item: Omit<CartItem, 'quantity'>, quantity: number) => Promise<boolean>;
    updateQuantity: (id: string, quantity: number) => Promise<boolean>;
    removeItem: (id: string) => Promise<boolean>;
    clearCart: () => Promise<boolean>;
    cartTotal: number; // Final price after user-applied discount
    cartSubtotal: number; // Price before user-applied discount
    cartDiscountAmount: number; // Amount of user-applied discount
    isLoading: boolean;
    isAuthenticated: boolean;
    cartCount: number;
    refetchCart: () => void; // Function to manually refetch
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};

// Fetch cart data using the 'cart' Edge Function (GET)
async function fetchCartData(): Promise<CartItem[]> {
    try {
        // Auth handled automatically by Supabase client if user is logged in
        const { data, error } = await supabase.functions.invoke<CartItem[]>('cart', { method: 'GET' });

        if (error) {
            // Handle specific errors like Unauthorized
            if (error instanceof FunctionsHttpError && error.context.status === 401) {
                console.warn('Unauthorized fetching cart, likely logged out.');
                return []; // Return empty cart if not logged in
            }
            throw error; // Rethrow other errors
        }
        // console.log("Fetched Cart Data:", data); // Debug log
        return data ?? []; // Return fetched data or empty array
    } catch (error: any) {
        console.error('Error fetching cart:', error);
        // Don't throw here for TanStack Query, let it handle the error state
        return []; // Return empty on error to avoid breaking UI, TanStack Query marks it as error
    }
}

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user, isAuthenticated } = useAuth();
    const userId = user?.id;
    const queryClient = useQueryClient();
    const { discountRate } = useDiscount(); // Get discount rate from context

    // --- TanStack Query for fetching cart data ---
    const cartQueryKey: QueryKey = useMemo(() => ['cart', userId], [userId]); // Stable query key

    const {
        data: cartItems = [], // Default to empty array
        isLoading: isCartLoading,
        isFetching: isCartFetching,
        isError: isCartError,
        error: cartError,
        refetch: refetchCart, // Expose refetch function
    } = useQuery<CartItem[], Error>({
        queryKey: cartQueryKey,
        queryFn: fetchCartData,
        enabled: !!userId && isAuthenticated, // Only fetch if logged in
        staleTime: 1 * 60 * 1000, // 1 minute stale time
        gcTime: 10 * 60 * 1000, // 10 minutes garbage collection time
        refetchOnWindowFocus: true,
        placeholderData: [], // Use empty array as placeholder during initial load
        retry: 1, // Retry once on failure
    });

    // --- TanStack Mutations for cart actions ---

    // FIX 1 & 2: Correct the variable types and body structure
    // Define expected body structure for POST/PATCH
    interface CartUpdatePayload { product_uuid: string; quantity: number; }
    interface CartRemovePayload { product_uuid: string; }

    // Generic mutation hook
    const useCartMutation = <TVariables, TData = any>(
        mutationFn: (vars: TVariables) => Promise<SupabaseFunctionResponse<TData>>, // Expect Supabase function response
        options?: { invalidate?: boolean; successToast?: string; errorToastPrefix?: string }
    ) => {
        return useMutation<TData | null, Error, TVariables>({ // Allow TData to be null
            mutationFn: async (variables) => {
                const { data, error } = await mutationFn(variables);
                if (error) {
                    throw new Error(error.message || 'API call failed');
                }
                return data; // Return only data on success (can be null)
            },
            onSuccess: (_, variables) => {
                if (options?.invalidate !== false) {
                    queryClient.invalidateQueries({ queryKey: cartQueryKey });
                }
                if (options?.successToast) {
                     // Use a stable ID for toasts to prevent duplicates on rapid clicks
                    toast.success(options.successToast, { id: `cart-${JSON.stringify(variables)}` });
                }
            },
            onError: (error, variables) => {
                toast.error(`${options?.errorToastPrefix || 'Error'}: ${error.message}`, { id: `cart-${JSON.stringify(variables)}` });
            },
        });
    };

    // Add/Update Item Mutation
    const { mutateAsync: upsertItemMutation } = useCartMutation<CartUpdatePayload>(
        (vars) => supabase.functions.invoke('cart', { method: 'POST', body: vars }), // Pass vars directly
        { errorToastPrefix: 'Add/Update Failed' }
    );

    // Update Quantity Mutation
    const { mutateAsync: updateQuantityMutation } = useCartMutation<CartUpdatePayload>(
        (vars) => supabase.functions.invoke('cart', { method: 'PATCH', body: vars }), // Pass vars directly
        { successToast: "Quantity updated", errorToastPrefix: 'Update Failed' }
    );

    // Remove Item Mutation
    const { mutateAsync: removeItemMutation } = useCartMutation<CartRemovePayload>(
         // Send product_uuid as query parameter for DELETE
        (vars) => supabase.functions.invoke(`cart?product_uuid=${vars.product_uuid}`, { method: 'DELETE' }),
        { successToast: "Item removed", errorToastPrefix: 'Remove Failed' }
    );

    // FIX 3: Explicitly type TVariables as void for clearCart
    // Clear Cart Mutation
    const { mutateAsync: clearCartMutation } = useCartMutation<void>(
        () => supabase.functions.invoke(`cart?clear=true`, { method: 'DELETE' }),
        { successToast: "Cart cleared", errorToastPrefix: 'Clear Failed' }
    );

    // --- Cart Action Handlers ---

    const removeItem = useCallback(async (id: string): Promise<boolean> => {
        if (!isAuthenticated) { toast.error("Please log in", { id: "cart-login-toast" }); return false; }
        try {
             // Pass correct payload shape
            await removeItemMutation({ product_uuid: id });
            return true;
        } catch (e) { return false; }
    }, [isAuthenticated, removeItemMutation]);

    const updateQuantity = useCallback(async (id: string, quantity: number): Promise<boolean> => {
        if (!isAuthenticated) { toast.error("Please log in", { id: "cart-login-toast" }); return false; }
        if (quantity < 1) return removeItem(id); // Remove if quantity is less than 1
        if (quantity > 99) { toast.error("Max quantity is 99", { id: "cart-max-qty" }); quantity = 99; } // Clamp quantity
        try {
             // Pass correct payload shape
            await updateQuantityMutation({ product_uuid: id, quantity });
            return true;
        } catch (e) { return false; }
    }, [isAuthenticated, updateQuantityMutation, removeItem]);

    const addToCart = useCallback(async (item: Omit<CartItem, 'quantity'>, quantity: number): Promise<boolean> => {
        if (!isAuthenticated) { toast.error("Please log in", { id: "cart-login-toast" }); return false; }
        if (quantity < 1 || quantity > 99) { toast.error("Quantity must be 1-99", { id: "cart-qty-toast" }); return false; }
        const existingItem = cartItems.find(ci => ci.id === item.id);
        // Limit unique items in cart
        if (!existingItem && cartItems.length >= 20) { toast.error("Cart full (max 20 unique items)", { id: "cart-full-toast" }); return false; }
        try {
             // Pass correct payload shape
            await upsertItemMutation({ product_uuid: item.id, quantity });
            toast.success(existingItem ? "Cart updated" : "Item added", { id: "cart-add-ok" });
            return true;
        } catch (e) { return false; }
    }, [isAuthenticated, cartItems, upsertItemMutation]);

    const clearCart = useCallback(async (): Promise<boolean> => {
        if (!isAuthenticated) { toast.error("Please log in", { id: "cart-login-toast" }); return false; }
        if (cartItems.length === 0) { toast.info("Cart already empty", { id: "cart-empty-info" }); return true; } // Avoid unnecessary API call
        try {
             // Call mutation without arguments
            await clearCartMutation();
            return true;
        } catch (e) { return false; }
    }, [isAuthenticated, cartItems.length, clearCartMutation]);

    // --- Derived State Calculations ---
    const cartCount = useMemo(() => cartItems.length, [cartItems]); // <-- CORRECTED LOGIC: Count unique items
    const cartSubtotal = useMemo(() => cartItems.reduce((sum, item) => sum + item.discount_price * item.quantity, 0), [cartItems]);
    const cartDiscountAmount = useMemo(() => cartSubtotal * discountRate, [cartSubtotal, discountRate]);
    const cartTotal = useMemo(() => Math.max(0, cartSubtotal - cartDiscountAmount), [cartSubtotal, cartDiscountAmount]); // Ensure total is not negative

    // Display error toast if fetching fails
    useEffect(() => {
        if (isCartError && cartError) {
            toast.error("Error loading cart", { id:"cart-load-fail", description: cartError.message });
        }
    }, [isCartError, cartError]);

    // --- Context Provider Value ---
    const contextValue: CartContextType = {
        cartItems,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        cartTotal,
        cartSubtotal,
        cartDiscountAmount,
        isLoading: isCartLoading || isCartFetching, // Show loading if initially loading OR refetching
        isAuthenticated,
        cartCount,
        refetchCart, // Provide refetch function
    };

    return (
        <CartContext.Provider value={contextValue}>
            {children}
        </CartContext.Provider>
    );
};