// src/pages/HomePage/GNTStore.tsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom"; // Added useLocation
import { Button } from "@/components/ui/button";
import { useProducts } from "@/pages/productsPage/useProducts";
import { ProductCarousel, ProductCarouselSkeleton } from "./ProductCarousel";
import { HeroCarousel } from "./Youtube/heroCarousel";
import SEO from '@/components/seo/SEO'; // Import SEO component

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
        timeout = setTimeout(() => { setTyping(false); }, 1000);
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
const mapToProductInterface = (apiProducts: any[]): Product[] => {
  if (!apiProducts || !Array.isArray(apiProducts)) {
    console.warn("mapToProductInterface received invalid products array:", apiProducts);
    return [];
  }
  return apiProducts.map(product => {
    const generateFallbackId = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8); return v.toString(16); });
    const productId = product?.product_id || product?.id || generateFallbackId();
    const slug = product?.slug || product?.product_name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || productId;
    return {
      product_id: productId,
      slug: slug,
      primary_image: product?.primary_image || null,
      product_name: product?.product_name || product?.name || "Unknown Product",
      price: typeof product?.price === 'number' ? product?.price : 0,
      discount_price: typeof product?.discount_price === 'number' ? product.discount_price : (typeof product?.price === 'number' ? product.price : 0),
      is_bestseller: Boolean(product?.is_bestseller),
      label: product?.label || undefined,
      condition: product?.condition || "New",
      average_rating: typeof product?.average_rating === 'number' ? product.average_rating : 0
    };
  });
};

// -------------------------- FeaturedProductsCarousel Component --------------------------
const FeaturedProductsCarousel: React.FC = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { products: consolesProducts, isLoading: consolesLoading, error: consolesError } = useProducts({ category: "Consoles", pageSize: 10 });
  const { products: computersProducts, isLoading: computersLoading, error: computersError } = useProducts({ category: "Computers", pageSize: 10 });

  useEffect(() => {
    if (!consolesLoading && !computersLoading) {
      setIsLoading(false);
      if (consolesError) { setError(consolesError); return; }
      if (computersError) { setError(computersError); return; }
      const mappedConsolesProducts = mapToProductInterface(consolesProducts || []);
      const mappedComputersProducts = mapToProductInterface(computersProducts || []);
      const allProducts = [...mappedConsolesProducts, ...mappedComputersProducts];
      const shuffledProducts = [...allProducts];
      for (let i = shuffledProducts.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [shuffledProducts[i], shuffledProducts[j]] = [shuffledProducts[j], shuffledProducts[i]]; }
      setFeaturedProducts(shuffledProducts.slice(0, 20));
    }
  }, [consolesProducts, computersProducts, consolesLoading, computersLoading, consolesError, computersError]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6"> <h2 className="text-xl font-bold text-white">Featured Products</h2> </div>
      {isLoading ? (<ProductCarouselSkeleton />) : error ? ( <div className="text-center py-12 bg-[#1a1c23] rounded-lg"> <h3 className="text-lg font-medium mb-2">Error</h3> <p className="text-gray-400">{error}</p> </div> ) : featuredProducts.length > 0 ? ( <ProductCarousel products={featuredProducts} autoplayDelay={4000} /> ) : ( <div className="text-center py-12 bg-[#1a1c23] rounded-lg"> <h3 className="text-lg font-medium mb-2">No products found</h3> <p className="text-gray-400">Try browsing specific categories</p> </div> )}
    </div>
  );
};

