// src/pages/HomePage/Youtube/EnhancedYouTubeCache.tsx
import React, { useEffect, useRef, useState } from 'react';
import { heroSlidesConfig } from './heroCarouselConfig';
import { extractVideoId, extractTimeParams } from './YouTubeUtils';

interface EnhancedYouTubeCacheProps {
  currentIndex: number;
  onSlidePreloaded?: (index: number) => void;
  preloadAll?: boolean;
  preloadDistance?: number;
}

/**
 * Enhanced YouTube Cache Component
 * 
 * This component intelligently pre-caches YouTube videos for a carousel with the following improvements:
 * 1. Dynamically adjusts caching priority based on current slide
 * 2. Uses a worker queue approach to load multiple videos in parallel (with throttling)
 * 3. Reports back loading status to parent component
 * 4. Provides both adjacent-slide and all-slides caching strategies
 */
const EnhancedYouTubeCache: React.FC<EnhancedYouTubeCacheProps> = ({
  currentIndex,
  onSlidePreloaded,
  preloadAll = true,
  preloadDistance = 2,
}) => {
  // Track loaded video IDs to avoid duplicate loading
  const loadedVideosRef = useRef<Set<string>>(new Set());
  // Track currently loading videos to manage concurrency
  const loadingVideosRef = useRef<Set<string>>(new Set());
  // Track iframes for cleanup
  const iframeRefs = useRef<HTMLIFrameElement[]>([]);
  // Maximum concurrent loading videos
  const maxConcurrentLoads = 2;
  // Track initialization
  const [initialized, setInitialized] = useState(false);
  
  // Filter for YouTube slides only
  const youtubeSlides = heroSlidesConfig
    .map((slide, index) => ({ slide, index }))
    .filter(({ slide }) => slide.mediaType === 'youtube');
  
  // Create worker queue for loading videos
  const loadQueue = useRef<Array<{ videoId: string, index: number }>>([]);
  
  // Calculate loading priority based on current index
  useEffect(() => {
    if (!initialized) return;
    
    // Clear current queue
    loadQueue.current = [];
    
    // Determine slides to preload based on strategy
    let slidesToPreload: number[] = [];
    
    if (preloadAll) {
      // All slides strategy - start with adjacent, then load the rest
      const adjacentSlides = getAdjacentSlides(currentIndex, preloadDistance);
      const remainingSlides = Array.from(Array(heroSlidesConfig.length).keys())
        .filter(i => !adjacentSlides.includes(i) && i !== currentIndex);
      
      slidesToPreload = [...adjacentSlides, ...remainingSlides];
    } else {
      // Adjacent-only strategy
      slidesToPreload = getAdjacentSlides(currentIndex, preloadDistance);
    }
    
    // Filter to YouTube slides and not already loaded
    const slidesToQueue = slidesToPreload
      .map(index => {
        const slideInfo = youtubeSlides.find(slide => slide.index === index);
        if (!slideInfo) return null;
        
        const videoId = extractVideoId(slideInfo.slide.mediaUrl);
        if (!videoId || loadedVideosRef.current.has(videoId)) return null;
        
        return { videoId, index: slideInfo.index };
      })
      .filter((item): item is { videoId: string, index: number } => item !== null);
    
    // Update queue
    loadQueue.current = slidesToQueue;
    
    // Trigger processing
    processQueue();
  }, [currentIndex, initialized, preloadAll, preloadDistance]);
  
  // Initialize with a slight delay to prioritize initial render
  useEffect(() => {
    const initTimer = setTimeout(() => {
      setInitialized(true);
    }, 1500);
    
    return () => clearTimeout(initTimer);
  }, []);
  
  // Get adjacent slide indices with wrapping
  const getAdjacentSlides = (index: number, distance: number): number[] => {
    const result: number[] = [];
    const totalSlides = heroSlidesConfig.length;
    
    for (let i = 1; i <= distance; i++) {
      // Next slides
      result.push((index + i) % totalSlides);
      // Previous slides
      result.push((index - i + totalSlides) % totalSlides);
    }
    
    return result;
  };
  
  // Process the loading queue with throttling
  const processQueue = () => {
    if (!loadQueue.current.length) return;
    
    // Check if we can load more videos
    if (loadingVideosRef.current.size >= maxConcurrentLoads) return;
    
    // Get next item from queue
    const nextItem = loadQueue.current.shift();
    if (!nextItem) return;
    
    const { videoId, index } = nextItem;
    
    // Skip if already loading or loaded
    if (loadingVideosRef.current.has(videoId) || loadedVideosRef.current.has(videoId)) {
      // Continue processing queue
      processQueue();
      return;
    }
    
    // Mark as loading
    loadingVideosRef.current.add(videoId);
    
    // Create preload iframe
    preloadYouTubeVideo(videoId, index);
  };
  
  // Preload a YouTube video
  const preloadYouTubeVideo = (videoId: string, index: number) => {
    const slideInfo = youtubeSlides.find(slide => slide.index === index);
    if (!slideInfo) {
      // Mark as done to prevent retries
      loadingVideosRef.current.delete(videoId);
      processQueue();
      return;
    }
    
    // Create iframe for preloading
    const iframe = document.createElement('iframe');
    
    // Set up hidden iframe
    iframe.style.position = 'absolute';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.opacity = '0.01';
    iframe.style.pointerEvents = 'none';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.setAttribute('tabindex', '-1');
    iframe.title = 'YouTube video preloader';
    
    // Create player vars
    const playerVars = new URLSearchParams({
      controls: '0',
      autoplay: '0',
      mute: '1',
      iv_load_policy: '3',
      modestbranding: '1',
      playsinline: '1',
      rel: '0',
      showinfo: '0',
      fs: '0',
      disablekb: '1',
      origin: typeof window !== 'undefined' ? window.location.origin : '',
      enablejsapi: '1',
    });
    
    // Add time parameters if present
    const { startTime, endTime } = extractTimeParams(slideInfo.slide.mediaUrl);
    if (startTime > 0) playerVars.set('start', startTime.toString());
    if (endTime > startTime) playerVars.set('end', endTime.toString());
    
    // Set iframe source
    iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?${playerVars.toString()}`;
    
    // Handle load events
    iframe.onload = () => {
      // Mark as loaded
      loadedVideosRef.current.add(videoId);
      loadingVideosRef.current.delete(videoId);
      
      // Notify parent
      if (onSlidePreloaded) {
        onSlidePreloaded(index);
      }
      
      // Continue processing queue
      setTimeout(processQueue, 100);
    };
    
    // Handle errors
    iframe.onerror = () => {
      loadingVideosRef.current.delete(videoId);
      setTimeout(processQueue, 100);
    };
    
    // Add iframe to document
    document.body.appendChild(iframe);
    iframeRefs.current.push(iframe);
    
    // Set a timeout for videos that fail to load
    setTimeout(() => {
      if (loadingVideosRef.current.has(videoId)) {
        loadingVideosRef.current.delete(videoId);
        processQueue();
      }
    }, 10000); // 10-second timeout
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Remove all iframes
      iframeRefs.current.forEach(iframe => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      });
    };
  }, []);
  
  // This is a utility component that doesn't render anything visible
  return null;
};

export default EnhancedYouTubeCache;