// src/pages/order/orderHistory/orderService.ts
import { supabase } from "@/lib/supabase"; // Use Supabase client
import { FetchedSupabaseOrder } from "@/pages/order/checkout/orderUtils"; // Import the correct type

// Define the expected structure of the RPC response
interface GetUserOrdersRpcResponse {
  orders: FetchedSupabaseOrder[];
  totalCount: number;
  error?: string; // Include optional error field from RPC EXCEPTION block
}

// Keep Order interface if needed, but FetchedSupabaseOrder is more accurate for data from DB
// You might need to adjust OrderCard/OrderDetailsPopup props if they strictly used the old 'Order' type
export interface Order extends FetchedSupabaseOrder {} // Simple alias for now

// Function to fetch orders using the Supabase RPC
export const fetchUserOrdersRpc = async (
  page: number,
  pageSize: number
): Promise<GetUserOrdersRpcResponse> => {
  console.log(`[fetchUserOrdersRpc] Fetching page ${page}, size ${pageSize}`);
  try {
    // No need to pass userId, RPC gets it from auth context
    const { data, error } = await supabase
      .rpc('get_user_orders', {
          p_page_number: page,
          p_page_size: pageSize
      })
      .single<GetUserOrdersRpcResponse>(); // Expect a single JSON object back

    if (error) {
      console.error("Error calling get_user_orders RPC:", error);
      throw new Error(`Failed to fetch orders: ${error.message}`);
    }

    if (!data) {
        console.error("No data returned from get_user_orders RPC");
        throw new Error("Failed to fetch orders: No data received.");
    }

    // Check if the RPC itself returned an error message (from EXCEPTION block)
    if (data.error) {
        console.error("Error reported by get_user_orders RPC:", data.error);
        throw new Error(`Failed to fetch orders: ${data.error}`);
    }

    console.log(`[fetchUserOrdersRpc] Received ${data.orders?.length ?? 0} orders, total count ${data.totalCount}`);

    // Ensure orders array exists, default to empty array if null/undefined
    return {
        orders: data.orders ?? [],
        totalCount: data.totalCount ?? 0
    };

  } catch (error) {
    console.error("Error in fetchUserOrdersRpc:", error);
    // Re-throw the error so React Query can handle it
    throw error;
  }
};


// ----- Keep helper functions if they are used elsewhere, otherwise remove -----

// Format currency values for display (ensure consistency, maybe use the one from lib/currencyFormat)
// export const formatCurrency = (amount: number): string => { ... };

// Get the color class for an order status (ensure consistency, maybe use the one from orderUtils)
// export const getStatusColor = (status: string): string => { ... };

// Format date for display
export const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        // Check if date is valid before formatting
        if (isNaN(date.getTime())) {
            return 'Invalid Date';
        }
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return 'Invalid Date';
    }
};

// Get status icon based on order status (can keep this simple helper)
export const getStatusIcon = (status: string = ''): string => {
  switch (status.toLowerCase()) {
    case 'processing': return '⚙️';
    case 'shipped': return '🚚';
    case 'delivered': return '✅';
    case 'cancelled': return '❌';
    case 'pending': return '⏳';
    case 'failed': return '⚠️'; // Added failed icon
    default: return '⏳';
  }
};