// src/components/global/cached-image.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface CachedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> {
  src: string | null | undefined;
  alt: string;
  queryKeySuffix?: string;
  className?: string; // For the root div wrapper
  imgClassName?: string; // For the actual <img> tag
  skeletonClassName?: string; // For the Skeleton component
  placeholderSrc?: string;
}

const fetchImage = async (src: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(src);
    img.onerror = (_event, _source, _lineno, _colno, error) => reject(error || new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
};

export const CachedImage: React.FC<CachedImageProps> = ({
  src,
  alt,
  queryKeySuffix = '',
  className,
  imgClassName,
  skeletonClassName,
  placeholderSrc = "/placeholder.svg",
  ...rest
}) => {
  const effectiveSrc = src || placeholderSrc;
  const imageQueryKey = ['cachedImage', effectiveSrc, queryKeySuffix];
  const shouldFetch = !!src && src !== placeholderSrc;

  const { data: loadedSrc, isLoading, isError } = useQuery<string, Error>({
    queryKey: imageQueryKey,
    queryFn: () => fetchImage(effectiveSrc),
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    enabled: shouldFetch,
    retry: (failureCount, error: any) => {
      if (error?.message?.includes('Failed to load image') && failureCount < 1) {
        return true;
      }
      return false;
    },
  });

  if (isLoading && shouldFetch) {
    return (
      <div className={cn(className)}>
        <Skeleton className={cn("w-full h-full", skeletonClassName, imgClassName)} />
      </div>
    );
  }

  if ((isError && shouldFetch) || !shouldFetch) {
    return (
      <div className={cn(className)}>
        <img src={placeholderSrc} alt={alt} className={cn(imgClassName)} {...rest} />
      </div>
    );
  }

  return (
    <div className={cn(className)}>
      <img src={loadedSrc || placeholderSrc} alt={alt} className={cn(imgClassName)} {...rest} />
    </div>
  );
};