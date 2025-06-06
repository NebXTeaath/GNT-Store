// src/pages/HomePage/ProductCarousel.tsx
import * as React from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ProductCard } from "@/components/global/productsPage/ProductCard/ProductCard";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Define your Product type (adjust if you already have a global type)
export interface Product {
  product_id: string;
  slug: string;
  primary_image: string | null;
  product_name: string;
  price: number;
  discount_price: number;
  is_bestseller?: boolean;
  label?: string;
  condition?: string;
  average_rating?: number;
  review_count?: number;
}

interface ProductCarouselProps {
  products: Product[];
  autoplayDelay?: number;
  stopOnInteraction?: boolean;
}

// Skeleton component for the carousel loading state
export const ProductCarouselSkeleton = () => {
  return (
    <div className="w-full">
      <div className="flex gap-4 overflow-hidden">
        {Array(4).fill(0).map((_, index) => (
          <div
            key={index}
            className="flex-grow-0 flex-shrink-0 basis-1/2 sm:basis-1/3 lg:basis-1/4 min-w-0 px-2"
          >
            <div className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg overflow-hidden">
              <Skeleton className="aspect-square w-full bg-[#2a2d36]" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-4 w-3/4 bg-[#2a2d36]" />
                <Skeleton className="h-6 w-1/3 bg-[#2a2d36]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export function ProductCarousel({
  products,
  autoplayDelay = 3000,
}: ProductCarouselProps) {
  // Initialize autoplay plugin with useMemo to prevent recreation
  const autoplayPlugin = React.useMemo(
    () => Autoplay({
      delay: autoplayDelay,
      stopOnInteraction: false,
      playOnInit: true,
    }),
    [autoplayDelay]
  );

  const [isHovering, setIsHovering] = React.useState(false);
  const [userInteracted, setUserInteracted] = React.useState(false);
  const interactionTimerRef = React.useRef<number | null>(null);
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      align: "start",
      containScroll: false,
      dragFree: false,
      skipSnaps: false,
      inViewThreshold: 0.7,
      slidesToScroll: 1,
    },
    [autoplayPlugin]
  );
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [scrollSnaps, setScrollSnaps] = React.useState<number[]>([]);

  // Safe autoplay management function
  const manageAutoplay = React.useCallback(() => {
    try {
      // More comprehensive guard checks
      if (!autoplayPlugin || 
          typeof autoplayPlugin !== 'object' ||
          typeof autoplayPlugin.isPlaying !== 'function' ||
          typeof autoplayPlugin.play !== 'function' ||
          typeof autoplayPlugin.stop !== 'function') {
        return;
      }

      const shouldAutoplay = !isHovering && !userInteracted;
      
      if (shouldAutoplay && !autoplayPlugin.isPlaying()) {
        autoplayPlugin.play();
      } else if (!shouldAutoplay && autoplayPlugin.isPlaying()) {
        autoplayPlugin.stop();
      }
    } catch (error) {
      console.warn('Autoplay management error:', error);
    }
  }, [autoplayPlugin, isHovering, userInteracted]);

  // --- Autoplay Control Logic ---
  React.useEffect(() => {
    if (!emblaApi) return;

    const handleAutoplayCheck = () => manageAutoplay();
    
    // Initial call
    manageAutoplay();
    
    emblaApi.on("select", handleAutoplayCheck);
    emblaApi.on("reInit", handleAutoplayCheck);
    
    return () => {
      if (emblaApi) {
        emblaApi.off("select", handleAutoplayCheck);
        emblaApi.off("reInit", handleAutoplayCheck);
      }
    };
  }, [emblaApi, manageAutoplay]);

  // --- User Interaction Handling ---
  const handleUserInteraction = React.useCallback(() => {
    try {
      // Safe autoplay stop
      if (autoplayPlugin && 
          typeof autoplayPlugin.isPlaying === 'function' && 
          typeof autoplayPlugin.stop === 'function' &&
          autoplayPlugin.isPlaying()) {
        autoplayPlugin.stop();
      }
    } catch (error) {
      console.warn('Autoplay stop error:', error);
    }
    
    setUserInteracted(true);
    
    if (interactionTimerRef.current !== null) {
      window.clearTimeout(interactionTimerRef.current);
    }
    
    interactionTimerRef.current = window.setTimeout(() => {
      setUserInteracted(false);
      interactionTimerRef.current = null;
    }, 5000);
  }, [autoplayPlugin]);

  // --- Embla Event Listeners Setup ---
  React.useEffect(() => {
    if (!emblaApi) return;
    
    const onSelect = () => {
      setScrollSnaps(emblaApi.scrollSnapList());
      setCurrentIndex(emblaApi.selectedScrollSnap());
    };
    
    const onPointerDown = () => handleUserInteraction();
    
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("pointerDown", onPointerDown);
    emblaApi.on("reInit", onSelect);
    
    return () => {
      if (emblaApi) {
        emblaApi.off("select", onSelect);
        emblaApi.off("pointerDown", onPointerDown);
        emblaApi.off("reInit", onSelect);
      }
      if (interactionTimerRef.current !== null) {
        window.clearTimeout(interactionTimerRef.current);
      }
    };
  }, [emblaApi, handleUserInteraction]);

  // --- Navigation Functions ---
  const scrollPrev = React.useCallback(() => {
    if (!emblaApi) return;
    handleUserInteraction();
    emblaApi.scrollPrev();
  }, [emblaApi, handleUserInteraction]);

  const scrollNext = React.useCallback(() => {
    if (!emblaApi) return;
    handleUserInteraction();
    emblaApi.scrollNext();
  }, [emblaApi, handleUserInteraction]);

  const handleDotClick = React.useCallback(
    (index: number) => {
      if (!emblaApi) return;
      handleUserInteraction();
      emblaApi.scrollTo(index);
    },
    [emblaApi, handleUserInteraction]
  );

  // --- Hover Handlers ---
  const handleMouseEnter = React.useCallback(() => {
    setIsHovering(true);
  }, []);

  const handleMouseLeave = React.useCallback(() => {
    setIsHovering(false);
  }, []);

  // Early return if no products
  if (!products || products.length === 0) {
    return <ProductCarouselSkeleton />;
  }

  return (
    <div
      className="relative w-full group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#0f1115] to-transparent pointer-events-none z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#0f1115] to-transparent pointer-events-none z-10" />

      <div className="w-full overflow-hidden">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {products.map((product) => (
              <div
                key={product.slug}
                className="flex-grow-0 flex-shrink-0 basis-1/2 sm:basis-1/3 lg:basis-1/4 min-w-0 px-2"
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={scrollPrev}
        className="absolute top-1/2 left-0 md:left-[-3rem] transform -translate-y-1/2 bg-[#5865f2] text-white rounded-full p-3 transition-all duration-300 opacity-0 group-hover:opacity-100 hover:bg-[#4a51d0] z-20"
        aria-label="Previous slide"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      <button
        onClick={scrollNext}
        className="absolute top-1/2 right-0 md:right-[-3rem] transform -translate-y-1/2 bg-[#5865f2] text-white rounded-full p-3 transition-all duration-300 opacity-0 group-hover:opacity-100 hover:bg-[#4a51d0] z-20"
        aria-label="Next slide"
      >
        <ArrowRight className="w-5 h-5" />
      </button>

      <div className="flex justify-center mt-4 space-x-2">
        {scrollSnaps.map((_, index) => (
          <button
            key={index}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === currentIndex ? "bg-[#5865f2]" : "bg-gray-400"
            }`}
            onClick={() => handleDotClick(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}