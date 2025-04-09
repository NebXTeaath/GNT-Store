// src/pages/HomePage/FeaturedProductsSection.tsx
import React from "react"; // Removed useEffect, useRef
import { Link } from "react-router-dom"; // Added Link import
import { Button } from "@/components/ui/button";
import { ProductCarousel, ProductCarouselSkeleton } from "./ProductCarousel";
import { useProducts } from "@/pages/productsPage/useProducts";

// Define your Product interface (or import if defined globally)
export interface Product {
  product_id: string;
  primary_image: string | null;
  product_name: string;
  price: number;
  discount_price: number;
  is_bestseller?: boolean;
  label?: string;
  condition?: string;
  average_rating?: number;
  // Add category/subcategory if needed for mapping or display
  category?: string;
  subcategory?: string;
}

// Removed LoadingMoreIndicator component

const FeaturedProductsSection: React.FC = () => {
  // --- Fetch Products using the updated useProducts hook ---
  // React Query handles caching and fetching internally

  const {
    products: consolesProducts,
    isLoading: consolesLoading,
    error: consolesError,
    // Removed: isLoadingMore, hasMore, loadMoreProducts
  } = useProducts({
    category: "Consoles",
    pageSize: 10, // Fetch a reasonable number for the carousel
  });

  const {
    products: computersProducts,
    isLoading: computersLoading,
    error: computersError,
    // Removed: isLoadingMore, hasMore, loadMoreProducts
  } = useProducts({
    category: "Computers",
    pageSize: 10, // Fetch a reasonable number for the carousel
  });

  // --- No IntersectionObserver or manual loading logic needed ---
  // React Query manages the data fetching and caching based on the query key.

  // The mapToProductInterface function might still be useful if the structure
  // returned by useProducts needs adjustment for ProductCarousel, but ideally,
  // useProducts should return the correct Product[] type directly.
  // If useProducts returns the exact Product[] type, you can use the data directly.
  // Assuming useProducts returns Product[] correctly:
  const mappedConsolesProducts = consolesProducts;
  const mappedComputersProducts = computersProducts;

  return (
    <section className="py-12 bg-[#0f1115]">
      <div className="container mx-auto px-4 md:px-6 space-y-12">
        {/* Consoles Section */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Featured In Consoles</h2>
            {/* Link to the full category page */}
             <Button variant="ghost" className="text-gray-300 bg-gray-800 hover:text-white hover:bg-[#4752c4]">
               <Link to="/Consoles">Show All</Link>
             </Button>
          </div>

          {consolesLoading && mappedConsolesProducts.length === 0 ? ( // Show skeleton only on initial load
            <ProductCarouselSkeleton />
          ) : consolesError ? (
            <div className="text-center py-12 bg-[#1a1c23] rounded-lg">
              <h3 className="text-lg font-medium mb-2">Error</h3>
              <p className="text-gray-400">{consolesError}</p>
            </div>
          ) : mappedConsolesProducts.length > 0 ? (
             // Pass the products directly to the carousel
            <ProductCarousel products={mappedConsolesProducts} />
            // Removed loading more indicator and button
          ) : (
            <div className="text-center py-12 bg-[#1a1c23] rounded-lg">
              <h3 className="text-lg font-medium mb-2">No products found</h3>
              <p className="text-gray-400">Try Browse a different category</p>
            </div>
          )}
        </div>

        {/* Computers Section */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Featured In Computers</h2>
             {/* Link to the full category page */}
             <Button variant="ghost" className="text-gray-300 bg-gray-800 hover:text-white hover:bg-[#4752c4]">
               <Link to="/Computers">Show All</Link>
             </Button>
          </div>

          {computersLoading && mappedComputersProducts.length === 0 ? ( // Show skeleton only on initial load
            <ProductCarouselSkeleton />
          ) : computersError ? (
            <div className="text-center py-12 bg-[#1a1c23] rounded-lg">
              <h3 className="text-lg font-medium mb-2">Error</h3>
              <p className="text-gray-400">{computersError}</p>
            </div>
          ) : mappedComputersProducts.length > 0 ? (
            // Pass the products directly to the carousel
            <ProductCarousel products={mappedComputersProducts} />
             // Removed loading more indicator and button
          ) : (
            <div className="text-center py-12 bg-[#1a1c23] rounded-lg">
              <h3 className="text-lg font-medium mb-2">No products found</h3>
              <p className="text-gray-400">Try Browse a different category</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default FeaturedProductsSection;