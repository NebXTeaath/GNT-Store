// src/pages/GameLoadService/gameLoadHistory/gameLoadHistoryService.ts
import { supabase } from "@/lib/supabase";

// Type for a single game load request, matching the DB table
export interface FetchedGameLoadRequest {
  id: string;
  user_id: string;
  created_at: string;
  console_type: 'PS4' | 'PS5';
  available_storage: number;
  storage_unit: 'GB' | 'TB';
  games_list: string[];
  storage_addon_added: boolean;
  final_price: number;
  base_service_price: number; 
  storage_addon_price: number; 
  status: string;
  user_profile_snapshot: any; // Or a more specific profile type
  remark?: string | null;
}

// Type for the RPC response
interface GetUserGameLoadRequestsRpcResponse {
  requests: FetchedGameLoadRequest[];
  totalCount: number;
  error?: string;
}

// Function to fetch paginated game load history
export const fetchUserGameLoadRequestsRpc = async (
  page: number,
  pageSize: number
): Promise<GetUserGameLoadRequestsRpcResponse> => {
  const { data, error } = await supabase
    .rpc('get_user_game_load_requests', {
        p_page_number: page,
        p_page_size: pageSize
    })
    .single<GetUserGameLoadRequestsRpcResponse>();

  if (error) {
    throw new Error(`Failed to fetch game load history: ${error.message}`);
  }

  if (data?.error) {
    throw new Error(`Failed to fetch game load history: ${data.error}`);
  }

  return {
    requests: data?.requests ?? [],
    totalCount: data?.totalCount ?? 0,
  };
};

// Helper functions for formatting
export const formatDate = (dateString: string | undefined | null): string => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
};

export const formatStatus = (status: string): string => {
  return status.charAt(0).toUpperCase() + status.slice(1);
};

export const getStatusColor = (status: string): string => {
  const s = status?.toLowerCase() ?? 'unknown';
  switch (s) {
    case "pending": return "bg-orange-500/10 text-orange-400";
    case "in-progress": return "bg-blue-500/10 text-blue-400";
    case "completed": return "bg-emerald-500/10 text-emerald-400";
    case "cancelled": return "bg-red-500/10 text-red-400";
    default: return "bg-gray-500/10 text-gray-400";
  }
};