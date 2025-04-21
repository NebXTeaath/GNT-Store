// src/pages/repairPage/history/repairHistoryService.ts
import { supabase } from "@/lib/supabase";

// Define the structure for a single repair request based on the table/RPC select
// Make sure this matches the columns selected in your RPC function
export interface FetchedSupabaseRepairRequest {
  id: string;
  user_id: string;
  creation_date: string; // ISO date string
  status: string;
  product_type: string;
  product_description: string;
  shipping_address: any; // Use 'any' or a more specific type like ShippingAddressData if defined
  remark?: string | null;
  technician?: string | null;
  estimated_completion?: string | null; // ISO date string or null
  notes?: string | null;
  updated_at: string; // ISO date string
  // Add other fields if selected in the RPC (e.g., product_model)
}

// Define the expected structure of the RPC response JSON object
interface GetUserRepairRequestsRpcResponse {
  requests: FetchedSupabaseRepairRequest[];
  totalCount: number;
  error?: string; // Optional error field from the RPC's EXCEPTION block
}

// --- Fetch Function using the RPC ---
export const fetchUserRepairRequestsRpc = async (
  page: number,
  pageSize: number
): Promise<GetUserRepairRequestsRpcResponse> => {
  console.log(`[fetchUserRepairRequestsRpc] Fetching page ${page}, size ${pageSize}`);
  try {
    // Call the RPC function created in Step 1
    const { data, error } = await supabase
      .rpc('get_user_repair_requests', {
          p_page_number: page,
          p_page_size: pageSize
      })
      // Expect a single JSON object back { requests: [], totalCount: N }
      .single<GetUserRepairRequestsRpcResponse>();

    // Handle Supabase client errors (network, permissions, etc.)
    if (error) {
      console.error("Error calling get_user_repair_requests RPC:", error);
      throw new Error(`Failed to fetch repair requests: ${error.message}`);
    }

    // Handle case where RPC returns no data (unexpected)
    if (!data) {
        console.error("No data returned from get_user_repair_requests RPC");
        throw new Error("Failed to fetch repair requests: No data received.");
    }

    // Handle errors reported *within* the RPC response (from EXCEPTION block)
    if (data.error) {
        console.error("Error reported by get_user_repair_requests RPC:", data.error);
        throw new Error(`Failed to fetch repair requests: ${data.error}`);
    }

    console.log(`[fetchUserRepairRequestsRpc] Received ${data.requests?.length ?? 0} requests, total count ${data.totalCount}`);

    // Ensure 'requests' array exists, default to empty array if null/undefined
    // Return the structured data
    return {
        requests: data.requests ?? [],
        totalCount: data.totalCount ?? 0
    };

  } catch (error) {
    // Log any other errors during the fetch process
    console.error("Error in fetchUserRepairRequestsRpc:", error);
    // Re-throw the error so React Query can handle it (e.g., display error state)
    throw error;
  }
};

// --- Helper Functions (Keep or adapt existing ones) ---

// Format date (copied from orderService for consistency, ensure it handles ISO strings)
export const formatDate = (dateString: string | undefined | null): string => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return 'Invalid Date';
        }
        return date.toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return 'Invalid Date';
    }
};

// Format status (copied from repairHistoryService)
export const formatRepairStatus = (status: string | null | undefined): string => {
    const s = status || 'Unknown';
    return s.charAt(0).toUpperCase() + s.slice(1);
};

// Get status color (copied from repairHistoryService)
export const getStatusColor = (status: string | null | undefined): string => {
    const s = status?.toLowerCase() ?? 'unknown';
    switch (s) {
        case "pending": return "bg-orange-500/10 text-orange-400"; // Adjusted colors
        case "received": return "bg-blue-500/10 text-blue-400";
        case "diagnosing": return "bg-indigo-500/10 text-indigo-400";
        case "repairing": return "bg-violet-500/10 text-violet-400";
        case "completed": return "bg-emerald-500/10 text-emerald-400";
        case "cancelled": return "bg-red-500/10 text-red-400";
        default: return "bg-gray-500/10 text-gray-400";
    }
};

// Get status icon (optional helper)
export const getStatusIcon = (status: string = ''): string => {
  switch (status.toLowerCase()) {
    case 'pending': return '⏳';
    case 'received': return '📬';
    case 'diagnosing': return '🩺';
    case 'repairing': return '🛠️';
    case 'completed': return '✅';
    case 'cancelled': return '❌';
    default: return '⏳';
  }
};