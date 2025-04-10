// src/pages/ProductDetails/ProductDetails.tsx
import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselApi, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Minus, Plus, Heart, ShoppingBag } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import ReactMarkdown from "react-markdown";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { toast } from "sonner";
import { ProductImageSkeleton } from "./skeletons/ProductImageSkeleton";
import { ProductDetailsSkeleton } from "./skeletons/ProductDetailsSkeleton";
import { SimilarProductsSkeleton } from "./skeletons/SimilarProductsSkeleton";
import { motion, Variants } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import LoginModal from "@/pages/Login/LoginModal";
import DescriptionModal from "./DescriptionModal";
import { formatCurrencyWithSeparator } from "@/lib/currencyFormat";
// Updated imports to include the new hook
import { useProductDetails, useProductDetailsBySlug } from "@/pages/ProductDetails/useProductDetails";

// --- Animation variants ---
const fadeIn: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

// --- Interfaces ---
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

// --- Helper functions ---
const capitalize = (s: string = "") => s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
const truncate = (text: string = "", maxLength: number = 20) => text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
const calculateDiscountPercentage = (originalPrice: number, discountPrice: number): number => {
  if (!originalPrice || originalPrice <= 0 || discountPrice < 0) return 0;
  return Math.round(((originalPrice - discountPrice) / originalPrice) * 100);
};

/** 
 * DynamicBreadcrumb Component - Updated to support both ID and slug-based routes
 */