// -------------------------- FeaturedProductsSection Component --------------------------
const FeaturedProductsSection: React.FC = () => {
  const { products: consolesProductsRaw, isLoading: consolesLoading, error: consolesError } = useProducts({ category: "Consoles", pageSize: 10 });
  const { products: computersProductsRaw, isLoading: computersLoading, error: computersError } = useProducts({ category: "Computers", pageSize: 10 });
  const consolesProducts = mapToProductInterface(consolesProductsRaw || []);
  const computersProducts = mapToProductInterface(computersProductsRaw || []);

  return (
    <section className="py-12 bg-[#0f1115]">
      <div className="container mx-auto px-4 md:px-6 space-y-12">
        {/* Featured in Consoles Carousel */}
        <div>
          <div className="flex justify-between items-center mb-6"> <h2 className="text-xl font-bold text-white">Featured In Consoles</h2> <Button variant="ghost" className="text-gray-300 bg-gray-800 hover:text-white hover:bg-[#4752c4]"> <Link to="/Consoles">Show All</Link> </Button> </div>
          {consolesLoading ? (<ProductCarouselSkeleton />) : consolesError ? ( <div className="text-center py-12 bg-[#1a1c23] rounded-lg"> <h3 className="text-lg font-medium mb-2">Error</h3> <p className="text-gray-400">{consolesError}</p> </div> ) : consolesProducts.length > 0 ? ( <ProductCarousel products={consolesProducts} /> ) : ( <div className="text-center py-12 bg-[#1a1c23] rounded-lg"> <h3 className="text-lg font-medium mb-2">No products found</h3> <p className="text-gray-400">Try browsing a different category</p> </div> )}
        </div>
        {/* Repair Request Section */}
        <RepairServiceSection />
        {/* Featured in Computers Carousel */}
        <div>
          <div className="flex justify-between items-center mb-6"> <h2 className="text-xl font-bold text-white">Featured In Computers</h2> <Button variant="ghost" className="text-gray-300 bg-gray-800 hover:text-white hover:bg-[#4752c4]"> <Link to="/Computers">Show All</Link> </Button> </div>
          {computersLoading ? (<ProductCarouselSkeleton />) : computersError ? ( <div className="text-center py-12 bg-[#1a1c23] rounded-lg"> <h3 className="text-lg font-medium mb-2">Error</h3> <p className="text-gray-400">{computersError}</p> </div> ) : computersProducts.length > 0 ? ( <ProductCarousel products={computersProducts} /> ) : ( <div className="text-center py-12 bg-[#1a1c23] rounded-lg"> <h3 className="text-lg font-medium mb-2">No products found</h3> <p className="text-gray-400">Try browsing a different category</p> </div> )}
        </div>
      </div>
    </section>
  );
};

// -------------------------- RepairServiceSection Component --------------------------
function RepairServiceSection() {
  const navigate = useNavigate();
  return (
    <section className="w-full py-12 bg-[#1a1c23]">
      <div className="container mx-auto px-4 md:px-6">
        <div onClick={() => navigate("/repair-home")} data-href={"/repair-home"} className="cursor-pointer border border-[#2a2d36] rounded-lg p-6 flex flex-col md:flex-row gap-8 items-center hover:shadow-lg transition-shadow duration-300">
          <div className="flex-1">
            <div className="inline-block bg-[#5865f2] px-3 py-1 text-sm text-white rounded mb-4"> Submit Repair Request </div>
            <h2 className="text-3xl font-bold mb-2 text-white"> Need Repair? Request Service Now! </h2>
            <p className="text-gray-300 mb-4"> Our repair service supports a wide range of devices including </p>
            <div className="text-4xl md:text-5xl font-bold"> <AnimatedRepairPreview /> </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// -------------------------- GNTStore Homepage Component --------------------------
const GNTStore: React.FC = () => {
  const location = useLocation(); // Get location for canonical URL
  const siteUrl = window.location.origin; // Get base URL
  const canonicalUrl = `${siteUrl}${location.pathname}`; // Homepage canonical

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[#0f1115]">
      <SEO
            title="GNT – Next-Gen Console & PC Marketplace | Home"
            description="Explore the future of gaming tech with GNT – Your go-to marketplace for consoles, computers, and expert repair services. Find featured products and learn about our repair process."
            canonicalUrl={canonicalUrl} // Use homepage canonical URL
            ogData={{ // OG data specific to homepage
                title: "GNT – Next-Gen Console & PC Marketplace | Home",
                description: "Your go-to marketplace for consoles, computers, and expert repair services.",
                type: "website",
                image: `${siteUrl}/favicon/og-image.png`, // Ensure you have an og-image.png
                url: canonicalUrl
            }}
        />
      <main>
        <HeroCarousel />
        <section className="py-12 bg-[#0f1115]">
          <div className="container mx-auto px-4 md:px-6"> <FeaturedProductsCarousel /> </div>
        </section>
        <RepairServiceSection />
        <FeaturedProductsSection />
      </main>
    </div>
  );
};

export default GNTStore;