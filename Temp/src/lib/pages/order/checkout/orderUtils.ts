// src/pages/order/checkout/orderUtils.ts
import { supabase } from '@/lib/supabase'; // Keep only one import
import { FunctionsError, FunctionsHttpError } from '@supabase/supabase-js';

// Keep type definitions (assuming they are needed here or exported for use elsewhere)
export interface OrderItem {
    id: string; // Product UUID from your DB
    title: string;
    image?: string;
    price: number; // Original price
    discount_price: number; // Selling price
    quantity: number;
    slug?: string; // Optional: For linking back to product page
}

export interface UserProfileAddress {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string; // Pincode
    country: string;
}

export interface UserProfile {
    id: string; // This should be the Supabase Auth User ID
    name: string;
    email: string;
    phone: string;
    address: UserProfileAddress;
    profileDocId?: string; // Optional: If you also store a separate profile document ID
}

interface OrderPayload {
    // userId: string; // User ID will be implicitly available in the Edge Function via auth token
    cartItems: OrderItem[];
    userProfile: UserProfile; // Send necessary profile snapshot
    discountCode?: string | null;
}

// Structure expected from the 'orders' Edge Function response
interface OrderResponse {
    success: boolean;
    orderId?: string; // The ID of the newly created order in Supabase DB
    order?: any; // Optional: Full order details if returned by function
    error?: string; // Error message string from function
    message?: string; // Success or info message from function
}

// --- Add the missing Supabase Order Details Structure Definitions ---
// Structure expected within the 'order_details' JSONB column of the 'orders' table
export interface OrderDetailsStructure {
    customer: {
        name: string;
        email: string;
        phone: string;
        address: string; // Combined address string
    };
    order_date: string; // ISO timestamp
    products: Array<{
        id: string; // Product UUID
        name: string;
        image?: string; // URL
        slug?: string;
        price: number; // Original price per unit at time of order
        discount_price: number; // Selling price per unit at time of order
        quantity: number;
        subtotal: number; // quantity * discount_price
    }>;
    order_summary: {
        items_count: number;
        subtotal: number; // Sum of product subtotals
        discount_code: string | null;
        discount_amount: number; // Calculated discount amount
        discount_type?: string; // 'percentage' or 'fixed'
        discount_rate?: number; // The rate applied (e.g., 0.05 for 5%)
        total: number; // Final amount paid (subtotal - discount_amount)
        // Add tax, shipping if applicable
    };
}

// Structure representing a row fetched from the 'orders' Supabase table
export interface FetchedSupabaseOrder {
    id: string; // Order UUID (PK)
    user_id: string; // User UUID (FK to auth.users)
    order_details: OrderDetailsStructure; // The JSONB data
    order_status: string; // e.g., 'pending', 'processing', 'shipped', 'delivered', 'cancelled'
    total_amount: number; // Matches order_details.order_summary.total
    discount_code: string | null;
    discount_amount: number | null;
    remark: string | null; // Optional admin remarks or tracking info
    created_at: string; // Timestamp
    updated_at: string; // Timestamp
}
// --- End Added Definitions ---


interface OrderResponse {
    success: boolean;
    orderId?: string; // UUID string
    message?: string; // Success or error message from function/RPC
    error?: string;   // Optional top-level error type
    total?: number;   // Optional final total if returned
    details?: string; // Optional details on RPC call failure
}

// Function to invoke the Supabase Edge Function 'orders' (now calling RPC internally)
export async function createServerOrder(
    cartItems: OrderItem[],
    userProfile: UserProfile,
    discountCode: string | null
): Promise<string> { // Still returns order ID on success
    console.log("[createServerOrder] Preparing payload for 'orders' Edge Function...");

    // Prepare the payload according to the Edge Function's expectation
    // THIS IS THE LINE TO FIX:
    const payload: OrderPayload = {
        
        // CORRECT ASSIGNMENTS:
        cartItems: cartItems,         // Assign cartItems array to cartItems key
        userProfile: userProfile,     // Assign userProfile object to userProfile key
        discountCode: discountCode || null, // Assign discountCode string/null to discountCode key
    };
    console.log("[createServerOrder] Sending payload:", JSON.stringify(payload, null, 2)); // Log payload for debugging

    try {
        // Invoke the Edge function (which now calls the RPC)
        const { data, error } = await supabase.functions.invoke<OrderResponse>('orders', {
            method: 'POST',
            body: payload,
        });

        // Handle Edge Function Invocation Errors (Network, 5xx from function itself)
        if (error) {
            let displayMessage = error.message || 'Failed to communicate with order service.';
             // Try to get more context for logging/debugging
             if (error instanceof FunctionsHttpError) {
                 console.error('Edge Function HTTP Error Context:', await error.context.json().catch(() => ({}))); // Log response body if possible
                 // Try to extract a specific message from the response body
                 try {
                     const errBody = await error.context.json();
                     displayMessage = errBody.message || errBody.error || displayMessage;
                 } catch { /* ignore parsing error */ }
             } else if (error instanceof FunctionsError) {
                 console.error('Edge Function Generic Error Context:', error.context);
             }

            console.error('Edge Function Invocation Error:', error); // Log the original error object
            throw new Error(displayMessage); // Throw a user-friendly error message
        }

        // Handle Application-Level Errors indicated by the Function's Response
        // (e.g., RPC returned success: false due to validation)
        if (!data || !data.success || !data.orderId) {
            const errorMessage = data?.message || "Order creation failed: Invalid response from server.";
            console.error('Order Creation Failed Logic:', errorMessage, data); // Log the response data
            throw new Error(errorMessage); // Throw the message from the function/RPC
        }

        // Success Case
        console.log(`[createServerOrder] Order successfully created via RPC. Order ID: ${data.orderId}, Message: ${data.message}`);
        return data.orderId; // Return the new Order ID

    } catch (error) {
        console.error('Error during createServerOrder process:', error); // Catch any other errors
        // Re-throw the caught error (which should now have a good message)
        // or a generic fallback
        throw error instanceof Error ? error : new Error('An unknown error occurred during order creation.');
    }
}

// Helper functions (optional, could be moved to specific components)
export function getCustomerInfo(orderDetails: OrderDetailsStructure | undefined) {
    return orderDetails?.customer;
}
export function getOrderProducts(orderDetails: OrderDetailsStructure | undefined) {
    return orderDetails?.products ?? [];
}
export function getOrderSummary(orderDetails: OrderDetailsStructure | undefined) {
    return orderDetails?.order_summary;
}

// Utility to get status color (assuming you need it here, might be better in UI component)
export const getStatusColor = (status: string | null | undefined): string => {
    const s = status?.toLowerCase();
    switch(s){
        case 'processing': return 'bg-blue-500/10 text-blue-400';
        case 'shipped': return 'bg-violet-500/10 text-violet-400';
        case 'delivered': return 'bg-emerald-500/10 text-emerald-400';
        case 'cancelled': return 'bg-red-500/10 text-red-400';
        case 'pending': return 'bg-yellow-500/10 text-yellow-400';
        case 'failed': return 'bg-red-700/20 text-red-500'; // Added failed state
        default: return 'bg-gray-500/10 text-gray-400';
    }
};

// --- REMOVED Duplicated code sections ---