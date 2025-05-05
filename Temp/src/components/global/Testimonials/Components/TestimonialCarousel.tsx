// src/components/global/Testimonials/Components/TestimonialCarousel.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay"; // Make sure Autoplay is imported
import { Testimonial } from '../testimonialData';
import TestimonialCard from './TestimonialCard';
import { cn } from '@/lib/utils';

interface TestimonialCarouselProps {
  testimonials: Testimonial[];
  title: string;
  subtitle?: string;
  autoplayDelay?: number;
  className?: string;
  slideClassName?: string;
}

const TestimonialCarousel: React.FC<TestimonialCarouselProps> = ({
  testimonials,
  title,
  subtitle,
  autoplayDelay = 5000, // Use the prop
  className = "",
  slideClassName = ""
}) => {
  // --- Embla Carousel Setup ---
  const autoplayPlugin = useRef(
    Autoplay({
      delay: autoplayDelay,
      stopOnInteraction: false, // Important: Autoplay plugin should NOT stop permanently on interaction
      stopOnMouseEnter: false,  // Important: We handle hover pause manually
      playOnInit: true,
    })
  );

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      align: "start",
    },
    [autoplayPlugin.current] // Include the plugin
  );

  // --- State Management ---
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
  const [isHovering, setIsHovering] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false); // Tracks if user *recently* interacted
  const interactionTimerRef = useRef<number | null>(null);
  const resumeTimeoutRef = useRef<number | null>(null); // Separate timeout for resuming after interaction

  // --- Effect for Managing Autoplay based on State ---
  useEffect(() => {
    // Guards to ensure API and plugin are ready
    if (!emblaApi || !autoplayPlugin.current) {
        // console.log("Testimonial Autoplay Effect: API or Plugin not ready.");
        return;
    }

    const shouldBePlaying = !isHovering && !userInteracted;
    const currentlyPlaying = autoplayPlugin.current.isPlaying();

    // console.log(`Testimonial Autoplay Effect: shouldBePlaying=${shouldBePlaying}, currentlyPlaying=${currentlyPlaying}, isHovering=${isHovering}, userInteracted=${userInteracted}`);

    if (shouldBePlaying && !currentlyPlaying) {
        console.log("Testimonial Autoplay Effect: Conditions met, calling play().");
        // Use a slight delay before playing to avoid potential race conditions on state updates
        if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
        resumeTimeoutRef.current = window.setTimeout(() => {
             if (!isHovering && !userInteracted) { // Re-check conditions inside timeout
                 console.log("Testimonial Autoplay Effect: Playing after delay.");
                 autoplayPlugin.current.play();
             }
        }, 150); // Small delay (adjust if needed)

    } else if (!shouldBePlaying && currentlyPlaying) {
        console.log("Testimonial Autoplay Effect: Conditions not met, calling stop().");
        // Clear any pending resume timeout if we need to stop
        if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
        autoplayPlugin.current.stop();
    }

    // Cleanup the resume timer on unmount or dependency change
    return () => {
        if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    }

  }, [emblaApi, isHovering, userInteracted]); // Runs when these states change

  // --- Handler for User Interaction ---
  const handleUserInteraction = useCallback(() => {
    if (!emblaApi || !autoplayPlugin.current) return;

    console.log("Testimonial: User Interaction Detected (Pointer Down/Dot Click)");
    setUserInteracted(true); // Mark as recently interacted

    // Clear any existing timer
    if (interactionTimerRef.current !== null) {
      window.clearTimeout(interactionTimerRef.current);
    }
    // Set a timer to reset the interaction flag after a delay
    interactionTimerRef.current = window.setTimeout(() => {
      console.log("Testimonial: Interaction timeout finished, resetting userInteracted flag.");
      setUserInteracted(false); // Allow autoplay to potentially resume via the useEffect
      interactionTimerRef.current = null;
    }, autoplayDelay + 1000); // Wait a bit longer than the autoplay delay before allowing restart

  }, [emblaApi, autoplayDelay]); // Depend on autoplayDelay

  // --- Embla Event Listeners Setup ---
  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      setCurrentIndex(emblaApi.selectedScrollSnap());
    };

    const onPointerDown = () => {
      handleUserInteraction(); // Trigger interaction logic on pointer down
    };

     const onInitOrReinit = () => {
        setScrollSnaps(emblaApi.scrollSnapList());
        onSelect(); // Update index on init/reinit
    }

    onInitOrReinit();

    emblaApi.on("select", onSelect);
    emblaApi.on("pointerDown", onPointerDown); // Listen for drag start/interaction
    emblaApi.on("reInit", onInitOrReinit);

    // No need to listen to 'settle' specifically for autoplay resume here

    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("pointerDown", onPointerDown);
      emblaApi.off("reInit", onInitOrReinit);
      // Clear the interaction timer on unmount
      if (interactionTimerRef.current !== null) {
        window.clearTimeout(interactionTimerRef.current);
      }
    };
  }, [emblaApi, handleUserInteraction]); // Include handleUserInteraction

  // --- Dot Navigation ---
  const handleDotClick = useCallback(
    (index: number) => {
      if (!emblaApi) return;
      handleUserInteraction(); // Register dot click as interaction
      emblaApi.scrollTo(index);
    },
    [emblaApi, handleUserInteraction]
  );

  // --- Hover Handlers ---
  const handleMouseEnter = useCallback(() => {
    // console.log("Testimonial: Mouse Enter");
    setIsHovering(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    // console.log("Testimonial: Mouse Leave");
    setIsHovering(false);
    // Autoplay resume is handled by the central useEffect reacting to isHovering change
  }, []);

  return (
    <div
      className={cn("w-full relative", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          {subtitle && <p className="text-gray-400 mt-1">{subtitle}</p>}
        </div>
      </div>

      {/* Embla Viewport */}
      <div className="overflow-hidden" ref={emblaRef}>
        {/* Embla Container */}
        <div className="flex -ml-4"> {/* Negative margin for gap */}
          {testimonials.map((testimonial) => (
            // Embla Slide Item
            <div
              key={testimonial.id}
              className={cn(
                "min-w-0 shrink-0 grow-0 basis-full md:basis-1/2 lg:basis-1/3 pl-4", // Basis classes + padding for gap
                slideClassName
              )}
            >
              <TestimonialCard testimonial={testimonial} className="h-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Dots indicator */}
      <div className="flex justify-center mt-6 space-x-2">
        {scrollSnaps.map((_, index) => (
          <button
            key={index}
            onClick={() => handleDotClick(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === currentIndex
                ? 'w-6 bg-indigo-500'
                : 'w-2 bg-gray-600 hover:bg-gray-400'
            }`}
            aria-label={`Go to slide ${index + 1}`}
            aria-current={index === currentIndex ? "true" : "false"}
          />
        ))}
      </div>
    </div>
  );
};

export default TestimonialCarousel;