export function DynamicBreadcrumb() {
  const { id, slug } = useParams<{ id: string, slug: string }>();
  
  // Use the appropriate hook based on whether we have a slug or id
  const { 
    productData, 
    isLoading, 
    error 
  } = slug ? useProductDetailsBySlug(slug) : useProductDetails(id);

  useEffect(() => {
    if (productData) {
      document.title = `[GNT] ${productData.o_product_name}`;
    } else if (isLoading) {
      document.title = "[GNT] Loading Product...";
    } else if (error) {
      document.title = "[GNT] Product Error";
    } else {
      document.title = "[GNT] Product Not Found";
    }
    return () => {
      document.title = "GNT";
    };
  }, [productData, isLoading, error]);

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    ...(productData ? [
      { label: truncate(productData.o_category_name), href: `/${productData.o_category_name}`},
      { label: truncate(productData.o_subcategory_name), href: `/${productData.o_category_name}/${productData.o_subcategory_name}`},
      { label: truncate(productData.o_label), href: `/${productData.o_category_name}/${productData.o_subcategory_name}?label=${encodeURIComponent(productData.o_label)}`},
      { label: truncate(productData.o_product_name, 30), href: null },
    ] : []),
  ];

  if (isLoading && !productData) {
    return (
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem><Skeleton className="h-5 w-12" /></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><Skeleton className="h-5 w-20" /></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><Skeleton className="h-5 w-16" /></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          return (
            <React.Fragment key={`${item.label}-${index}`}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {isLast || !item.href ? (
                  <BreadcrumbPage className="text-white">{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={item.href} className="hover:text-[#5865f2] transition-colors">{item.label}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export default function ProductDetailsPage() {
  // Get both ID and slug from URL params
  const { id, slug } = useParams<{ id: string, slug: string }>();
  const navigate = useNavigate();
  
  // Cart and wishlist hooks
  const { addToCart, updateQuantity, cartItems, isLoading: cartLoading } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist, isAuthenticated } = useWishlist();
  
  // Use the appropriate hook based on whether we have a slug or id
  const { 
    productData, 
    isLoading, 
    error, 
    isFetching 
  } = slug ? useProductDetailsBySlug(slug) : useProductDetails(id);

  const [quantity, setQuantity] = useState<number | null>(null);
  const [isNameExpanded, setIsNameExpanded] = useState(false);
  const [api, setApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const addToCartSectionRef = useRef<HTMLDivElement>(null);
  const [showMobileFooter, setShowMobileFooter] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [descriptionModalOpen, setDescriptionModalOpen] = useState(false);

  // --- Effects ---
  useEffect(() => {
    setQuantity(null);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [id, slug]);

  useEffect(() => {
    if (productData) {
      const existingCartItem = cartItems.find(item => item.id === productData.o_product_id);
      setQuantity(existingCartItem ? existingCartItem.quantity : 1);
      
      // Redirect to slug-based URL if we're on an ID-based URL and have slug data
      if (id && productData.o_slug && !slug) {
        navigate(`/product/details/${productData.o_slug}`, { replace: true });
      }
    } else {
      setQuantity(null);
    }
  }, [cartItems, productData, id, slug, navigate]);

  // Effect for Carousel API to update slide index state
  useEffect(() => {
    if (!api) {
      return;
    }
    setCurrentSlide(api.selectedScrollSnap());
    
    api.on("select", () => {
      setCurrentSlide(api.selectedScrollSnap());
    });
  }, [api]);

  // --- Handlers ---
  const toggleNameExpansion = () => setIsNameExpanded(prev => !prev);
  
  const openDescriptionModal = () => {
    setDescriptionModalOpen(true);
  };

  const decreaseQuantity = () => {
    if (quantity !== null && quantity > 1) {
      const newQty = quantity - 1;
      setQuantity(newQty);
      if (productData && cartItems.find(item => item.id === productData.o_product_id)) {
        updateQuantity(productData.o_product_id, newQty);
      }
    }
  };

  const increaseQuantity = () => {
    if (quantity !== null && quantity < 99) {
      const newQty = quantity + 1;
      setQuantity(newQty);
      if (productData && cartItems.find(item => item.id === productData.o_product_id)) {
        updateQuantity(productData.o_product_id, newQty);
      }
    } else if (quantity !== null) {
      toast.error("Maximum quantity is 99", { id: "max-quantity-toast" });
    }
  };

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      setLoginModalOpen(true);
      return;
    }
    if (productData && quantity !== null && quantity > 0) {
      if (cartItems.length >= 20 && !cartItems.find(item => item.id === productData.o_product_id)) {
        toast.error("Cart is full! Maximum 20 items allowed.", { id: "cart-full-toast" });
        return;
      }
      addToCart({
        id: productData.o_product_id,
        title: productData.o_product_name,
        price: parseFloat(productData.o_price),
        discount_price: parseFloat(productData.o_discount_price),
        image: productData.o_images?.[0]?.[0]?.url || ""
      }, quantity);
    } else {
      console.warn("Add to cart called without product data or valid quantity.");
      toast.error("Could not add item to cart.", { id: "add-cart-error" });
    }
  };

  const handleToggleWishlist = () => {
    if (!isAuthenticated) {
      setLoginModalOpen(true);
      return;
    }
    if (productData) {
      const isAlreadyInWishlist = isInWishlist(productData.o_product_id);
      if (isAlreadyInWishlist) {
        removeFromWishlist(productData.o_product_id);
      } else {
        addToWishlist({
          id: productData.o_product_id,
          title: productData.o_product_name,
          price: parseFloat(productData.o_price),
          discount_price: parseFloat(productData.o_discount_price),
          image: productData.o_images?.[0]?.[0]?.url || ""
        });
      }
    }
  };

  // Mobile footer visibility logic
  const checkMobileFooterVisibility = useCallback(() => {
    if (window.innerWidth >= 768) {
      setShowMobileFooter(false);
      return;
    }
    if (!mainContentRef.current || !addToCartSectionRef.current) return;
    const windowHeight = window.innerHeight;
    const addToCartRect = addToCartSectionRef.current.getBoundingClientRect();
    const shouldShowFooter = addToCartRect.bottom < 0 || addToCartRect.top > windowHeight;
    setShowMobileFooter(shouldShowFooter);
  }, []);

  useEffect(() => {
    let ticking = false;
    const throttledCheck = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          checkMobileFooterVisibility();
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", throttledCheck, { passive: true });
    window.addEventListener("resize", throttledCheck);
    throttledCheck();
    return () => {
      window.removeEventListener("scroll", throttledCheck);
      window.removeEventListener("resize", throttledCheck);
    };
  }, [checkMobileFooterVisibility]);

  useLayoutEffect(() => {
    const timer = setTimeout(() => {
      checkMobileFooterVisibility();
    }, 200);
    return () => clearTimeout(timer);
  }, [checkMobileFooterVisibility, productData]);

  // --- RENDER LOGIC ---
  // Loading State
  if (isLoading && !productData) {
    return (
      <div className="min-h-screen bg-[#0f1115] text-white font-sans overflow-x-hidden relative">
        <main ref={mainContentRef} className="container mx-auto px-4 py-4 max-w-7xl">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <DynamicBreadcrumb />
          </motion.div>
          <div className="grid lg:grid-cols-2 gap-x-8 xl:gap-x-16 gap-y-8">
            <motion.div initial="hidden" animate="visible" variants={fadeIn}>
              <ProductImageSkeleton />
            </motion.div>
            <motion.div initial="hidden" animate="visible" variants={fadeIn} transition={{ delay: 0.1 }}>
              <ProductDetailsSkeleton />
            </motion.div>
          </div>
          <motion.div initial="hidden" animate="visible" variants={fadeIn} transition={{ delay: 0.2 }} className="mt-16">
            <SimilarProductsSkeleton />
          </motion.div>
        </main>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen bg-[#0f1115] text-white font-sans overflow-x-hidden flex flex-col items-center justify-center p-4">
        <motion.div initial="hidden" animate="visible" variants={fadeIn}>
          <div className="container mx-auto px-4 py-4 max-w-7xl self-start">
            <DynamicBreadcrumb />
          </div>
          <div className="text-center mt-8">
            <h2 className="text-2xl font-bold mb-4">Error</h2>
            <p className="text-lg text-gray-300 mb-6">{error}</p>
            <Button onClick={() => navigate("/")} className="bg-[#5865f2] hover:bg-[#4752c4]">Go Home</Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Not Found State (Loading finished, but no data)
  if (!isLoading && !productData) {
    return (
      <div className="min-h-screen bg-[#0f1115] text-white font-sans overflow-x-hidden flex flex-col items-center justify-center p-4">
        <motion.div initial="hidden" animate="visible" variants={fadeIn}>
          <div className="container mx-auto px-4 py-4 max-w-7xl self-start">
            <DynamicBreadcrumb />
          </div>
          <div className="text-center mt-8">
            <h2 className="text-2xl font-bold mb-4">Product Not Found</h2>
            <p className="text-lg text-gray-300 mb-6">The product you are looking for does not exist or could not be loaded.</p>
            <Button onClick={() => navigate("/")} className="bg-[#5865f2] hover:bg-[#4752c4]">Go Home</Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // --- Render Product Details ---
  if (productData) {
    const images = productData.o_images?.[0]?.map(img => img.url) ?? ["/placeholder.svg"];
    const price = parseFloat(productData.o_price);
    const discountPrice = parseFloat(productData.o_discount_price);
    const isProductInWishlist = isInWishlist(productData.o_product_id);
    const description = productData.o_product_description || "";

    return (
      <div className="min-h-screen bg-[#0f1115] text-white font-sans overflow-x-hidden relative">
        <main ref={mainContentRef} className="container mx-auto px-4 py-4 pb-20 md:pb-4 max-w-7xl">
          {/* Breadcrumb */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <DynamicBreadcrumb />
          </motion.div>
          <div className="grid lg:grid-cols-2 gap-x-8 xl:gap-x-16 gap-y-8">
            {/* Image Section */}
            <motion.div variants={fadeIn} initial="hidden" animate="visible" className="space-y-4">
              <div className="flex flex-col gap-8">
                <div className="relative overflow-visible -mx-4 md:mx-0 md:px-12">
                  <Carousel setApi={setApi} index={currentSlide} opts={{ loop: images.length > 1 }}>
                    <CarouselContent>
                      {images.map((img, index) => (
                        <CarouselItem key={index}>
                          <div className="aspect-square relative overflow-hidden rounded-xl bg-gray-800">
                            <img 
                              src={img || "/placeholder.svg"} 
                              alt={`${productData.o_product_name} image ${index + 1}`} 
                              className="w-full h-full object-contain" 
                              loading="lazy"
                            />
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    {images.length > 1 && (
                      <>
                        <CarouselPrevious className="hidden md:flex items-center justify-center absolute top-1/2 left-2 sm:left-[-3rem] transform -translate-y-1/2 bg-[#5865f2] text-white rounded-full p-3 transition-colors duration-300 hover:bg-[#4752c4] z-20" />
                        <CarouselNext className="hidden md:flex items-center justify-center absolute top-1/2 right-2 sm:right-[-3rem] transform -translate-y-1/2 bg-[#5865f2] text-white rounded-full p-3 transition-colors duration-300 hover:bg-[#4752c4] z-20" />
                      </>
                    )}
                  </Carousel>
                </div>
                {images.length > 1 && (
                  <div className="grid grid-cols-4 gap-2 md:gap-4">
                    {images.slice(0, 4).map((img, index) => (
                      <motion.div 
                        key={index}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        onClick={() => api?.scrollTo(index)}
                        className={`aspect-square relative overflow-hidden rounded-lg bg-gray-800 cursor-pointer transition-all duration-300 ${
                          currentSlide === index ? "ring-2 ring-[#5865f2]" : "hover:ring-2 hover:ring-[#5865f2]/50"
                        }`}
                      >
                        <img 
                          src={img || "/placeholder.svg"} 
                          alt={`Thumbnail ${index + 1}`} 
                          className="w-full h-full object-cover" 
                          loading="lazy"
                        />
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
            
            {/* Details Section */}
            <motion.div variants={fadeIn} initial="hidden" animate="visible" transition={{ delay: 0.1 }}>
              <div className="space-y-6 lg:pl-4 xl:pl-8">
                {/* Product Name */}
                <div>
                  <h1 className={`text-3xl md:text-4xl lg:text-5xl font-bold mb-2 tracking-tight ${!isNameExpanded ? "line-clamp-2" : ""}`}>
                    {productData.o_product_name}
                  </h1>
                  {productData.o_product_name.split(" ").length > 10 && (
                    <button onClick={toggleNameExpansion} className="text-[#5865f2] hover:text-[#4752c4] text-sm font-medium mt-1">
                      {isNameExpanded ? "Show Less" : "Show More"}
                    </button>
                  )}
                  <div className="flex items-center flex-wrap gap-2 mt-2">
                    <p className="text-lg md:text-xl lg:text-2xl font-light text-gray-400">
                      {capitalize(productData.o_label)} - {capitalize(productData.o_subcategory_name)}
                    </p>
                    {productData.o_is_bestseller && (
                      <div className="bg-[#EFBF04] text-[#1f10f7] font-bold text-xs px-2 py-1 rounded border border-[#EFBF04]">Popular</div>
                    )}
                    <div className="bg-[#1a1c23] text-white text-xs px-2 py-1 rounded border border-[#2a2d36]">{capitalize(productData.o_condition)}</div>
                  </div>
                </div>

                                {/* Price */}
                                <div>
                                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.2 }} className="flex items-baseline gap-3">
                                        <p className="text-3xl md:text-4xl font-bold text-[#5865f2]">{formatCurrencyWithSeparator(discountPrice)}</p>
                                        {price > discountPrice && (
                                            <div className="flex items-baseline gap-2"><p className="text-xl md:text-2xl text-gray-400 line-through">{formatCurrencyWithSeparator(price)}</p><span className="bg-[#ff4d4d] text-white text-xs font-semibold px-2 py-1 rounded">{calculateDiscountPercentage(price, discountPrice)}% OFF</span></div>
                                        )}
                                    </motion.div>
                                    {isFetching && <p className="text-sm text-gray-500 mt-1">Updating price...</p>}
                                </div>

                                {/* Quantity Selector */}
                                <div>
                                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
                                        <h3 className="text-lg font-semibold text-white mb-3">Quantity</h3>
                                        <div className="flex items-center space-x-3 md:space-x-1">
                                            {cartLoading || quantity === null ? (<Skeleton className="h-10 w-32 rounded-md" />) : (<>
                                                <Button variant="outline" size="icon" className="bg-[#5865f2] text-white border-[#5865f2] transition-colors duration-300 hover:bg-[#4752c4] hover:border-[#4752c4] disabled:opacity-50" onClick={decreaseQuantity} disabled={quantity <= 1}><Minus className="w-4 h-4" /></Button>
                                                <span className="text-xl font-semibold w-12 text-center">{quantity}</span>
                                                <Button variant="outline" size="icon" className="bg-[#5865f2] text-white border-[#5865f2] transition-colors duration-300 hover:bg-[#4752c4] hover:border-[#4752c4] disabled:opacity-50" onClick={increaseQuantity} disabled={quantity >= 99}><Plus className="w-4 h-4" /></Button>
                                            </>)}
                                        </div>
                                    </motion.div>
                                </div>

                                {/* Add to Cart / Wishlist Buttons */}
                                <div ref={addToCartSectionRef}>
                                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.4 }} className="flex space-x-4">
                                        <Button className="flex-1 bg-[#5865f2] hover:bg-[#4752c4] text-white py-3 h-12 md:h-14 text-base md:text-lg font-semibold disabled:opacity-60" onClick={handleAddToCart} disabled={cartLoading || quantity === null || quantity < 1}><ShoppingBag className="mr-2 h-5 w-5" />Add to Cart</Button>
                                        <Button variant="outline" size="icon" className={`border-${isProductInWishlist ? "red-500" : "[#5865f2]"} w-12 h-12 md:w-14 md:h-14 transition-colors duration-300 ${isProductInWishlist ? "text-red-500 hover:bg-red-500 hover:border-red-500 hover:text-white" : "text-[#5865f2] hover:bg-[#4752c4] hover:border-[#4752c4] hover:text-white"}`} onClick={handleToggleWishlist}><Heart className="w-6 h-6 md:w-7 md:h-7" fill={isProductInWishlist ? "currentColor" : "none"} /><span className="sr-only">{isProductInWishlist ? "Remove from Wishlist" : "Add to Wishlist"}</span></Button>
                                    </motion.div>
                                </div>

                                {/* Product Description */}
                                <div>
                                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.5 }} className="text-base text-gray-300 leading-relaxed prose prose-invert max-w-none prose-p:my-2 prose-headings:my-3">
                                        <div className="line-clamp-4"><ReactMarkdown>{description}</ReactMarkdown></div>
                                        {description.length > 200 && (<button onClick={openDescriptionModal} className="text-[#5865f2] hover:text-[#4752c4] text-sm font-medium mt-2">Show More</button>)}
                                    </motion.div>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Similar Products Section */}
                    <div className="overflow-hidden">
                        <motion.div variants={staggerContainer} initial="hidden" animate="visible" transition={{ delay: 0.6 }} className="mt-16">
                            {productData.o_similar_products && productData.o_similar_products.length > 0 && (
                                <>
                                    <motion.h2 variants={fadeIn} className="text-2xl md:text-3xl font-bold mb-6">You May Also Like</motion.h2>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                                        {productData.o_similar_products.map((product: SimilarProduct, index) => {
                                            const similarPrice = product.price; const similarDiscountPrice = product.discount_price;
                                            return (
                                                <motion.div key={product.product_id} variants={fadeIn} custom={index} transition={{ delay: index * 0.05 }} onClick={() => navigate(`/product/${product.product_id}`)} className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg overflow-hidden hover:border-[#5865f2] transition-all duration-300 cursor-pointer flex flex-col group" whileHover={{ y: -5, boxShadow: "0 10px 15px -3px rgba(88, 101, 242, 0.2), 0 4px 6px -4px rgba(88, 101, 242, 0.1)" }}>
                                                    <div className="aspect-square relative w-full"><img src={product.primary_image || "/placeholder.svg"} alt={product.product_name} className="w-full h-full object-cover" loading="lazy"/><div className="absolute top-2 right-2 flex flex-col gap-1">{product.is_bestseller && (<div className="bg-[#EFBF04] text-[#1f10f7] font-bold text-xs px-1.5 py-0.5 rounded border border-[#EFBF04] shadow-sm">Popular</div>)}{similarPrice > similarDiscountPrice && (<div className="bg-[#ff4d4d] text-white text-xs font-semibold px-1.5 py-0.5 rounded shadow-sm">{calculateDiscountPercentage(similarPrice, similarDiscountPrice)}%</div>)}</div><div className="absolute bottom-2 left-2 bg-[#1a1c23]/80 backdrop-blur-sm text-white text-xs px-1.5 py-0.5 rounded border border-[#2a2d36]">{capitalize(product.condition)}</div></div>
                                                    <div className="p-3 flex flex-col flex-grow"><h3 className="font-semibold mb-1.5 line-clamp-2 h-12 text-sm md:text-base group-hover:text-[#5865f2] transition-colors">{product.product_name}</h3><div className="mt-auto"><div className="flex flex-col items-start"><p className="text-[#5865f2] font-bold text-base md:text-lg">{formatCurrencyWithSeparator(similarDiscountPrice)}</p>{similarPrice > similarDiscountPrice && (<p className="text-gray-400 text-xs line-through">{formatCurrencyWithSeparator(similarPrice)}</p>)}</div></div></div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </div>
                </main>

             {/* Mobile Persistent Footer */}
             {/* FIX: Ensure productData exists before accessing its properties */}
            {productData && (
                <div className={`fixed bottom-16 left-0 right-0 md:hidden transition-transform duration-300 ease-in-out z-40 ${ showMobileFooter ? "translate-y-0" : "translate-y-full" }`} >
                    <div className="bg-[#1a1c23] p-3 shadow-[0_-4px_15px_-3px_rgba(0,0,0,0.3)] border-t border-[#2a2d36]">
                        <div className="flex space-x-3">
                            {/* Use optional chaining on productData.o_product_id just in case, though it should exist here */}
                            <Button className="flex-1 bg-[#5865f2] hover:bg-[#4752c4] text-white h-12 text-base font-semibold disabled:opacity-60" onClick={handleAddToCart} disabled={cartLoading || quantity === null || quantity < 1} ><ShoppingBag className="mr-2 h-5 w-5" />Add to Cart</Button>
                            <Button variant="outline" size="icon" className={`border-${ isInWishlist(productData?.o_product_id) ? "red-500" : "[#5865f2]" } w-12 h-12 transition-colors duration-300 ${ isInWishlist(productData?.o_product_id) ? "text-red-500 hover:bg-red-500 hover:border-red-500 hover:text-white" : "text-[#5865f2] hover:bg-[#4752c4] hover:border-[#4752c4] hover:text-white" }`} onClick={handleToggleWishlist} ><Heart className="w-6 h-6" fill={isInWishlist(productData?.o_product_id) ? "currentColor" : "none"} /><span className="sr-only"> {isInWishlist(productData?.o_product_id) ? "Remove from Wishlist" : "Add to Wishlist"} </span></Button>
                        </div>
                    </div>
                </div>
            )}

             {/* Modals */}
            <LoginModal open={loginModalOpen} onOpenChange={setLoginModalOpen} />
            {/* FIX: Ensure productData exists before rendering modal */}
            {productData && (
                <DescriptionModal
                    title={productData.o_product_name}
                    content={description}
                    open={descriptionModalOpen}
                    onOpenChange={setDescriptionModalOpen}
                />
            )}
        </div>
    );
}
}