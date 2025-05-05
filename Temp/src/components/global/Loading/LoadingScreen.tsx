
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import logo from "@/assets/logo.svg"; // Adjust the path as necessary
import { AuthLoadingCarousel, CarouselItem } from '@/components/pages/Login/AuthLoadingCarousel';
import { useProducts } from '@/components/global/productsPage/useProducts';

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
  
  // Use the products hook to get items for the carousel
  const { products: consolesProducts, isLoading: consolesLoading } = useProducts({ 
    category: "Consoles", 
    pageSize: 10 
  });
  
  const { products: computersProducts, isLoading: computersLoading } = useProducts({ 
    category: "Computers", 
    pageSize: 10 
  });

  useEffect(() => {
    // Only proceed if this is an auth loading screen
    if (!isAuth) return;

    if (!consolesLoading && !computersLoading) {
      // Combine and map products to carousel items format
      const allProducts = [...(consolesProducts || []), ...(computersProducts || [])].filter(Boolean);
      
      if (allProducts.length > 0) {
        // Map the products to the carousel item format
        const mappedItems: CarouselItem[] = allProducts.map(product => ({
          image: product.primary_image || '',
          title: product.product_name || 'Product',
          price: typeof product.price === 'number' ? product.price : undefined,
          discount_price: typeof product.discount_price === 'number' ? product.discount_price : undefined,
        }));
        
        // Shuffle the array
        const shuffledItems = [...mappedItems];
        for (let i = shuffledItems.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledItems[i], shuffledItems[j]] = [shuffledItems[j], shuffledItems[i]];
        }
        
        setCarouselItems(shuffledItems);
      }
      
      setIsCarouselReady(true);
    }
  }, [consolesProducts, computersProducts, consolesLoading, computersLoading, isAuth]);

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