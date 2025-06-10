// src/components/global/hooks/useProductCategories.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// Define the nested product categories structure type (shared)
export type LabelItem = {
  name: string;
  display_url: string | null;
};

export type ProductCategoriesStructure = {
  [category: string]: {
    [subcategory: string]: LabelItem[];
  };
};

export const PRODUCT_CATEGORIES_QUERY_KEY = 'productCategoriesStructure';

// --- Function to fetch categories (shared) ---
export async function fetchCategoriesStructure(): Promise<ProductCategoriesStructure | null> {
  const { data, error } = await supabase.rpc("get_product_categories_structure");

  if (error) {
    console.error("Error fetching product categories structure from RPC:", error);
    toast.error("Failed to load shop categories. Please try again later.");
    return null;
  }

  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
      if (Array.isArray(data) && data.length > 0 && data[0] && typeof data[0] === 'object' && 'get_product_categories_structure' in data[0]) {
         return (data[0] as any).get_product_categories_structure as ProductCategoriesStructure | null;
      }
      return typeof data === 'object' && !Array.isArray(data) ? data as ProductCategoriesStructure : null;
  }
  return data as ProductCategoriesStructure | null;
}

export function useProductCategories() {
  return useQuery<ProductCategoriesStructure | null, Error>({
    queryKey: [PRODUCT_CATEGORIES_QUERY_KEY],
    queryFn: fetchCategoriesStructure,
    staleTime: 1000 * 60 * 60, // Cache categories for 1 hour
    gcTime: 1000 * 60 * 120, // Keep in cache for 2 hours
    refetchOnWindowFocus: false, // Typically, category structure doesn't change that often
    // If the query fails on initial load, it will be in 'error' state.
    // Components using this hook should handle the error state (e.g., show a message).
    // Default retry is 3 times for useQuery, which should be sufficient for transient network issues.
  });
}