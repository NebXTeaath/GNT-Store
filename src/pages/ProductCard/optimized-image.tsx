// src/pages/ProductCard/optimized-image.tsx
import { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";

interface OptimizedImageProps {
  src: string | null;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  placeholder?: string;
  fetchPriority?: 'high' | 'low' | 'auto';
  loading?: 'lazy' | 'eager';
  sizes?: string;
  isAboveTheFold?: boolean;
}

export function getOptimizedImageUrl(imageUrl: string | null, width = 400): string {
  if (!imageUrl) return "/placeholder.svg";
  
  try {
    // For images from the new domain (images.gnt-store.shop)
    if (imageUrl.includes('images.gnt-store.shop')) {
      // Parse the URL to extract the path components
      const url = new URL(imageUrl);
      const pathSegments = url.pathname.split('/');
      
      // Get the file name from the path
      const fileName = pathSegments[pathSegments.length - 1];
      
      // Extract the category path and product ID
      // The ID is the second-to-last path segment (UUID format)
      const productId = pathSegments[pathSegments.length - 2];
      // Category/product path is everything before the ID
      const categoryPath = pathSegments.slice(1, pathSegments.length - 2).join('/');
      
      // Construct the optimized image URL with size parameters
      return `https://images.gnt-store.shop/${categoryPath}/${productId}/${fileName}`;
    }
    
    
    // For any other images, use the original URL
    return imageUrl;
  } catch (e) {
    // If URL parsing fails, return the original URL
    return imageUrl;
  }
}

export function OptimizedImage({
  src,
  alt,
  width = 400,
  height = 400,
  className,
  placeholder = "/placeholder.svg",
  fetchPriority = 'auto',
  loading = 'lazy',
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  isAboveTheFold = false,
}: OptimizedImageProps) {
  const [, setImgSrc] = useState<string>(src || placeholder);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Set proper loading and priority attributes for above-the-fold images
  useEffect(() => {
    if (isAboveTheFold) {
      loading = 'eager';
      fetchPriority = 'high';
    }
  }, [isAboveTheFold]);

  // Generate srcSet for responsive images
  const srcSet = src ? `
    ${getOptimizedImageUrl(src, 200)} 200w,
    ${getOptimizedImageUrl(src, 400)} 400w,
    ${getOptimizedImageUrl(src, 600)} 600w
  ` : undefined;
  
  return (
    <>
      {/* Low quality placeholder */}
      {!isLoaded && (
        <div className={cn(
          "bg-[#2a2d36] animate-pulse",
          className
        )} style={{ width, height }} />
      )}
      
      <img
        src={getOptimizedImageUrl(src, width)}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding="async"
        className={cn(
          className,
          !isLoaded && "opacity-0",
          isLoaded && "opacity-100 transition-opacity duration-300"
        )}
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          setImgSrc(placeholder);
          setIsLoaded(true);
        }}
      />
    </>
  );
}