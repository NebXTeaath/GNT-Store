// src/productPage/useProducts.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Product } from "@/lib/types/product"; // Ensure this path is correct

interface UseProductsParams {
  category?: string | null;
  subcategory?: string | null;
  page?: number;
  pageSize?: number;
  label?: string | null;
  sortBy?: string; // Included in query key even if not used in RPC (for future use)
  condition?: string;
}

// Define the expected structure of the data returned by the RPC functions
// Adjust these based on the actual return types of your Supabase RPCs
interface ProductListData {
  // Assuming get_products_list returns an array of Product objects
  products: Product[];
}

interface ProductCountData {
  // Assuming count_products returns a number
  count: number;
}

export function useProducts({
  category,
  subcategory,
  condition,
  page = 1,
  pageSize = 12,
  label = null,
  sortBy = "featured", // Keep sortBy in params for potential future use
}: UseProductsParams) {
  // --- Query Key ---
  // Unique key based on all parameters that affect the data.
  // React Query uses this to cache and manage data.
  const productsQueryKey = [
    "products",
    { category, subcategory, label, condition, sortBy, page, pageSize },
  ];
  const countQueryKey = [
    "productsCount",
    { category, subcategory, label, condition }, // Count doesn't depend on page, pageSize, or sortBy
  ];

  // --- Query Function for fetching product list ---
  const fetchProductsList = async (): Promise<Product[]> => {
    const { data, error } = await supabase.rpc("get_products_list", {
      page_number: page,
      page_size: pageSize,
      category_filter: category || null,
      subcategory_filter: subcategory || null,
      label_filter: label || null,
      condition_filter: condition || null,
      // Note: sortBy is not passed to RPC currently, but is in query key
    });

    if (error) {
      console.error("Error fetching product list:", error);
      throw new Error("Failed to load products list."); // React Query handles this error
    }
    // Ensure data is returned as Product[] or an empty array
    return (data as Product[]) || [];
  };

  // --- Query Function for fetching total product count ---
  const fetchProductsCount = async (): Promise<number> => {
    const { data, error } = await supabase.rpc("count_products", {
      category_filter: category || null,
      subcategory_filter: subcategory || null,
      label_filter: label || null,
      condition_filter: condition || null,
    });

    if (error) {
      console.error("Error fetching product count:", error);
      throw new Error("Failed to load product count."); // React Query handles this error
    }
    return (data as number) || 0;
  };

  // --- React Query Hooks ---
  const {
    data: productsData,
    isLoading: isLoadingList,
    error: errorList,
    isFetching: isFetchingList, // Indicates background refetching
  } = useQuery<Product[], Error>({
    queryKey: productsQueryKey,
    queryFn: fetchProductsList,
    // keepPreviousData: true, // Optional: Keep showing old data while fetching new page/filter
    staleTime: 5 * 60 * 1000, // Cache data for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep data in cache for 10 minutes even if inactive
  });

  const {
    data: totalProductsData,
    isLoading: isLoadingCount,
    error: errorCount,
    isFetching: isFetchingCount,
  } = useQuery<number, Error>({
    queryKey: countQueryKey,
    queryFn: fetchProductsCount,
    staleTime: 15 * 60 * 1000, // Count changes less often, cache longer (15 min)
    gcTime: 30 * 60 * 1000, // Keep count in cache for 30 minutes
  });

  // --- Derived State ---
  const products = productsData || [];
  const totalProducts = totalProductsData || 0;
  const totalPages = pageSize > 0 ? Math.ceil(totalProducts / pageSize) : 0;

  // Combine loading states: loading is true if either query is initially loading
  const isLoading = (isLoadingList || isLoadingCount) && !productsData && !totalProductsData;

  // Combine fetching states: isFetching indicates any background activity
  const isFetching = isFetchingList || isFetchingCount;

  // Combine errors: prioritize list error, then count error
  const error = errorList
    ? errorList.message
    : errorCount
    ? errorCount.message
    : null;

  // --- Return Value ---
  // Return the data structure expected by components like ProductsPage
  return {
    products,
    totalProducts,
    totalPages,
    isLoading, // True only during initial load of either query
    isFetching, // True during initial load OR background refetch
    error,
    // Removed: isLoadingMore, hasMore, loadMoreProducts, goToPage (handled by page prop change), currentPage
    // Components should rely on 'page' prop change to trigger refetch via query key change
  };
}

// Make sure your Product type is correctly defined, e.g., in @/lib/types/product.ts
// export interface Product {
//   product_id: string;
//   primary_image: string | null;
//   product_name: string;
//   price: number;
//   discount_price: number;
//   is_bestseller?: boolean;
//   label?: string;
//   condition?: string;
//   average_rating?: number;
//   // Add other necessary fields like category, subcategory if needed by grouping logic
//   category?: string;
//   subcategory?: string;
// }