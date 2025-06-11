// src/lib/pages/order/checkout/orderUtils.ts
import { supabase } from '@/lib/supabase';
import { FunctionsError, FunctionsHttpError } from '@supabase/supabase-js';

// Rich CartItem structure (as used in CartContext and for display on the frontend)
export interface DisplayCartItem {
    id: string; // Product UUID
    title: string;
    price: number; // Original price
    discount_price: number; // Selling price (after potential base discount)
    quantity: number;
    image: string; // URL
    slug: string; // For navigation
}

// UserProfile and UserProfileAddress interfaces remain the same
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

// Simplified structure for cart items in the order payload sent to the backend
interface OrderPayloadCartItem {
    id: string; // Product UUID
    quantity: number;
}

// OrderPayload now uses the simplified cart item structure
interface OrderPayload {
    cartItems: OrderPayloadCartItem[];
    userProfile: UserProfile;
    discountCode?: string | null;
}

// Structure expected from the 'orders' Edge Function response
interface OrderResponse {
    success: boolean;
    orderId?: string; // The ID of the newly created order in Supabase DB
    message?: string; // Success or info message from function
    error?: string;   // Optional top-level error type
    total?: number;   // Optional final total if returned
    details?: string; // Optional details on RPC call failure
}

// Function to invoke the Supabase Edge Function 'orders'
export async function createServerOrder(
    displayCartItems: DisplayCartItem[], // Receive the rich cart items from the context
    userProfile: UserProfile,
    discountCode: string | null
): Promise<string> { // Still returns order ID on success
    console.log("[createServerOrder] Preparing payload for 'orders' Edge Function...");

    // MAP rich DisplayCartItem[] to simplified OrderPayloadCartItem[]
    const simplifiedCartItems: OrderPayloadCartItem[] = displayCartItems.map(item => ({
        id: item.id,
        quantity: item.quantity,
    }));

    // Prepare the payload with simplified cart items
    const payload: OrderPayload = {
        cartItems: simplifiedCartItems,
        userProfile: userProfile,
        discountCode: discountCode || null,
    };
    console.log("[createServerOrder] Sending payload:", JSON.stringify(payload, null, 2));

    try {
        // Invoke the Edge function
        const { data, error } = await supabase.functions.invoke<OrderResponse>('orders', {
            method: 'POST',
            body: payload,
        });

        // Handle Edge Function Invocation Errors
        if (error) {
            let displayMessage = error.message || 'Failed to communicate with order service.';
            if (error instanceof FunctionsHttpError) {
                console.error('Edge Function HTTP Error Context:', await error.context.json().catch(() => ({})));
                try {
                    const errBody = await error.context.json();
                    displayMessage = errBody.message || errBody.error || displayMessage;
                } catch { /* ignore parsing error */ }
            } else if (error instanceof FunctionsError) { // More generic FunctionsError
                console.error('Edge Function Generic Error Context:', error.context);
            }
            console.error('Edge Function Invocation Error:', error);
            throw new Error(displayMessage);
        }

        // Handle Application-Level Errors from the Function's Response
        if (!data || !data.success || !data.orderId) {
            const errorMessage = data?.message || data?.error || "Order creation failed: Invalid response from server.";
            console.error('Order Creation Failed Logic:', errorMessage, data);
            throw new Error(errorMessage);
        }

        // Success Case
        console.log(`[createServerOrder] Order successfully created. Order ID: ${data.orderId}, Message: ${data.message}`);
        return data.orderId;

    } catch (error) {
        console.error('Error during createServerOrder process:', error);
        throw error instanceof Error ? error : new Error('An unknown error occurred during order creation.');
    }
}

// --- Definitions for data structures fetched from the database (e.g., for order history) ---
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

// Utility to get status color
export const getStatusColor = (status: string | null | undefined): string => {
    const s = status?.toLowerCase();
    switch(s){
        case 'processing': return 'bg-blue-500/10 text-blue-400';
        case 'shipped': return 'bg-violet-500/10 text-violet-400';
        case 'out for delivery': return 'bg-cyan-500/10 text-cyan-400';
        case 'delivered': return 'bg-emerald-500/10 text-emerald-400';
        case 'cancelled': return 'bg-red-500/10 text-red-400';
        case 'pending': return 'bg-yellow-500/10 text-yellow-400';
        case 'failed': return 'bg-red-700/20 text-red-500';
        default: return 'bg-gray-500/10 text-gray-400';
    }
};