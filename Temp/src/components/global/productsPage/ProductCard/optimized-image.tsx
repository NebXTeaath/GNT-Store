// src/pages/ProductCard/optimized-image.tsx
import { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";

// Reverted Props: Expect a full image URL via 'src'
interface OptimizedImageProps {
  src: string | null | undefined; // Expects the full URL or null/undefined
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  placeholder?: string; // Default placeholder if src is null/undefined or fails
  fetchPriority?: 'high' | 'low' | 'auto';
  loading?: 'lazy' | 'eager';
  // sizes prop can be re-added if your URLs/CDN support responsive images via srcset
  // sizes?: string; 
  isAboveTheFold?: boolean;
}

// Removed buildImageUrl function - no longer constructing URLs here

export function OptimizedImage({
  src, // Use the src prop directly
  alt,
  width = 400, // Default render width
  height = 400, // Default render height
  className,
  placeholder = "/placeholder.svg", // Default placeholder path
  fetchPriority = 'auto',
  loading = 'lazy',
  // sizes, // Re-add if using srcset
  isAboveTheFold = false,
}: OptimizedImageProps) {
  
  // Determine the initial source, using placeholder if src is absent
  const initialSrc = src || placeholder;
  
  const [imgSrc, setImgSrc] = useState<string>(initialSrc);
  const [isLoaded, setIsLoaded] = useState(false);

  // Update imgSrc if the src prop changes
  useEffect(() => {
    const newSrc = src || placeholder;
    // Only update state if the calculated source actually changes
    if (newSrc !== imgSrc) {
      setImgSrc(newSrc);
      setIsLoaded(false); // Reset loaded state when src changes
    }
  }, [src, placeholder, imgSrc]); // Added imgSrc to dependency to avoid unnecessary updates
  
  // Set proper loading and priority attributes for above-the-fold images
  const [effectiveLoading, setEffectiveLoading] = useState(loading);
  const [effectivePriority, setEffectivePriority] = useState(fetchPriority);

  useEffect(() => {
    if (isAboveTheFold) {
      setEffectiveLoading('eager');
      setEffectivePriority('high');
    } else {
      // Revert to default props if not above fold or prop changes
      setEffectiveLoading(loading); 
      setEffectivePriority(fetchPriority);
    }
  }, [isAboveTheFold, loading, fetchPriority]);

  // NOTE: srcSet generation is removed as we are not constructing URLs with size variants.
  // If your 'src' URLs point to an image service that supports resizing via params, 
  // you could potentially rebuild srcSet logic here based on the provided 'src'.
  // const srcSet = undefined; // Example: No srcSet by default now
  
  return (
    <>
      {/* Placeholder shown while loading or if src is invalid/missing */}
      {!isLoaded && (
        <div 
          className={cn(
            "bg-[#2a2d36] animate-pulse", // Basic pulse placeholder
            className // Apply same layout classes as image
          )} 
          style={{ 
             // Use explicit width/height for the placeholder div based on props
             width: width ? `${width}px` : undefined, 
             height: height ? `${height}px` : undefined,
             aspectRatio: !width && !height ? '1 / 1' : undefined // Default aspect ratio if no w/h
           }} 
         />
      )}
      
      {/* The actual image */}
      <img
        key={imgSrc} // Helps React detect changes when src updates
        src={imgSrc} // Use the state variable (which defaults to placeholder if src is null)
        // srcSet={srcSet} // Add back if you implement responsive logic
        // sizes={sizes} // Add back if you implement responsive logic
        alt={alt}
        width={width}
        height={height}
        loading={effectiveLoading}
        fetchPriority={effectivePriority}
        decoding="async"
        className={cn(
          className,
          // Image starts hidden and fades in
          !isLoaded && "opacity-0", 
          isLoaded && "opacity-100 transition-opacity duration-300"
        )}
        onLoad={() => {
           // Only set loaded if the image that successfully loaded wasn't the placeholder
           // (unless the placeholder was the *intended* src from the start)
           if (imgSrc !== placeholder || src === placeholder) {
             setIsLoaded(true);
           }
        }}
        onError={() => {
          // console.error(`Failed to load image: ${imgSrc}. Falling back to placeholder.`);
          // If the primary src fails, explicitly set to placeholder
          // Prevent infinite loop if placeholder itself fails by checking imgSrc !== placeholder
          if (imgSrc !== placeholder) { 
              setImgSrc(placeholder);
          }
          // Mark as loaded *after* setting placeholder to ensure it's displayed
          setIsLoaded(true); 
        }}
        style={{
            // Ensure image respects container even if width/height props are large
            maxWidth: '100%',
            maxHeight: '100%',
            // objectFit is often set via className, but can be a style fallback
            objectFit: 'cover', // Or 'contain' depending on need - usually set by className though
        }}
      />
    </>
  );
}