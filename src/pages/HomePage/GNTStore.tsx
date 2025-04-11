// src/pages/HomePage/GNTStore.tsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useProducts } from "@/pages/productsPage/useProducts";
import { ProductCarousel, ProductCarouselSkeleton } from "./ProductCarousel";
import { HeroCarousel } from "./Youtube/heroCarousel";

// Create a shared Product interface
export interface Product {
  product_id: string;
  slug: string;
  primary_image: string | null;
  product_name: string;
  price: number;
  discount_price: number;
  is_bestseller: boolean;
  label?: string;
  condition: string;
  average_rating: number;
}

// -------------------------- AnimatedRepairPreview Component --------------------------
// Simulates typing and deletion of repair-related keywords.
function AnimatedRepairPreview() {
  const keywords = ["console", "laptop", "PC", "smartphone", "tablet"];
  const [displayText, setDisplayText] = useState("");
  const [currentKeywordIndex, setCurrentKeywordIndex] = useState(0);
  const [typing, setTyping] = useState(true);
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (typing) {
      if (charIndex < keywords[currentKeywordIndex].length) {
        timeout = setTimeout(() => {
          setDisplayText(
            keywords[currentKeywordIndex].substring(0, charIndex + 1)
          );
          setCharIndex(charIndex + 1);
        }, 150);
      } else {
        // Pause at full word before deleting.
        timeout = setTimeout(() => {
          setTyping(false);
        }, 1000);
      }
    } else {
      if (charIndex > 0) {
        timeout = setTimeout(() => {
          setDisplayText(
            keywords[currentKeywordIndex].substring(0, charIndex - 1)
          );
          setCharIndex(charIndex - 1);
        }, 100);
      } else {
        // Move to the next keyword.
        setTyping(true);
        setCurrentKeywordIndex((prev) => (prev + 1) % keywords.length);
      }
    }
    return () => clearTimeout(timeout);
  }, [charIndex, typing, currentKeywordIndex, keywords]);

  return (
    <span className="font-mono text-white">
      {displayText}
      <span className="ml-1 animate-blink">|</span>
    </span>
  );
}

// -------------------------- SHARED UTILITY FUNCTION --------------------------
// Function to map products from API to Product interface - defined once and reused
const mapToProductInterface = (apiProducts: any[]): Product[] => {
  // Guard against null/undefined apiProducts array
  if (!apiProducts || !Array.isArray(apiProducts)) {
    console.warn("mapToProductInterface received invalid products array:", apiProducts);
    return [];
  }
  
  return apiProducts.map(product => {
    // Generate a valid UUID-like string for missing IDs
    const generateFallbackId = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };
    
    // Check for product_id first, then id, then generate fallback
    const productId = product?.product_id || product?.id || generateFallbackId();
    
    // Generate a slug if not provided
    const slug = product?.slug || product?.product_name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || productId;
    
    // Create a safe product object with proper ID handling
    return {
      product_id: productId,
      slug: slug,
      primary_image: product?.primary_image || null,
      product_name: product?.product_name || product?.name || "Unknown Product",
      price: typeof product?.price === 'number' ? product?.price : 0,
      discount_price: typeof product?.discount_price === 'number' ? 
                      product.discount_price : 
                      (typeof product?.price === 'number' ? product.price : 0),
      is_bestseller: Boolean(product?.is_bestseller),
      label: product?.label || undefined,
      condition: product?.condition || "New",
      average_rating: typeof product?.average_rating === 'number' ? product.average_rating : 0
    };
  });
};

// -------------------------- FeaturedProductsCarousel Component --------------------------
// Combines and randomizes products from multiple categories
const FeaturedProductsCarousel: React.FC = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch products from Consoles category
  const {
    products: consolesProducts,
    isLoading: consolesLoading,
    error: consolesError,
  } = useProducts({ category: "Consoles", pageSize: 10 });

  // Fetch products from Computers category
  const {
    products: computersProducts,
    isLoading: computersLoading,
    error: computersError,
  } = useProducts({ category: "Computers", pageSize: 10 });

  // Combine and randomize products when data is available
  useEffect(() => {
    // Only process when both product sets are loaded
    if (!consolesLoading && !computersLoading) {
      setIsLoading(false);

      // Handle potential errors
      if (consolesError) {
        setError(consolesError);
        return;
      }
      if (computersError) {
        setError(computersError);
        return;
      }

      // Transform the products to match the Product interface
      const mappedConsolesProducts = mapToProductInterface(consolesProducts || []);
      const mappedComputersProducts = mapToProductInterface(computersProducts || []);

      // Combine products from both categories
      const allProducts = [...mappedConsolesProducts, ...mappedComputersProducts];

      // Randomize the order using Fisher-Yates shuffle algorithm
      const shuffledProducts = [...allProducts];
      for (let i = shuffledProducts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledProducts[i], shuffledProducts[j]] = [shuffledProducts[j], shuffledProducts[i]];
      }

      // Take the first 20 products (or fewer if not enough products)
      setFeaturedProducts(shuffledProducts.slice(0, 20));
    }
  }, [consolesProducts, computersProducts, consolesLoading, computersLoading, consolesError, computersError]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">Featured Products</h2>
      </div>
      
      {isLoading ? (
        <ProductCarouselSkeleton />
      ) : error ? (
        <div className="text-center py-12 bg-[#1a1c23] rounded-lg">
          <h3 className="text-lg font-medium mb-2">Error</h3>
          <p className="text-gray-400">{error}</p>
        </div>
      ) : featuredProducts.length > 0 ? (
        <ProductCarousel products={featuredProducts} autoplayDelay={4000} />
      ) : (
        <div className="text-center py-12 bg-[#1a1c23] rounded-lg">
          <h3 className="text-lg font-medium mb-2">No products found</h3>
          <p className="text-gray-400">Try browsing specific categories</p>
        </div>
      )}
    </div>
  );
};

