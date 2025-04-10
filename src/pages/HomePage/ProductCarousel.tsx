// src/pages/HomePage/ProductCarousel.tsx
import * as React from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ProductCard } from "@/pages/searchPage/search/ProductCard";
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
  // ... (Keep all the hooks and effects logic the same as before) ...
  const autoplayPlugin = React.useRef(
    Autoplay({
      delay: autoplayDelay,
      stopOnInteraction: false,
      playOnInit: true,
    })
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
    [autoplayPlugin.current]
  );
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [scrollSnaps, setScrollSnaps] = React.useState<number[]>([]);

  // --- Autoplay Control Logic ---
  React.useEffect(() => {
    if (!emblaApi) return;
    const manageAutoplay = () => {
      const shouldAutoplay = !isHovering && !userInteracted;
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
  }, [emblaApi, isHovering, userInteracted]);

  // --- User Interaction Handling ---
 const handleUserInteraction = React.useCallback(() => {
    if (autoplayPlugin.current.isPlaying()) {
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
        const shouldAutoplay = !isHovering && !userInteracted;
        if (shouldAutoplay && !autoplayPlugin.current.isPlaying()) {
          autoplayPlugin.current.play();
        }
      }
    }, 5000);
  }, [emblaApi, isHovering]); // Ensure dependencies are correct

  // --- Embla Event Listeners Setup ---
  React.useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    const onSelect = () => setCurrentIndex(emblaApi.selectedScrollSnap());
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
    // Optional: Resume autoplay immediately if not interacted with recently
    if (!userInteracted && !autoplayPlugin.current.isPlaying()) {
      autoplayPlugin.current.play();
    }
  }, [userInteracted]); // Ensure dependencies are correct

  // ... (Keep debug effect if needed) ...

  return (
    // Add 'group' and hover handlers to the OUTERMOST div
    <div
      className="relative w-full group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Gradient overlays remain direct children of the outer relative container */}
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#0f1115] to-transparent pointer-events-none z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#0f1115] to-transparent pointer-events-none z-10" />

      {/* Inner container for Embla viewport (no group or hover handlers here anymore) */}
      <div className="w-full overflow-hidden">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {products.map((product) => (
              <div
                key={product.slug}
                className="flex-grow-0 flex-shrink-0 basis-1/2 sm:basis-1/3 lg:basis-1/4 min-w-0 px-2" // Keep padding for spacing between cards
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation Controls are now direct children of the OUTERMOST div */}
      {/* Positioned outside the main content area on medium screens and up */}
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


      {/* Slide indicator dots (position remains relative to the outermost div) */}
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