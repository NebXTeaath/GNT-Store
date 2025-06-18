import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Autoplay from "embla-carousel-autoplay";
import { Carousel, CarouselApi, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Button } from '@/components/ui/button';

// Data for the experimental banners, now with unique IDs and navigation links.
const bannerData = [
  {
    id: 'game-load-service',
    src: 'http://images.gnt-store.shop/banner-images/GameLoad banner.webp',
    alt: 'Creative advertisement for games load service for gaming consoles.',
    linkUrl: '/game-load-service',
    loading: 'eager' as const,
    fetchPriority: 'high' as const,
  },
  {
    id: 'gaming-laptops',
    src: 'https://images.gnt-store.shop/banner-images/gaming laptop banner.webp',
    alt: 'Creative advertisement for a high-performance laptop.',
    linkUrl: '/Computers/Laptops?label=Gaming%20Laptop',
    loading: 'lazy' as const,
    fetchPriority: 'auto' as const,
  },
  {
    id: 'repair-service',
    src: 'https://images.gnt-store.shop/banner-images/repair laptop banner.webp',
    alt: 'Advertisement for professional PC repair services.',
    linkUrl: '/repair-home',
    loading: 'lazy' as const,
    fetchPriority: 'auto' as const,
  }
];

/**
 * A carousel component to display a series of clickable, static banners
 * for an A/B test or experiment, replacing the original hero section.
 */
const ExperimentBanners: React.FC = () => {
  const [api, setApi] = React.useState<CarouselApi>();
  // --- START: Added state for dot indicators ---
  const [currentSlide, setCurrentSlide] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
  // --- END: Added state for dot indicators ---
  
  // Setup the autoplay plugin with your specified delay.
  const autoplayPlugin = useRef(
    Autoplay({ delay: 1800, stopOnInteraction: true, stopOnMouseEnter: true })
  );

  // Restart autoplay when the mouse leaves the carousel area.
  const handleMouseLeave = () => {
    autoplayPlugin.current.play();
  };

  // Restart autoplay after a touch interaction ends.
  useEffect(() => {
    if (!api) return;

    // --- START: Combined event listeners for API ---
    // Function to update the dot indicators
    const onSelect = () => {
      if (api) setCurrentSlide(api.selectedScrollSnap());
    };

    // Function to get the total number of slides for dots
    const onInit = () => {
      if (api) setScrollSnaps(api.scrollSnapList());
    };

    // Function to restart autoplay after touch
    const onPointerUp = () => {
      setTimeout(() => {
        autoplayPlugin.current.play();
      }, 500);
    };

    // Initial setup
    onInit();
    onSelect();

    // Add event listeners
    api.on("reInit", onInit);
    api.on("select", onSelect);
    api.on("pointerUp", onPointerUp);
    return () => {
      api.off("reInit", onInit);
      api.off("select", onSelect);
      api.off("pointerUp", onPointerUp);
    };
  }, [api]); // --- END: Combined event listeners for API ---

  const handleScrollDown = () => {
    const nextSection = document.getElementById('testimonials');
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // --- START: Handler for dot button clicks ---
  const onDotButtonClick = useCallback((index: number) => {
    if (!api) return;
    // Autoplay is stopped automatically by the `stopOnInteraction` option
    api.scrollTo(index);
  }, [api]);
  // --- END: Handler for dot button clicks ---

  return (
    <section 
      className="w-full bg-black relative"
      onMouseLeave={handleMouseLeave}
    >
      <Carousel
        setApi={setApi}
        plugins={[autoplayPlugin.current]}
        className="w-full relative group"
        opts={{
          loop: true,
        }}
      >
        <CarouselContent>
          {bannerData.map((banner) => (
            <CarouselItem key={banner.id}>
              <Link to={banner.linkUrl} className="block w-full h-auto cursor-pointer" aria-label={banner.alt}>
                <img
                  src={banner.src}
                  alt={banner.alt}
                  className="w-full h-auto object-cover"
                  width={2000}
                  height={800}
                  loading={banner.loading}
                  fetchPriority={banner.fetchPriority}
                  decoding="async"
                />
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>
        
        <CarouselPrevious className="hover:text-black absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 text-gray-300 border-none h-12 w-12 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#5865f2]/70" />
        <CarouselNext className="hover:text-black absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 text-gray-300 border-none h-12 w-12 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#5865f2]/70" />
      </Carousel>

      {/* --- START: Dot Indicators --- */}
      <div className="absolute bottom-2 md:bottom-4 left-1/2 -translate-x-1/2 z-10 flex space-x-2 pointer-events-auto">

        {scrollSnaps.map((_, index) => (
          <button
            key={index}
            onClick={() => onDotButtonClick(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === currentSlide
          ? "w-6 bg-amber-600"
          : "w-2 bg-amber-600/50 hover:bg-amber-600"
      }`}
            aria-label={`Go to slide ${index + 1}`}
            aria-current={index === currentSlide ? "true" : "false"}
          />
        ))}
      </div>
      {/* --- END: Dot Indicators --- */}

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 hidden md:block">
        <Button
          variant="default" // Changed variant to ensure a solid background from your UI library
          onClick={handleScrollDown}
          className="rounded-full h-auto px-6 py-3 bg-black/40 text-white hover:bg-black/80 border border-white/20 backdrop-blur-sm animate-slow-bounce"
          aria-label="Scroll down to content"
        >
          <span className="text-xs font-semibold uppercase tracking-widest">
            ▼ Scroll down to explore ▼
          </span>
        </Button>
      </div>
    </section>
  );
};

export default ExperimentBanners;