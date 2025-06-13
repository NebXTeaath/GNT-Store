// src/components/global/Loading/LoadingScreen.tsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import logo from "@/assets/logo.svg";
import { AuthLoadingCarousel, CarouselItem } from '@/components/pages/Login/AuthLoadingCarousel';
import { useProductCategories } from '@/components/global/hooks/useProductCategories';
import { supabase } from '@/lib/supabase';
import { Product } from '@/lib/types/product';

// Animation variants for the container
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3, staggerChildren: 0.15, }, },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

// Animation variants for each dot
const dotVariants = {
  hidden: { y: 0, opacity: 0 },
  visible: { y: [0, -10, 0], opacity: 1, transition: { duration: 0.6, repeat: Infinity, repeatType: "loop" as const, ease: "easeInOut", }, },
};

interface LoadingScreenProps {
  message?: string;
  isAuth?: boolean; // Add this to conditionally show carousel for auth loading
}

const LoadingScreen = ({ 
  message = "Updating your Experience...", 
  isAuth = false 
}: LoadingScreenProps) => {
  const [carouselItems, setCarouselItems] = useState<CarouselItem[]>([]);
  const [isCarouselReady, setIsCarouselReady] = useState(false);
  
  // Get all product categories dynamically
  const { data: productCategories, isLoading: categoriesLoading } = useProductCategories();

  useEffect(() => {
    // Only proceed if this is an auth loading screen and categories have been fetched
    if (!isAuth || categoriesLoading || !productCategories) {
      if (!categoriesLoading && isAuth) {
        // If categories are done loading but there are none, mark carousel as ready to show empty state
        setIsCarouselReady(true);
      }
      return;
    }

    const fetchAllFeaturedProducts = async () => {
      try {
        const categoryNames = Object.keys(productCategories);
        if (categoryNames.length === 0) {
          setIsCarouselReady(true); // No categories, just show empty state
          return;
        }

        // Create a promise for each category to fetch a sample of products
        const productPromises = categoryNames.map(categoryName => 
          supabase.rpc("get_products_list", {
            page_number: 1,
            page_size: 10, // Fetch up to 10 products from each top-level category
            category_filter: categoryName,
            subcategory_filter: null,
            label_filter: null,
            condition_filter: null,
          })
        );

        // Await all fetches to complete
        const results = await Promise.all(productPromises);

        // Combine all products from successful fetches into a single array
        const allProducts = results.flatMap(result => {
          if (result.error) {
            console.error(`Error fetching products for a category:`, result.error);
            return []; // Return empty array for this category if there's an error
          }
          return (result.data as Product[]) || [];
        });

        if (allProducts.length > 0) {
          // Map the combined products to the format required by the carousel
          const mappedItems: CarouselItem[] = allProducts.map(product => ({
            image: product.primary_image || '',
            title: product.product_name || 'Product',
            price: typeof product.price === 'number' ? product.price : undefined,
            discount_price: typeof product.discount_price === 'number' ? product.discount_price : undefined,
          }));
          
          // Shuffle the array for a random display of featured products
          const shuffledItems = [...mappedItems];
          for (let i = shuffledItems.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledItems[i], shuffledItems[j]] = [shuffledItems[j], shuffledItems[i]];
          }
          
          setCarouselItems(shuffledItems);
        }
      } catch (error) {
        console.error("Error fetching featured products for carousel:", error);
      } finally {
        // Mark the carousel as ready to be displayed (even if there are no items)
        setIsCarouselReady(true);
      }
    };

    fetchAllFeaturedProducts();

  }, [isAuth, productCategories, categoriesLoading]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 bg-[#1a1c23]/90 backdrop-blur-sm flex flex-col items-center justify-center z-50"
    >
      {/* Logo */}
      <img src={logo} alt="GNT" className="w-80 h-25 mb-4" />
      
      {/* Show carousel for auth loading if ready */}
      {isAuth && isCarouselReady && (
        <div className="max-w-md w-full px-4 mb-8">
          {carouselItems.length > 0 ? (
            <AuthLoadingCarousel items={carouselItems} />
          ) : (
            <div className="h-16 flex items-center justify-center">
              <p className="text-gray-400">Loading featured products...</p>
            </div>
          )}
        </div>
      )}
      
      {/* Loading dots animation */}
      <motion.div className="flex space-x-2">
        {[0, 1, 2].map((index) => (
          <motion.div 
            key={index} 
            variants={dotVariants} 
            className="h-4 w-4 bg-[#5865f2] rounded-full" 
          />
        ))}
      </motion.div>
      
      <p className="mt-6 text-base font-medium text-gray-300">{message}</p>
    </motion.div>
  );
};

export default LoadingScreen;