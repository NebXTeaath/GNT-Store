// src\pages\HomePage\heroCarousel.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { heroSlidesConfig, HeroSlide } from "./heroCarouselConfig";
import YouTubeSlide from "./YouTubeSlide";
import EnhancedYouTubeCache from "./EnhancedYouTubeCache";

export const HeroCarousel: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [mouseStart, setMouseStart] = useState(0);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [loadedSlides, setLoadedSlides] = useState<Record<number, boolean>>({});
  const carouselRef = useRef<HTMLDivElement>(null);
  const autoplayInterval = 8000; // 8 seconds between slides
  const transitionDuration = 700; // Match this to CSS transition duration
  const isTransitioning = useRef(false);

  // Calculate next and previous slide indices for rendering
  const nextSlideIndex = (currentSlide + 1) % heroSlidesConfig.length;
  const prevSlideIndex = (currentSlide - 1 + heroSlidesConfig.length) % heroSlidesConfig.length;

  // Mark a slide as loaded
  const handleSlideLoaded = useCallback((index: number) => {
    setLoadedSlides(prev => ({...prev, [index]: true}));
  }, []);

  // Handle slide preloaded notification from caching component
  const handleSlidePreloaded = useCallback((index: number) => {
    setLoadedSlides(prev => ({...prev, [index]: true}));
  }, []);

  // Initialize - preconnect to YouTube domains for faster loading
  useEffect(() => {
    if (typeof document !== 'undefined') {
      // Create preconnect links for faster initial loading
      const domains = ['www.youtube.com', 'www.youtube-nocookie.com', 'i.ytimg.com'];
      
      domains.forEach(domain => {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = `https://${domain}`;
        document.head.appendChild(link);
        
        // Also add DNS prefetch as fallback
        const dnsLink = document.createElement('link');
        dnsLink.rel = 'dns-prefetch';
        dnsLink.href = `https://${domain}`;
        document.head.appendChild(dnsLink);
      });
    }
  }, []);

  // Auto-advance slides when isPlaying is true and no transition is in progress
  useEffect(() => {
    if (!isPlaying) return;
    
    const timer = setInterval(() => {
      if (!isTransitioning.current) {
        setCurrentSlide((prev) => (prev + 1) % heroSlidesConfig.length);
      }
    }, autoplayInterval);
    
    return () => clearInterval(timer);
  }, [isPlaying]);

  // Handle slide transitions
  useEffect(() => {
    // Mark that a transition has started
    isTransitioning.current = true;
    
    // After transition completes, mark it as done
    const transitionTimer = setTimeout(() => {
      isTransitioning.current = false;
    }, transitionDuration);
    
    return () => clearTimeout(transitionTimer);
  }, [currentSlide]);

  // Pause autoplay when user interacts with carousel
  const handleManualNavigation = (index: number) => {
    if (isTransitioning.current) return; // Prevent rapid navigation during transitions
    
    setCurrentSlide(index);
    setIsPlaying(false);
    
    // Resume autoplay after 15 seconds of inactivity
    const resumeTimer = setTimeout(() => setIsPlaying(true), 15000);
    return () => clearTimeout(resumeTimer);
  };

  const nextSlide = () => {
    if (isTransitioning.current) return; // Prevent rapid navigation
    handleManualNavigation((currentSlide + 1) % heroSlidesConfig.length);
  };

  const prevSlide = () => {
    if (isTransitioning.current) return; // Prevent rapid navigation
    handleManualNavigation(
      (currentSlide - 1 + heroSlidesConfig.length) % heroSlidesConfig.length
    );
  };

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
    setIsPlaying(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd || isTransitioning.current) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    
    if (isLeftSwipe) {
      nextSlide();
    } else if (isRightSwipe) {
      prevSlide();
    }
    
    // Reset values
    setTouchStart(0);
    setTouchEnd(0);
  };

  // Mouse handlers for swipe
  const handleMouseDown = (e: React.MouseEvent) => {
    setMouseStart(e.clientX);
    setIsMouseDown(true);
    setIsPlaying(false);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isMouseDown || isTransitioning.current) return;

    const distance = mouseStart - e.clientX;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    
    if (isLeftSwipe) {
      nextSlide();
    } else if (isRightSwipe) {
      prevSlide();
    }
    
    setIsMouseDown(false);
  };

  const handleMouseLeave = () => {
    setIsMouseDown(false);
  };

  // Determine if a slide should be rendered
  const shouldRenderSlide = (index: number) => {
    return index === currentSlide || index === nextSlideIndex || index === prevSlideIndex;
  };

  // Render media based on type
  const renderSlideMedia = (slide: HeroSlide, index: number) => {
    // Skip rendering if it's not current, next, or previous slide
    if (!shouldRenderSlide(index)) {
      return null;
    }
    
    const isActive = index === currentSlide;
    const isPrecaching = index === nextSlideIndex;
    
    switch (slide.mediaType) {
      case "youtube":
        return (
          <YouTubeSlide 
            mediaUrl={slide.mediaUrl} 
            altText={slide.altText} 
            linkUrl={slide.linkUrl} 
            isActive={isActive}
            isPrecaching={isPrecaching}
            onLoad={() => handleSlideLoaded(index)}
          />
        );
      case "video":
        return (
          <div className={`absolute inset-0 w-full h-full overflow-hidden transition-opacity duration-700 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
            <video
              src={slide.mediaUrl}
              autoPlay
              muted
              loop
              playsInline
              className="absolute w-[105%] h-[105%] object-cover top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              onLoadedData={() => handleSlideLoaded(index)}
            >
              <source src={slide.mediaUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        );
      case "gif":
      case "webp":
      case "image":
      default:
        return (
          <div className={`absolute inset-0 w-full h-full overflow-hidden transition-opacity duration-700 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
            <img
              src={slide.mediaUrl}
              alt={slide.altText}
              className="absolute w-[105%] h-[105%] object-cover top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              onLoad={() => handleSlideLoaded(index)}
            />
          </div>
        );
    }
  };

  return (
    <section className="relative w-full bg-black">
      {/* Enhanced YouTube Cache Component */}
      <EnhancedYouTubeCache 
        currentIndex={currentSlide}
        onSlidePreloaded={handleSlidePreloaded}
        preloadAll={true}
        preloadDistance={2}
      />
      
      {/* Carousel container */}
      <div 
        ref={carouselRef}
        className="relative overflow-hidden h-96 md:h-[500px] lg:h-[600px]"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {/* Slides */}
        <div className="relative h-full">
          {heroSlidesConfig.map((slide, index) => (
            <div
              key={slide.id}
              className={`absolute inset-0 ${index === currentSlide ? 'z-10' : 'z-0'}`}
              aria-hidden={index !== currentSlide}
            >
              {/* For non-YouTube slides, wrap in a link */}
              {slide.mediaType !== "youtube" ? (
                <a 
                  href={slide.linkUrl} 
                  className="block w-full h-full"
                  aria-label={slide.altText}
                  tabIndex={index === currentSlide ? 0 : -1}
                >
                  {renderSlideMedia(slide, index)}
                </a>
              ) : (
                // YouTube slides handle their own clicks
                renderSlideMedia(slide, index)
              )}
              
              {/* Overlay text - only visible when slide is active */}
              {index === currentSlide && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6 text-white z-20">
                    <h2 className="text-xl md:text-2xl font-bold text-right pb-4 pr-4">{slide.altText}</h2>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Navigation arrows */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-30 bg-black/50 hover:bg-black/70 p-2 rounded-full text-white transition-colors duration-300"
          aria-label="Previous slide"
          disabled={isTransitioning.current}
        >
          <ChevronLeft size={24} />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-30 bg-black/50 hover:bg-black/70 p-2 rounded-full text-white transition-colors duration-300"
          aria-label="Next slide"
          disabled={isTransitioning.current}
        >
          <ChevronRight size={24} />
        </button>

        {/* Slide indicators with loading progress */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex space-x-2">
          {heroSlidesConfig.map((_, index) => (
            <button
              key={index}
              onClick={() => handleManualNavigation(index)}
              className={`h-3 rounded-full transition-all duration-300 ${
                index === currentSlide 
                  ? "bg-white w-6" 
                  : loadedSlides[index] 
                    ? "bg-white/50 w-3" 
                    : "bg-white/30 w-3"
              }`}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === currentSlide ? "true" : "false"}
              disabled={isTransitioning.current}
            />
          ))}
        </div>
      </div>
    </section>
  );
};