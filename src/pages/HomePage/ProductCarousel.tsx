// src/pages/HomePage/ProductCarousel.tsx
import * as React from "react";
import { useRef, useState, useEffect, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ProductCard } from "@/pages/ProductCard/ProductCard";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useInView } from 'react-intersection-observer';

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
}

interface ProductCarouselProps {
  products: Product[];
  autoplayDelay?: number;
  stopOnInteraction?: boolean;
  isAboveTheFold?: boolean;
}

// Skeleton component for the carousel loading state
export const ProductCarouselSkeleton = () => {
  return (
    <div className="w-full" style={{ minHeight: '320px' }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-[#1a1c23] rounded-lg p-4 h-full">
            <div className="aspect-square w-full bg-[#2a2d36] rounded-md mb-4" />
            <div className="h-4 bg-[#2a2d36] rounded mb-2 w-3/4" />
            <div className="h-4 bg-[#2a2d36] rounded w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
};

export function ProductCarousel({
  products,
  autoplayDelay = 3000,
  isAboveTheFold = false,
}: ProductCarouselProps) {
  // Use intersection observer to detect when carousel is in view
  const [ref, inView] = useInView({
    triggerOnce: false,
    threshold: 0.1,
  });
  
  // Only initialize the carousel when it's in view
  const [carouselInitialized, setCarouselInitialized] = useState(isAboveTheFold);
  
  useEffect(() => {
    if (inView && !carouselInitialized) {
      setCarouselInitialized(true);
    }
  }, [inView, carouselInitialized]);

  // Initialize autoplay plugin
  const autoplayPlugin = useRef(
    Autoplay({
      delay: autoplayDelay,
      stopOnInteraction: false,
      playOnInit: isAboveTheFold, // Only autoplay immediately if above the fold
    })
  );

  const [isHovering, setIsHovering] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const interactionTimerRef = useRef<number | null>(null);
  
  // Only initialize Embla when in view or above the fold
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
    carouselInitialized ? [autoplayPlugin.current] : []
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
  const [visibleSlides, setVisibleSlides] = useState<number[]>([]);

  // --- Autoplay Control Logic ---
  useEffect(() => {
    if (!emblaApi || !carouselInitialized) return;
    
    const manageAutoplay = () => {
      const shouldAutoplay = !isHovering && !userInteracted && inView;
      if (shouldAutoplay && !autoplayPlugin.current.isPlaying()) {
        autoplayPlugin.current.play();
      } else if (!shouldAutoplay && autoplayPlugin.current.isPlaying()) {
        autoplayPlugin.current.stop();
      }
    };
    
    manageAutoplay();
    
    const handleAutoplayCheck = () => manageAutoplay();
    
    emblaApi.on("select", handleAutoplayCheck);
    emblaApi.on("reInit", handleAutoplayCheck);
    
    return () => {
      emblaApi.off("select", handleAutoplayCheck);
      emblaApi.off("reInit", handleAutoplayCheck);
    };
  }, [emblaApi, isHovering, userInteracted, inView, carouselInitialized]);

  // --- User Interaction Handling ---
  const handleUserInteraction = useCallback(() => {
    if (emblaApi && autoplayPlugin.current.isPlaying()) {
      autoplayPlugin.current.stop();
    }
    
    setUserInteracted(true);
    
    if (interactionTimerRef.current !== null) {
      window.clearTimeout(interactionTimerRef.current);
    }
    
    interactionTimerRef.current = window.setTimeout(() => {
      setUserInteracted(false);
      interactionTimerRef.current = null;
      
      // Trigger autoplay check after timer expires
      if (emblaApi) {
        const shouldAutoplay = !isHovering && !userInteracted && inView;
        if (shouldAutoplay && !autoplayPlugin.current.isPlaying()) {
          autoplayPlugin.current.play();
        }
      }
    }, 5000);
  }, [emblaApi, isHovering, userInteracted, inView]);

  // Track visible slides to prioritize their loading
  useEffect(() => {
    if (!emblaApi || !carouselInitialized) return;
    
    const calculateVisibleSlides = () => {
      const engine = emblaApi.internalEngine();
      const scrollSnap = emblaApi.scrollSnapList();
      const currentIndex = emblaApi.selectedScrollSnap();
      
      // Get a range of slides around the current one
      const visibleRange = 2; // Show 2 slides on each side
      const visible = [];
      
      for (
        let i = Math.max(0, currentIndex - visibleRange); 
        i <= Math.min(scrollSnap.length - 1, currentIndex + visibleRange); 
        i++
      ) {
        visible.push(i);
      }
      
      setVisibleSlides(visible);
    };
    
    calculateVisibleSlides();
    
    const onSelect = () => {
      setCurrentIndex(emblaApi.selectedScrollSnap());
      calculateVisibleSlides();
    };
    
    const onPointerDown = () => handleUserInteraction();
    
    onSelect();
    
    emblaApi.on("select", onSelect);
    emblaApi.on("pointerDown", onPointerDown);
    emblaApi.on("reInit", () => {
      setScrollSnaps(emblaApi.scrollSnapList());
      onSelect();
    });
    
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("pointerDown", onPointerDown);
      emblaApi.off("reInit", onSelect);
      
      if (interactionTimerRef.current !== null) {
        window.clearTimeout(interactionTimerRef.current);
      }
    };
  }, [emblaApi, handleUserInteraction, carouselInitialized]);

  // --- Navigation Functions ---
  const scrollPrev = useCallback(() => {
    if (!emblaApi) return;
    handleUserInteraction();
    emblaApi.scrollPrev();
  }, [emblaApi, handleUserInteraction]);

  const scrollNext = useCallback(() => {
    if (!emblaApi) return;
    handleUserInteraction();
    emblaApi.scrollNext();
  }, [emblaApi, handleUserInteraction]);

  const handleDotClick = useCallback((index: number) => {
    if (!emblaApi) return;
    handleUserInteraction();
    emblaApi.scrollTo(index);
  }, [emblaApi, handleUserInteraction]);

  // --- Hover Handlers ---
  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    
    // Optional: Resume autoplay immediately if not interacted with recently
    if (!userInteracted && emblaApi && !autoplayPlugin.current.isPlaying() && inView) {
      autoplayPlugin.current.play();
    }
  }, [userInteracted, emblaApi, inView]);

  // Determine if this carousel should load eagerly (for above the fold content)
  const shouldLoadEagerly = isAboveTheFold;

  return (
    // Add 'group' and hover handlers to the OUTERMOST div, plus ref for intersection observer
    <div
      ref={ref}
      className="relative w-full group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Gradient overlays remain direct children of the outer relative container */}
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#0f1115] to-transparent pointer-events-none z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#0f1115] to-transparent pointer-events-none z-10" />
      
      {/* Inner container for Embla viewport */}
      <div className="w-full overflow-hidden">
        {(carouselInitialized || shouldLoadEagerly) ? (
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex">
              {products.map((product, index) => (
                <div
                  key={product.slug}
                  className="flex-grow-0 flex-shrink-0 basis-1/2 sm:basis-1/3 lg:basis-1/4 min-w-0 px-2"
                >
                  <ProductCard 
                    product={product} 
                    isAboveTheFold={isAboveTheFold && index < 5} 
                    priority={
                      // Set high priority for visible slides, or first few slides if above fold
                      (isAboveTheFold && index < 3) || visibleSlides.includes(index) 
                        ? 'high' 
                        : 'auto'
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Show placeholder skeleton if not yet initialized and not above fold
          <ProductCarouselSkeleton />
        )}
      </div>

      {/* Navigation Controls - Only show if carousel is initialized */}
      {carouselInitialized && (
        <>
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
        </>
      )}

      {/* Slide indicator dots */}
      {carouselInitialized && (
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
      )}
    </div>
  );
}