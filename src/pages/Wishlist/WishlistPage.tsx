// src/pages/Wishlist/WishlistPage.tsx
import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { ArrowLeft, Trash2, Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWishlist } from "@/context/WishlistContext";
import { useAuth } from "@/context/AuthContext"; // Import useAuth
import { Separator } from "@/components/ui/separator";
import { motion, Variants } from "framer-motion";
import { Pagination } from "@/pages/searchPage/search/Pagination";
import { formatCurrencyWithSeparator } from "@/lib/currencyFormat";
import { toast } from "sonner";
import SEO from '@/components/seo/SEO';

const ITEMS_PER_PAGE = 5;
const fadeIn: Variants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } };
const staggerContainer: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } } };
const calculateDiscountPercentage = (originalPrice: number, discountPrice: number): number => {
    if (!originalPrice || originalPrice <= 0 || discountPrice < 0 || discountPrice >= originalPrice) return 0;
    return Math.round(((originalPrice - discountPrice) / originalPrice) * 100);
};


export default function WishlistPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { wishlistItems, removeFromWishlist, clearWishlist, isLoading: isWishlistLoading, refetchWishlist } = useWishlist();
  const { isAuthenticated, isLoadingAuth, openLoginModal } = useAuth(); // Get modal opener
  const [currentPage, setCurrentPage] = useState(1);
  const siteUrl = window.location.origin;

  // Authentication Check Effect
  useEffect(() => {
      if (isLoadingAuth) return; // Wait for auth check

      if (!isAuthenticated) {
          console.log('[WishlistPage] Not authenticated, opening login modal.');
          // Open modal instead of navigating
          openLoginModal(location.pathname + location.search); // Pass current path
      } else {
           // Refetch wishlist when confirmed authenticated
           console.log('[WishlistPage] Authenticated, ensuring wishlist is fresh.');
           refetchWishlist();
      }
  }, [isLoadingAuth, isAuthenticated, openLoginModal, location.pathname, location.search, refetchWishlist]); // Added dependencies

  // Pagination Calculation
  const totalPages = Math.ceil(wishlistItems.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentWishlistItems = wishlistItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Handlers
  const continueShopping = () => { navigate("/"); };
  const handlePageChange = (page: number) => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const navigateToProduct = (slug: string | undefined) => {
      if (slug) { navigate(`/product/${slug}`); }
      else { toast.error("Product details not available."); }
  };

  // Effects
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, []);
  useEffect(() => { if (currentPage > totalPages && totalPages > 0) { setCurrentPage(1); } }, [wishlistItems.length, currentPage, totalPages]);

  // SEO Data
  const pageTitle = "My Wishlist | GNT Store";
  const pageDescription = "View and manage your saved items on GNT Store.";
  const canonicalUrl = `${siteUrl}${location.pathname}`;

  // Loading State UI
  if (isLoadingAuth || (isAuthenticated && isWishlistLoading)) {
    return (
      <div className="min-h-screen bg-[#0f1115] text-white flex items-center justify-center">
         <SEO title="Loading Wishlist..." description="Loading your saved items." noIndex={true} />
        <Loader2 className="h-8 w-8 animate-spin text-[#5865f2]" />
      </div>
    );
  }

  // Render null while the redirect/modal logic runs in the effect
  if (!isAuthenticated) {
      return null;
  }

  // Authenticated View
  return (
    <div className="min-h-screen bg-[#0f1115] text-white">
       <SEO title={pageTitle} description={pageDescription} canonicalUrl={canonicalUrl} noIndex={true} ogData={{ title: pageTitle, description: pageDescription, url: canonicalUrl, type: 'website', image: `${siteUrl}/favicon/og-image.png` }} />
      <main className="container mx-auto px-4 py-8">
        <motion.div className="max-w-4xl mx-auto" variants={staggerContainer} initial="hidden" animate="visible">
          {/* Header Section */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl md:text-3xl font-bold">My Wishlist</h1>
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
              {wishlistItems.length > 0 && (<Button variant="ghost" className="text-gray-400 hover:bg-[#2e3044] hover:text-red-500" onClick={clearWishlist}>Clear All</Button>)}
              <Button variant="link" className="text-gray-400 hover:text-white px-0" onClick={continueShopping}> <ArrowLeft className="mr-2 h-4 w-4" /> Continue Shopping </Button>
            </div>
          </div>
          <div className="mb-4 text-sm text-gray-400"> {`Wishlist Items: ${wishlistItems.length}`} </div>
          <Separator className="my-4 bg-[#2a2d36]" />

          {/* Wishlist Content */}
          {wishlistItems.length === 0 ? (
            <motion.div variants={fadeIn} className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg p-8 text-center"> <Heart className="w-16 h-16 mx-auto text-gray-500 mb-4" /> <h2 className="text-xl mb-4">Your wishlist is empty</h2> <p className="text-gray-400 mb-6">Add items while browsing.</p> <Button className="bg-[#5865f2] hover:bg-[#4752c4] text-white" onClick={continueShopping}> Browse Products </Button> </motion.div>
          ) : (
            <>
              <div className="space-y-4">
                {currentWishlistItems.map((item, index) => (
                  <motion.div key={item.id} variants={fadeIn} custom={index} transition={{ delay: index * 0.05 }} className="bg-[#1a1c23] border border-[#2a2d36] hover:border-[#5865f2] rounded-lg p-4 flex flex-col sm:flex-row items-center sm:items-start gap-4 cursor-pointer transition-colors duration-300" onClick={() => navigateToProduct(item.slug)}>
                    <div className="w-24 h-24 bg-[#2a2d36] rounded-md overflow-hidden flex-shrink-0"> <img src={item.image || "/placeholder.svg"} alt={item.title} className="w-full h-full object-cover" /> </div>
                    <div className="flex-1 flex flex-col sm:flex-row justify-between items-center sm:items-start w-full">
                      <div className="text-center sm:text-left mb-4 sm:mb-0"> <h3 className="font-medium text-lg line-clamp-2">{item.title}</h3> <div className="flex flex-col sm:flex-row gap-2 sm:items-center mt-1"> <p className="text-[#5865f2] font-bold"> {formatCurrencyWithSeparator(item.discount_price)} </p> {item.price > item.discount_price && ( <div className="flex items-center gap-2"> <p className="text-gray-400 line-through text-sm"> {formatCurrencyWithSeparator(item.price)} </p> <span className="bg-[#ff4d4d] text-white text-xs px-2 py-1 rounded"> {calculateDiscountPercentage(item.price, item.discount_price)}% OFF </span> </div> )} </div> </div>
                      <div className="flex items-center gap-4 flex-shrink-0"> <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-500 hover:bg-transparent" onClick={(e) => { e.stopPropagation(); removeFromWishlist(item.id); }}> <Trash2 className="h-5 w-5" /> </Button> </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              {totalPages > 1 && ( <div className="mt-6 flex justify-center"> <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} /> </div> )}
            </>
          )}
          {wishlistItems.length > 0 && ( <div className="mt-8 text-center"> <Button className="bg-[#5865f2] hover:bg-[#4752c4] text-white px-8 py-6" onClick={continueShopping}> Continue Shopping </Button> </div> )}
        </motion.div>
      </main>
    </div>
  );
}