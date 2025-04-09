// src/pages/HomePage/ProductCarousel.tsx
import * as React from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ProductCard } from "@/pages/searchPage/search/ProductCard";
import { ArrowLeft, ArrowRight } from "lucide-react";

// Define your Product type (adjust if you already have a global type)
export interface Product {
  product_id: string;
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
}

export function ProductCarousel({ 
  products, 
  autoplayDelay = 3000, 
  stopOnInteraction = true 
}: ProductCarouselProps) {
  // Create autoplay plugin with configurable options
  const autoplayPlugin = React.useRef(
    Autoplay({ 
      delay: autoplayDelay, 
      stopOnInteraction: false, // We'll handle this manually for better control
      playOnInit: true
    })
  );

  // Track if mouse is hovering over carousel
  const [isHovering, setIsHovering] = React.useState(false);
  
  // Track if user has interacted with the carousel recently
  const [userInteracted, setUserInteracted] = React.useState(false);
  
  // Reference to interaction reset timer
  const interactionTimerRef = React.useRef<number | null>(null);
  
  // Creating a reference to the embla carousel API with plugins
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,         // Enable infinite looping for smoother experience
      align: "start",     // Alignment at the start of the container
      containScroll: "trimSnaps", // Prevent scrolling beyond last slide
      dragFree: false,    // Disable free-form dragging
    },
    [autoplayPlugin.current] // Add the autoplay plugin
  );

  // Track the current slide index and total slide count
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [scrollSnaps, setScrollSnaps] = React.useState<number[]>([]);

  // This effect controls the autoplay state based on user interaction and hover
  React.useEffect(() => {
    // Only run if emblaApi is available
    if (!emblaApi) return;

    // Function to manage autoplay state
    const manageAutoplay = () => {
      // Both conditions must be false to enable autoplay
      const shouldAutoplay = !isHovering && !userInteracted;
      
      console.log('Autoplay conditions check:', {
        isHovering,
        userInteracted,
        shouldAutoplay,
        currentlyPlaying: autoplayPlugin.current.isPlaying()
      });
      
      if (shouldAutoplay && !autoplayPlugin.current.isPlaying()) {
        console.log('Starting autoplay');
        autoplayPlugin.current.play();
      } else if (!shouldAutoplay && autoplayPlugin.current.isPlaying()) {
        console.log('Stopping autoplay');
        autoplayPlugin.current.stop();
      }
    };
    
    // Initial autoplay management
    manageAutoplay();
    
    // Set up a listener for any changes that might affect autoplay
    const handleAutoplayCheck = () => {
      manageAutoplay();
    };
    
    // Listen for slide selection changes (might need to restart autoplay)
    emblaApi.on("select", handleAutoplayCheck);
    
    // Cleanup
    return () => {
      emblaApi.off("select", handleAutoplayCheck);
    };
  }, [emblaApi, isHovering, userInteracted]);

  // Helper function to handle user interaction
  const handleUserInteraction = React.useCallback(() => {
    console.log('User interaction detected');
    
    // Stop autoplay immediately on interaction
    if (autoplayPlugin.current.isPlaying()) {
      autoplayPlugin.current.stop();
      console.log('Autoplay stopped due to user interaction');
    }
    
    // Set the interaction flag
    setUserInteracted(true);
    
    // Clear any existing timer
    if (interactionTimerRef.current !== null) {
      window.clearTimeout(interactionTimerRef.current);
      interactionTimerRef.current = null;
    }
    
    // Set a timer to reset the interaction flag after delay
    interactionTimerRef.current = window.setTimeout(() => {
      console.log('Interaction timer expired, resetting userInteracted flag');
      setUserInteracted(false);
      interactionTimerRef.current = null;
    }, 5000); // 5 seconds of inactivity before autoplay can resume
    
  }, []);

  // Set up event listeners when the carousel is initialized
  React.useEffect(() => {
    if (!emblaApi) return;

    // Get the snap points
    setScrollSnaps(emblaApi.scrollSnapList());

    // Function to update the selected index
    const onSelect = () => {
      setCurrentIndex(emblaApi.selectedScrollSnap());
    };

    // Check for user drag interaction
    const onPointerDown = () => {
      handleUserInteraction();
    };

    // Initial call to set values
    onSelect();

    // Set up Embla event listeners
    emblaApi.on("select", onSelect);
    emblaApi.on("pointerDown", onPointerDown);
    
    // Cleanup event listeners and timers
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("pointerDown", onPointerDown);
      
      if (interactionTimerRef.current !== null) {
        window.clearTimeout(interactionTimerRef.current);
      }
    };
  }, [emblaApi, handleUserInteraction]);

  // Custom function to scroll to previous slide
  const scrollPrev = React.useCallback(() => {
    if (!emblaApi) return;
    handleUserInteraction();
    emblaApi.scrollPrev();
  }, [emblaApi, handleUserInteraction]);

  // Custom function to scroll to next slide
  const scrollNext = React.useCallback(() => {
    if (!emblaApi) return;
    handleUserInteraction();
    emblaApi.scrollNext();
  }, [emblaApi, handleUserInteraction]);

  // Handler for dot navigation click
  const handleDotClick = React.useCallback((index: number) => {
    if (!emblaApi) return;
    handleUserInteraction();
    emblaApi.scrollTo(index);
  }, [emblaApi, handleUserInteraction]);

  // Handle mouse enter
  const handleMouseEnter = React.useCallback(() => {
    console.log('Mouse entered carousel');
    setIsHovering(true);
  }, []);

  // Handle mouse leave
  const handleMouseLeave = React.useCallback(() => {
    console.log('Mouse left carousel');
    setIsHovering(false);
  }, []);

  // Debug effect to log state changes during development
  React.useEffect(() => {
    console.log('Carousel state changed:', { 
      isHovering, 
      userInteracted, 
      currentIndex,
      autoplayIsPlaying: autoplayPlugin.current.isPlaying()
    });
  }, [isHovering, userInteracted, currentIndex]);

  return (
    <div className="relative w-full">
      {/* Gradient overlays */}
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#0f1115] to-transparent pointer-events-none z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#0f1115] to-transparent pointer-events-none z-10" />
      
      <div 
        className="w-full overflow-hidden relative"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Use the custom ref for direct API access */}
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex space-x-4">
            {products.map((product) => (
              <div
                key={product.product_id}
                className="flex-grow-0 flex-shrink-0 basis-1/2 sm:basis-1/3 lg:basis-1/4 min-w-0"
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>

        {/* Navigation controls with arrow icons */}
        <button 
          onClick={scrollPrev}
          className="hidden md:flex items-center justify-center absolute top-1/2 left-2 sm:left-[-3rem] transform -translate-y-1/2 bg-[#5865f2] text-white rounded-full p-3 transition-colors duration-300 hover:bg-[#4752c4] z-20"
          aria-label="Previous slide"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button 
          onClick={scrollNext}
          className="hidden md:flex items-center justify-center absolute top-1/2 right-2 sm:right-[-3rem] transform -translate-y-1/2 bg-[#5865f2] text-white rounded-full p-3 transition-colors duration-300 hover:bg-[#4752c4] z-20"
          aria-label="Next slide"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
      
      {/* Slide indicator dots */}
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