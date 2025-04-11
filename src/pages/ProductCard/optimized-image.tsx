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
    // If already using the R2 image proxy, add size parameters
    if (imageUrl.includes('r2-image-proxy')) {
      const url = new URL(imageUrl);
      url.searchParams.set('width', width.toString());
      url.searchParams.set('quality', '80');
      return url.toString();
    }
    
    // For normal images, route through the image proxy
    return `https://r2-image-proxy.frankfrankenstain.workers.dev/optimize?url=${encodeURIComponent(imageUrl)}&width=${width}&quality=80`;
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