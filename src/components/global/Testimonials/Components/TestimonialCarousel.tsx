
import React, { useState, useEffect, useRef } from 'react';
import { Testimonial } from '../testimonialData';
import TestimonialCard from './TestimonialCard';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
  autoplayDelay = 5000,
  className = "",
  slideClassName = ""
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const visibleSlidesCount = useWindowSize();
  
  // Reset timer whenever we manually change slides or when autoplay delay changes
  useEffect(() => {
    if (autoplayTimerRef.current) {
      clearTimeout(autoplayTimerRef.current);
    }
    
    if (isAutoPlaying) {
      autoplayTimerRef.current = setTimeout(() => {
        handleNext();
      }, autoplayDelay);
    }
    
    return () => {
      if (autoplayTimerRef.current) {
        clearTimeout(autoplayTimerRef.current);
      }
    };
  }, [currentIndex, autoplayDelay, isAutoPlaying]);

  function handlePrev() {
    setIsAutoPlaying(false);
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? Math.max(0, testimonials.length - visibleSlidesCount) : prevIndex - 1
    );
  }

  function handleNext() {
    setCurrentIndex((prevIndex) => 
      prevIndex >= Math.max(0, testimonials.length - visibleSlidesCount) ? 0 : prevIndex + 1
    );
  }

  // Handle testimonial hover - pause autoplay
  function handleMouseEnter() {
    setIsAutoPlaying(false);
    if (autoplayTimerRef.current) {
      clearTimeout(autoplayTimerRef.current);
    }
  }

  // Resume autoplay on mouse leave
  function handleMouseLeave() {
    setIsAutoPlaying(true);
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          {subtitle && <p className="text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handlePrev}
            variant="outline" 
            size="icon" 
            className="h-8 w-8 border-gray-700 bg-gray-800 hover:bg-gray-700 rounded-full p-1"
          >
            <ChevronLeft size={16} className="text-gray-300" />
          </Button>
          <Button 
            onClick={handleNext}
            variant="outline" 
            size="icon" 
            className="h-8 w-8 border-gray-700 bg-gray-800 hover:bg-gray-700 rounded-full p-1"
          >
            <ChevronRight size={16} className="text-gray-300" />
          </Button>
        </div>
      </div>

      <div 
        className="relative overflow-hidden"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div 
          className="flex transition-transform duration-500 ease-in-out gap-4 md:gap-6"
          style={{ transform: `translateX(-${currentIndex * (100 / visibleSlidesCount)}%)` }}
        >
          {testimonials.map((testimonial) => (
            <div 
              key={testimonial.id}
              className={`min-w-full md:min-w-[calc(50%-16px)] lg:min-w-[calc(33.333%-16px)] ${slideClassName}`}
            >
              <TestimonialCard testimonial={testimonial} />
            </div>
          ))}
        </div>
      </div>

      {/* Dots indicator */}
      <div className="flex justify-center mt-6 space-x-2">
        {Array.from({ length: Math.ceil(testimonials.length / visibleSlidesCount) }).map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setIsAutoPlaying(false);
              setCurrentIndex(index * visibleSlidesCount);
            }}
            className={`h-2 rounded-full transition-all ${
              index * visibleSlidesCount <= currentIndex && 
              currentIndex < (index + 1) * visibleSlidesCount
                ? 'w-6 bg-indigo-500'
                : 'w-2 bg-gray-600'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

// Hook to determine number of visible slides based on screen width
function useWindowSize() {
  const [visibleSlides, setVisibleSlides] = useState(1);
  
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 1024) {
        setVisibleSlides(3);
      } else if (window.innerWidth >= 768) {
        setVisibleSlides(2);
      } else {
        setVisibleSlides(1);
      }
    }
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return visibleSlides;
}

export default TestimonialCarousel;