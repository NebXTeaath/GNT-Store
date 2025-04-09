// src/pages/ProductDetails/useProductDetails
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// Interfaces should match the structure returned by the get_product_details RPC
// Define these based on your actual RPC output or import from a types file
interface ProductImage {
  url: string;
  is_primary?: boolean;
  display_order?: number;
}

interface SimilarProduct {
  product_id: string;
  product_name: string;
  primary_image: string;
  price: number;
  discount_price: number;
  label?: string;
  condition?: string;
  category_name: string;
  subcategory: string; // Assuming this is subcategory name
  is_featured?: boolean; // Optional based on RPC output
  is_bestseller?: boolean; // Optional based on RPC output
}

export interface ProductDetailsData {
  o_product_id: string;
  o_product_name: string;
  o_product_description: string;
  o_price: string; // Keep as string if RPC returns string
  o_discount_price: string; // Keep as string if RPC returns string
  o_images: ProductImage[][]; // Adjust nesting if needed
  o_is_featured: boolean;
  o_is_bestseller: boolean;
  o_category_name: string;
  o_subcategory_name: string;
  o_label: string;
  o_condition: string;
  o_similar_products: SimilarProduct[];
}

const fetchProductDetails = async (
  productId: string | undefined,
): Promise<ProductDetailsData | null> => {
  if (!productId) {
    // Don't attempt to fetch if productId is missing
    return null;
  }

  const { data, error } = await supabase.rpc("get_product_details", {
    p_target_product_id: productId,
  });

  if (error) {
    console.error("Error fetching product details:", error);
    throw new Error(error.message || "Failed to fetch product details.");
  }

  // Assuming the RPC returns an array, take the first element
  if (data && data.length > 0) {
    return data[0] as ProductDetailsData;
  }

  // If no data is returned, treat it as not found
  return null;
};

export function useProductDetails(productId: string | undefined) {
  const queryKey = ["productDetails", productId];

  const {
    data: productData,
    isLoading,
    error,
    isFetching, // Indicates background refetches
    isError,    // Boolean flag for error state
  } = useQuery<ProductDetailsData | null, Error>({
    queryKey: queryKey,
    queryFn: () => fetchProductDetails(productId),
    enabled: !!productId, // Only run the query if productId is available
    staleTime: 10 * 60 * 1000, // Cache product details for 10 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    // You might want refetchOnWindowFocus: false for details pages
    // refetchOnWindowFocus: false,
  });

  return {
    productData, // This will be ProductDetailsData | null | undefined
    isLoading: isLoading && !!productId, // Only indicate loading if we are actually enabled and fetching
    isFetching,
    error: error?.message || null, // Return error message string or null
    isError,
  };
}