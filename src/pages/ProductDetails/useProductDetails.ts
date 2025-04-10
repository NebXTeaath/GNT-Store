// src/pages/ProductDetails/useProductDetails.tsx
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// Interfaces should match the structure returned by the get_product_details_with_slug RPC
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
  subcategory: string;
  slug: string; // Added slug field
  is_featured?: boolean;
  is_bestseller?: boolean;
}

export interface ProductDetailsData {
  o_product_id: string;
  o_product_name: string;
  o_product_description: string;
  o_price: string;
  o_discount_price: string;
  o_images: ProductImage[][];
  o_is_featured: boolean;
  o_is_bestseller: boolean;
  o_category_name: string;
  o_subcategory_name: string;
  o_label: string;
  o_condition: string;
  o_slug: string; // Added slug field
  o_similar_products: SimilarProduct[];
}

// Function to fetch product details using product slug
const fetchProductDetailsBySlug = async (
  slug: string | undefined
): Promise<ProductDetailsData | null> => {
  if (!slug) {
    return null;
  }

  console.log("Attempting to fetch product with slug:", slug);
  
  try {
    // First check if the product exists in either table
    const consoleProductCheck = await supabase
      .from('console_products')
      .select('product_id')
      .eq('slug', slug)
      .maybeSingle();
      
    const computerProductCheck = await supabase
      .from('computer_products')
      .select('product_id')
      .eq('slug', slug)
      .maybeSingle();
      
    // If no product found with this slug, return null
    if (!consoleProductCheck.data && !computerProductCheck.data) {
      console.log("No product found with slug:", slug);
      return null;
    }
    
    // If we get here, we know a product with this slug exists
    const { data, error } = await supabase.rpc("get_product_details_with_slug", {
      p_target_slug: slug,
    });

    if (error) {
      console.error("Error fetching product details:", error);
      throw new Error(error.message || "Failed to fetch product details.");
    }
    
    console.log("Product data returned:", data);
    
    if (data && data.length > 0) {
      return data[0] as ProductDetailsData;
    }
    
    return null;
  } catch (error) {
    console.error("Error in fetchProductDetailsBySlug:", error);
    throw error;
  }
};

// Legacy function to fetch by product ID - keep for backward compatibility
const fetchProductDetailsById = async (
  productId: string | undefined
): Promise<ProductDetailsData | null> => {
  if (!productId) {
    return null;
  }

  const { data, error } = await supabase.rpc("get_product_details", {
    p_target_product_id: productId,
  });

  if (error) {
    console.error("Error fetching product details:", error);
    throw new Error(error.message || "Failed to fetch product details.");
  }
  
  if (data && data.length > 0) {
    return data[0] as ProductDetailsData;
  }
  
  return null;
};

// New hook for fetching product details by slug
export function useProductDetailsBySlug(slug: string | undefined) {
  const queryKey = ["productDetailsBySlug", slug];
  
  const {
    data: productData,
    isLoading,
    error,
    isFetching,
    isError,
  } = useQuery<ProductDetailsData | null, Error>({
    queryKey: queryKey,
    queryFn: () => fetchProductDetailsBySlug(slug),
    enabled: !!slug,
    staleTime: 10 * 60 * 1000, // Cache product details for 10 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });

  return {
    productData,
    isLoading: isLoading && !!slug,
    isFetching,
    error: error?.message || null,
    isError,
  };
}

// Legacy hook for backward compatibility - keep during transition
export function useProductDetails(productId: string | undefined) {
  const queryKey = ["productDetails", productId];
  
  const {
    data: productData,
    isLoading,
    error,
    isFetching,
    isError,
  } = useQuery<ProductDetailsData | null, Error>({
    queryKey: queryKey,
    queryFn: () => fetchProductDetailsById(productId),
    enabled: !!productId,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return {
    productData,
    isLoading: isLoading && !!productId,
    isFetching,
    error: error?.message || null,
    isError,
  };
}