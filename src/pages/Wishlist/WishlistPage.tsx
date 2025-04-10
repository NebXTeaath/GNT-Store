import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWishlist } from "@/context/WishlistContext";
import { Separator } from "@/components/ui/separator";
import { motion, Variants } from "framer-motion";
import {Pagination} from "@/pages/searchPage/search/Pagination";
import { formatCurrencyWithSeparator } from "@/lib/currencyFormat";
import { toast } from "sonner";

const ITEMS_PER_PAGE = 5;

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

const calculateDiscountPercentage = (originalPrice: number, discountPrice: number): number => {
  return Math.round(((originalPrice - discountPrice) / originalPrice) * 100);
};

export default function WishlistPage() {
  const navigate = useNavigate();
  const { wishlistItems, removeFromWishlist, clearWishlist, isLoading, isAuthenticated } = useWishlist();
  const [currentPage, setCurrentPage] = useState(1);

  // Calculate pagination variables
  const totalPages = Math.ceil(wishlistItems.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentWishlistItems = wishlistItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const continueShopping = () => {
    navigate("/");
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Navigate to product detail page
  const navigateToProduct = (slug: string) => {
    if (slug) {
      navigate(`/product/${slug}`);
    } else {
      toast.error("Product details not available", {
        id: "product-not-found",
        description: "The product information could not be found."
      });
    }
  };

  // ----- Scroll to Top on Mount -----
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Reset to first page when wishlist items change
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [wishlistItems, currentPage, totalPages]);

  // Set the document title when the component mounts.
  useEffect(() => {
    document.title = "[GNT] Wishlist";
  }, []); 

  // Show skeleton loading state first
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f1115] text-white">
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div className="h-8 w-48 bg-gray-800 animate-pulse rounded"></div>
              <div className="h-8 w-40 bg-gray-800 animate-pulse rounded"></div>
            </div>
            {[...Array(3)].map((_, index) => (
              <div key={index} className="mb-4 bg-[#1a1c23] border border-[#2a2d36] rounded-lg p-4 animate-pulse">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="h-24 w-24 bg-gray-800 rounded-md"></div>
                  <div className="flex-1">
                    <div className="h-6 w-3/4 bg-gray-800 rounded mb-2"></div>
                    <div className="h-4 w-1/4 bg-gray-800 rounded"></div>
                  </div>
                  <div className="h-8 w-8 bg-gray-800 rounded-full"></div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // Only after loading is complete, check authentication
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0f1115] text-white">
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-2xl md:text-3xl font-bold">My Wishlist</h1>
              <Button variant="link" className="text-gray-400 hover:text-white px-0" onClick={continueShopping}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Continue Shopping
              </Button>
            </div>
            <div className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg p-8 text-center">
              <Heart className="w-16 h-16 mx-auto text-gray-500 mb-4" />
              <h2 className="text-xl mb-4">Please log in to view your wishlist</h2>
              <p className="text-gray-400 mb-6">You need to be logged in to save and view your wishlist items.</p>
              <Button className="bg-[#5865f2] hover:bg-[#4752c4] text-white" onClick={continueShopping}>
                Browse Products
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1115] text-white">
      <main className="container mx-auto px-4 py-8">
        <motion.div 
          className="max-w-4xl mx-auto"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl md:text-3xl font-bold">My Wishlist</h1>
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
              {wishlistItems.length > 0 && (
                <Button 
                  variant="ghost" 
                  className="text-gray-400 hover:bg-[#2e3044] hover:text-red-500"
                  onClick={clearWishlist}
                >
                  Clear All
                </Button>
              )}
              <Button variant="link" className="text-gray-400 hover:text-white px-0" onClick={continueShopping}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Continue Shopping
              </Button>
            </div>
          </div>
          
          <div className="mb-4 text-sm text-gray-400">
            {`Wishlist Items: ${wishlistItems.length}`}
          </div>
          
          <Separator className="my-4 bg-[#2a2d36]" />

          {wishlistItems.length === 0 ? (
            <motion.div 
              variants={fadeIn}
              className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg p-8 text-center"
            >
              <Heart className="w-16 h-16 mx-auto text-gray-500 mb-4" />
              <h2 className="text-xl mb-4">Your wishlist is empty</h2>
              <p className="text-gray-400 mb-6">Add items to your wishlist while browsing our products.</p>
              <Button className="bg-[#5865f2] hover:bg-[#4752c4] text-white" onClick={continueShopping}>
                Browse Products
              </Button>
            </motion.div>
          ) : (
            <>
              <div className="space-y-4">
                {currentWishlistItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    variants={fadeIn}
                    custom={index}
                    transition={{ delay: index * 0.05 }}
                    className="bg-[#1a1c23] border border-[#2a2d36] hover:border-[#5865f2] rounded-lg p-4 flex flex-col sm:flex-row items-center sm:items-start gap-4 cursor-pointer transition-colors duration-300"
                    onClick={() => navigateToProduct(item.slug)}
                  >
                    <div className="w-24 h-24 bg-[#2a2d36] rounded-md overflow-hidden">
                      <img src={item.image || "/placeholder.svg"} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 flex flex-col sm:flex-row justify-between items-center sm:items-start w-full">
                      <div className="text-center sm:text-left mb-4 sm:mb-0">
                        <h3 className="font-medium text-lg line-clamp-2">{item.title}</h3>
                        <div className="flex flex-col sm:flex-row gap-2 sm:items-center mt-1">
                            <p className="text-[#5865f2] font-bold">
                              {formatCurrencyWithSeparator(item.discount_price)}
                            </p>
                            {item.price > item.discount_price && (
                              <div className="flex items-center gap-2">
                                <p className="text-gray-400 line-through">
                                  {formatCurrencyWithSeparator(item.price)}
                                </p>
                                <span className="bg-[#ff4d4d] text-white text-xs px-2 py-1 rounded">
                                  {calculateDiscountPercentage(item.price, item.discount_price)}% OFF
                                </span>
                              </div>
                            )}
                          </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-gray-400 hover:text-red-500 hover:bg-transparent"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromWishlist(item.id);
                          }}
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              {/* Pagination component */}
              {totalPages > 1 && (
                <div className="mt-6">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
          
          {wishlistItems.length > 0 && (
            <div className="mt-8 text-center">
              <Button className="bg-[#5865f2] hover:bg-[#4752c4] text-white px-8 py-6" onClick={continueShopping}>
                Continue Shopping
              </Button>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}