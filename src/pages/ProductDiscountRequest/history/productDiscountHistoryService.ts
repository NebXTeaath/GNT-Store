// src/pages/ProductDiscountRequest/history/productDiscountHistoryService.ts
import { supabase } from "@/lib/supabase";
import { FetchedProductDiscountRequest } from "@/lib/types/ProductDiscountRequestTypes";

interface RpcResponse {
  requests: FetchedProductDiscountRequest[];
  totalCount: number;
  error?: string;
}

export const fetchUserProductDiscountRequestsRpc = async (
  page: number,
  pageSize: number
): Promise<RpcResponse> => {
  const { data, error } = await supabase
    .rpc('get_user_product_discount_requests', {
        p_page_number: page,
        p_page_size: pageSize
    })
    .single<RpcResponse>();

  if (error) throw new Error(`Failed to fetch request history: ${error.message}`);
  if (data?.error) throw new Error(`Failed to fetch request history: ${data.error}`);

  return {
    requests: data?.requests ?? [],
    totalCount: data?.totalCount ?? 0,
  };
};

export const formatDate = (dateString: string | undefined | null): string => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
};

export const formatStatus = (status: string): string => {
  if (!status) return 'Unknown';
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export const getStatusColor = (status: string): string => {
  const s = status?.toLowerCase() ?? 'unknown';
  switch (s) {
    case "pending": return "border-orange-500/80";
    case "offer_sent": return "border-blue-500/80";
    case "approved": return "border-green-500/80";
    case "rejected": return "border-red-500/80";
    case "ordered": return "border-purple-500/80";
    default: return "border-gray-500/80";
  }
};

export const getStatusTextColor = (status: string): string => {
  const s = status?.toLowerCase() ?? 'unknown';
  switch (s) {
    case "pending": return "text-orange-400";
    case "offer_sent": return "text-blue-400";
    case "approved": return "text-green-400";
    case "rejected": return "text-red-400";
    case "ordered": return "text-purple-400";
    default: return "text-gray-400";
  }
};