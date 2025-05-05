import React, { useState, useEffect, useCallback, useRef } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

export interface CarouselItem {
  image: string;
  title: string;
  price?: number;
  discount_price?: number;
}

interface AuthLoadingCarouselProps {
  items: CarouselItem[];
}

export const AuthLoadingCarousel: React.FC<AuthLoadingCarouselProps> = ({ items }) => {
  const autoplayOptions = {
    delay: 1000,
    stopOnInteraction: true,
    rootNode: (emblaRoot: any) => emblaRoot.parentElement,
  };

  // Initialize the carousel with autoplay plugin and draggable option enabled
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { 
      loop: true, 
      skipSnaps: false,
      dragFree: true // Enable free-form dragging
    },
    [Autoplay(autoplayOptions)]
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const autoplayRef = useRef<any>(null);

  const updateCurrentIndex = useCallback(() => {
    if (!emblaApi) return;
    setCurrentIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;

    emblaApi.on('select', updateCurrentIndex);
    updateCurrentIndex();

    return () => {
      emblaApi.off('select', updateCurrentIndex);
    };
  }, [emblaApi, updateCurrentIndex]);

  // Auto-restart autoplay after user interaction
  useEffect(() => {
    if (!emblaApi) return;

    const onPointerDown = () => {
      if (autoplayRef.current) {
        clearTimeout(autoplayRef.current);
      }
    };

    const onPointerUp = () => {
      autoplayRef.current = setTimeout(() => {
        const autoplay = emblaApi.plugins().autoplay;
        if (autoplay) {
          autoplay.reset();
          autoplay.play();
        }
      }, 500); // Resume after 500ms of no interaction
    };

    emblaApi.on('pointerDown', onPointerDown);
    emblaApi.on('pointerUp', onPointerUp);

    return () => {
      emblaApi.off('pointerDown', onPointerDown);
      emblaApi.off('pointerUp', onPointerUp);
      if (autoplayRef.current) {
        clearTimeout(autoplayRef.current);
      }
    };
  }, [emblaApi]);

  if (!items.length) return null;

  return (
    <div className="w-full max-w-md mx-auto overflow-hidden relative">
      <h3 className="text-lg font-medium text-center mb-2 text-white">
        Featured Products
      </h3>
      
      <div className="relative rounded-md overflow-hidden cursor-grab" ref={emblaRef}>
        <div className="flex">
          {items.map((item, index) => (
            <div 
              key={`${item.title}-${index}`}
              className="flex-[0_0_100%] min-w-0 relative"
            >
              <div className="relative w-full flex flex-col">
                <div className="flex-1 relative">
                  {item.image ? (
                    <div className="w-full">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full object-contain max-h-64"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-64 bg-gray-800 flex items-center justify-center">
                      <span className="text-gray-400">No image</span>
                    </div>
                  )}
                  
                  {/* Price tag */}
                  {(item.price !== undefined || item.discount_price !== undefined) && (
                    <div className="absolute bottom-2 right-2 bg-black/70 px-3 py-1 rounded-md">
                      {item.discount_price !== undefined && item.discount_price < (item.price || 0) ? (
                        <div className="flex gap-2 items-center">
                          <span className="text-gray-400 line-through text-xs">
                            ${item.price?.toFixed(2)}
                          </span>
                          <span className="text-[#5865f2] font-bold">
                            ${item.discount_price.toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-white font-bold">
                          ${item.price?.toFixed(2)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="bg-gray-900/80 p-3">
                  <p className="text-white text-center font-medium truncate">
                    {item.title}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};