// -------------------------- FeaturedProductsSection Component --------------------------
// Displays two product carousels: one for Consoles and one for Computers.
const FeaturedProductsSection: React.FC = () => {
  const {
    products: consolesProductsRaw,
    isLoading: consolesLoading,
    error: consolesError,
  } = useProducts({ category: "Consoles", pageSize: 10 });
  
  const {
    products: computersProductsRaw,
    isLoading: computersLoading,
    error: computersError,
  } = useProducts({ category: "Computers", pageSize: 10 });
  
  // Transform products to match the required interface using the shared utility function
  const consolesProducts = mapToProductInterface(consolesProductsRaw || []);
  const computersProducts = mapToProductInterface(computersProductsRaw || []);

  return (
    <section className="py-12 bg-[#0f1115]">
      <div className="container mx-auto px-4 md:px-6 space-y-12">
        {/* Featured in Consoles Carousel */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Featured In Consoles</h2>
            <Button variant="ghost" className="text-gray-300 bg-gray-800 hover:text-white hover:bg-[#4752c4]">
              <Link to="/Consoles">Show All</Link>
            </Button>
          </div>
          {consolesLoading ? (
            <ProductCarouselSkeleton />
          ) : consolesError ? (
            <div className="text-center py-12 bg-[#1a1c23] rounded-lg">
              <h3 className="text-lg font-medium mb-2">Error</h3>
              <p className="text-gray-400">{consolesError}</p>
            </div>
          ) : consolesProducts.length > 0 ? (
            <ProductCarousel products={consolesProducts} />
          ) : (
            <div className="text-center py-12 bg-[#1a1c23] rounded-lg">
              <h3 className="text-lg font-medium mb-2">No products found</h3>
              <p className="text-gray-400">Try browsing a different category</p>
            </div>
          )}
        </div>

        {/* Repair Request Section */}
        <RepairServiceSection />

        {/* Featured in Computers Carousel */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Featured In Computers</h2>
            <Button variant="ghost" className="text-gray-300 bg-gray-800 hover:text-white hover:bg-[#4752c4]">
              <Link to="/Computers">Show All</Link>
            </Button>
          </div>
          {computersLoading ? (
            <ProductCarouselSkeleton />
          ) : computersError ? (
            <div className="text-center py-12 bg-[#1a1c23] rounded-lg">
              <h3 className="text-lg font-medium mb-2">Error</h3>
              <p className="text-gray-400">{computersError}</p>
            </div>
          ) : computersProducts.length > 0 ? (
            <ProductCarousel products={computersProducts} />
          ) : (
            <div className="text-center py-12 bg-[#1a1c23] rounded-lg">
              <h3 className="text-lg font-medium mb-2">No products found</h3>
              <p className="text-gray-400">Try browsing a different category</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

// -------------------------- RepairServiceSection Component --------------------------
// Displays an animated repair preview with large, bold text.
// Tapping anywhere on this section navigates to the repair index page.
function RepairServiceSection() {
  const navigate = useNavigate();
  return (
    <section className="w-full py-12 bg-[#1a1c23]">
      <div className="container mx-auto px-4 md:px-6">
        <div
          onClick={() => navigate("/repair-home")}
          data-href={"/repair-home"}
          className="cursor-pointer border border-[#2a2d36] rounded-lg p-6 flex flex-col md:flex-row gap-8 items-center hover:shadow-lg transition-shadow duration-300"
        >
          <div className="flex-1">
            <div className="inline-block bg-[#5865f2] px-3 py-1 text-sm text-white rounded mb-4">
              Submit Repair Request
            </div>
            <h2 className="text-3xl font-bold mb-2 text-white">
              Need Repair? Request Service Now!
            </h2>
            <p className="text-gray-300 mb-4">
              Our repair service supports a wide range of devices including
            </p>
            <div className="text-4xl md:text-5xl font-bold">
              <AnimatedRepairPreview />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// -------------------------- GNTStore Homepage Component --------------------------
// Combines all sections into the main homepage layout.
const GNTStore: React.FC = () => {

  // ----- Scroll to Top on Mount -----
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Set the document title when the component mounts.
  useEffect(() => {
    document.title = "GNT Store | Home";
  }, []);
  
  return (
    <div className="flex min-h-screen flex-col bg-[#0f1115]">
      <main>
        {/* Use the HeroCarousel component as the hero section */}
        <HeroCarousel />
        
        {/* Featured Products Carousel - placed right after HeroCarousel */}
        <section className="py-12 bg-[#0f1115]">
          <div className="container mx-auto px-4 md:px-6">
            <FeaturedProductsCarousel />
          </div>
        </section>
        
        {/* Repair Service Banner */}
        <RepairServiceSection />
        
        {/* Original FeaturedProductsSection with Consoles and Computers */}
        <FeaturedProductsSection />
      </main>
    </div>
  );
};

export default GNTStore;