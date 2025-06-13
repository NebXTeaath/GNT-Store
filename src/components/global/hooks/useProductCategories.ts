// src/components/global/hooks/useProductCategories.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// --- NEW/MODIFIED TYPES to match the new ARRAY-based JSON structure ---
export type LabelItem = {
  name: string;
  display_url: string | null;
  serial_number: number;
};

export interface SubcategoryDataItem {
    name: string;
    serial_number: number;
    data: {
        serial_number: number;
        labels: LabelItem[];
    };
}

export interface CategoryDataItem {
    name: string;
    serial_number: number;
    subcategories: SubcategoryDataItem[];
}

export type ProductCategoriesStructure = {
  categories: CategoryDataItem[];
};
// --- END NEW/MODIFIED TYPES ---

export const PRODUCT_CATEGORIES_QUERY_KEY = 'productCategoriesStructure';

// --- Function to fetch categories (shared) ---
// No changes needed here, it returns the raw data from the RPC.
export async function fetchCategoriesStructure(): Promise<ProductCategoriesStructure | null> {
  const { data, error } = await supabase.rpc("get_product_categories_structure");

  if (error) {
    console.error("Error fetching product categories structure from RPC:", error);
    toast.error("Failed to load shop categories. Please try again later.");
    return null;
  }

  // The raw data from the RPC call is inside an array, with the object under a key.
  // We need to extract the actual structured data.
  if (Array.isArray(data) && data.length > 0 && data[0] && typeof data[0] === 'object' && 'get_product_categories_structure' in data[0]) {
      const structuredData = (data[0] as any).get_product_categories_structure;
      return structuredData as ProductCategoriesStructure;
  }

  // Fallback for unexpected structures, though the above should handle it.
  if (data === null || typeof data !== 'object' || !('categories' in data)) {
      return null;
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
  });
}