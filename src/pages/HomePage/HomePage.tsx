// src/pages/HomePage/HomePage.tsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useProducts } from "@/components/global/productsPage/useProducts";
import { ProductCarousel, ProductCarouselSkeleton } from "../../components/pages/HomePage/ProductCarousel";
import { HeroCarousel } from "../../components/pages/HomePage/Youtube/heroCarousel";
import SEO from '@/components/seo/SEO';
import HomeTestimonialSection from "@/components/global/Testimonials/TestimonialSection";
import { useProductCategories } from "@/components/global/hooks/useProductCategories";
import { Skeleton } from "@/components/ui/skeleton";

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
  review_count?: number;
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
      average_rating: typeof product?.average_rating === 'number' ? product.average_rating : 0,
      review_count: typeof product?.review_count === 'number' ? product.review_count : 0
    };
  });
};

// -------------------------- SubcategoryCarousel Component (Helper) --------------------------
const SubcategoryCarousel: React.FC<{ category: string; subcategory: string }> = ({ category, subcategory }) => {
    const { products, isLoading, error } = useProducts({
        category: category,
        subcategory: subcategory,
        pageSize: 10, // Fetch up to 10 products for the carousel
    });

    const mappedProducts = mapToProductInterface(products || []);
    const linkToShowAll = `/${category}/${subcategory}`;

    // Don't render anything if there are no products and it's not loading
    if (!isLoading && mappedProducts.length === 0) {
        return null;
    }

    return (
        <div key={`${category}-${subcategory}`}>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Featured In {subcategory}</h2>
                <Button asChild variant="ghost" className="text-gray-300 bg-gray-800 hover:text-white hover:bg-[#4752c4]">
                    <Link to={linkToShowAll}>Show All</Link>
                </Button>
            </div>
            {isLoading ? (
                <ProductCarouselSkeleton />
            ) : error ? (
                <div className="text-center py-12 bg-[#1a1c23] rounded-lg">
                    <h3 className="text-lg font-medium mb-2">Error</h3>
                    <p className="text-gray-400">{error}</p>
                </div>
            ) : (
                <ProductCarousel products={mappedProducts} autoplayDelay={4000} />
            )}
        </div>
    );
};


// -------------------------- Dynamic Featured Products Section --------------------------
const DynamicFeaturedSection: React.FC = () => {
    const { data: productCategories, isLoading: categoriesLoading, isError: categoriesError } = useProductCategories();

    if (categoriesLoading) {
        return (
            <section className="py-12 bg-[#0f1115]">
                <div className="container mx-auto px-4 md:px-6 space-y-12">
                    {[...Array(3)].map((_, i) => (
                        <div key={i}>
                            <div className="flex justify-between items-center mb-6">
                                <Skeleton className="h-7 w-48 bg-[#2a2d36]" />
                                <Skeleton className="h-9 w-24 bg-[#2a2d36]" />
                            </div>
                            <ProductCarouselSkeleton />
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    if (categoriesError || !productCategories || !productCategories.categories) {
        return (
            <section className="py-12 bg-[#0f1115]">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="text-center text-red-400">Could not load featured product sections.</div>
                </div>
            </section>
        );
    }

    // MODIFICATION: Flatten all subcategories from the new array-based structure
    const allSubcategories = productCategories.categories.flatMap(categoryItem =>
        categoryItem.subcategories.map(subcategoryItem => ({
            category: categoryItem.name,
            subcategory: subcategoryItem.name
        }))
    );

    return (
        <section className="py-12 bg-[#0f1115]">
            <div className="container mx-auto px-4 md:px-6 space-y-12">
                {allSubcategories.map(({ category, subcategory }) => (
                    <SubcategoryCarousel key={`${category}-${subcategory}`} category={category} subcategory={subcategory} />
                ))}
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

// -------------------------- GNTStore Homepage Component (Main) --------------------------
const GNTStore: React.FC = () => {
  const location = useLocation();
  const siteUrl = window.location.origin;
  const canonicalUrl = `${siteUrl}${location.pathname}`;

  useEffect(() => {
    if (!location.hash) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [location.pathname]);

  useEffect(() => {
    if (location.hash === '#testimonials') {
      const timer = setTimeout(() => {
        const element = document.getElementById('testimonials');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [location.hash]);

  return (
    <div className="flex min-h-screen flex-col bg-[#0f1115]">
      <SEO
            title="GNT – Next-Gen Console & PC Marketplace | Home"
            description="Explore the future of gaming tech with GNT – Your go-to marketplace for consoles, computers, and expert repair services. Find featured products and learn about our repair process."
            canonicalUrl={canonicalUrl}
            ogData={{
                title: "GNT – Next-Gen Console & PC Marketplace | Home",
                description: "Your go-to marketplace for consoles, computers, and expert repair services.",
                type: "website",
                image: `${siteUrl}/favicon/og-image.png`,
                url: canonicalUrl
            }}
        />
      <main>
        <HeroCarousel />
        <HomeTestimonialSection />
        <DynamicFeaturedSection />
        <RepairServiceSection />
      </main>
    </div>
  );
};

export default GNTStore;