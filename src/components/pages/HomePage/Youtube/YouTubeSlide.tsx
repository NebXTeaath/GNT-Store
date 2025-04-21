import React, { useState, useRef, useEffect } from 'react';
import YouTube, { YouTubeProps, YouTubePlayer } from 'react-youtube';

// Extract the YouTube video ID from a URL
const extractVideoId = (url: string): string => {
  const regex = /(?:youtu\.be\/|v=|youtube\.com\/embed\/)([^?&]+)/;
  const match = url.match(regex);
  return match ? match[1] : '';
};

// Extract time parameters from URL
const extractTimeParams = (url: string) => {
  const queryString = url.split('?')[1] || '';
  const params = new URLSearchParams(queryString);
  
  return {
    startTime: params.get('start') ? parseInt(params.get('start')!, 10) : 0,
    endTime: params.get('end') ? parseInt(params.get('end')!, 10) : 0
  };
};

// Extract player parameters
const extractPlayerVars = (url: string) => {
  const { startTime } = extractTimeParams(url);
  const videoId = extractVideoId(url);
  
  return {
    autoplay: 0,
    controls: 0,
    modestbranding: 1,
    rel: 0,
    mute: 1, 
    loop: 1,
    playlist: videoId,
    playsinline: 1,
    fs: 0,
    showinfo: 0,
    iv_load_policy: 3,
    disablekb: 1,
    origin: window.location.origin,
    enablejsapi: 1,
    start: startTime,
    hl: 'en',
    cc_load_policy: 0,
  };
};

interface YouTubeSlideProps {
  mediaUrl: string;
  altText: string;
  linkUrl: string;
  isActive: boolean;
  isPrecaching: boolean;
  forceLazyLoad?: boolean;
  onLoad?: () => void;
}

interface VideoTimeRange {
  startTime: number;
  endTime: number;
}

const YouTubeSlide: React.FC<YouTubeSlideProps> = ({ 
  mediaUrl, 
  altText, 
  linkUrl, 
  isActive,
  isPrecaching,
  forceLazyLoad = false,
  onLoad
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isFullyBuffered, setIsFullyBuffered] = useState(false);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const bufferCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeRangeRef = useRef<VideoTimeRange>({ startTime: 0, endTime: 0 });
  const playerInitializedRef = useRef<boolean>(false);
  const videoId = extractVideoId(mediaUrl);
  
  // Extract and store time range parameters
  useEffect(() => {
    const { startTime, endTime } = extractTimeParams(mediaUrl);
    timeRangeRef.current = { startTime, endTime };
  }, [mediaUrl]);

  // Safe player operation wrapper
  const safePlayerOperation = (operation: (player: YouTubePlayer) => void) => {
    if (!playerRef.current || !isPlayerReady || !playerInitializedRef.current) return;
    
    try {
      operation(playerRef.current);
    } catch (error) {
      // Silently handle errors to prevent console spam
    }
  };

  // Handle video time range enforcement
  const enforceTimeRange = () => {
    if (!isPlayerReady) return;
    
    const { startTime, endTime } = timeRangeRef.current;
    
    // Only set up interval if we have a valid end time
    if (endTime > startTime) {
      // Clear any existing interval
      if (timeCheckIntervalRef.current) {
        clearInterval(timeCheckIntervalRef.current);
      }
      
      // Create a new interval to check and enforce time range
      timeCheckIntervalRef.current = setInterval(() => {
        safePlayerOperation((player) => {
          const currentTime = player.getCurrentTime();
          
          // If video is outside the allowed range, reset to start time
          if (currentTime >= endTime || currentTime < startTime) {
            const randomOffset = Math.floor(Math.random() * Math.min(3, endTime - startTime));
            const newStartTime = startTime + randomOffset;
            player.seekTo(newStartTime, true);
          }
        });
      }, 200);
    }
  };

  // Check buffer status and set flag when fully buffered
  const checkBufferStatus = () => {
    safePlayerOperation((player) => {
      const bufferedFraction = player.getVideoLoadedFraction();
      
      // If we've buffered most of the relevant segment, consider it fully loaded
      if (bufferedFraction > 0.9) {
        setIsFullyBuffered(true);
        
        // Clear the buffer check interval if we're fully buffered
        if (bufferCheckIntervalRef.current) {
          clearInterval(bufferCheckIntervalRef.current);
          bufferCheckIntervalRef.current = null;
        }
      }
    });
  };

  // Start buffer check interval
  const startBufferCheck = () => {
    // Clear any existing interval
    if (bufferCheckIntervalRef.current) {
      clearInterval(bufferCheckIntervalRef.current);
    }
    
    // Set up interval to check buffer status
    bufferCheckIntervalRef.current = setInterval(() => {
      checkBufferStatus();
    }, 1000);
  };

  // Manage player based on active state
  useEffect(() => {
    if (!isPlayerReady) return;
    
    // Add a slight delay to ensure the player is fully initialized
    const timer = setTimeout(() => {
      if (isActive) {
        enforceTimeRange();
        
        if (!isFullyBuffered) {
          startBufferCheck();
        }
        
        safePlayerOperation((player) => player.playVideo());
      } else if (isPrecaching || forceLazyLoad) {
        safePlayerOperation((player) => {
          player.setVolume(0);
          
          if (!isFullyBuffered) {
            startBufferCheck();
            
            // Brief play-pause cycle to help with buffering
            player.playVideo();
            setTimeout(() => {
              if (!isActive) {
                safePlayerOperation((p) => p.pauseVideo());
              }
            }, 500);
          }
        });
      } else {
        safePlayerOperation((player) => player.pauseVideo());
      }
    }, 500);
    
    return () => {
      clearTimeout(timer);
      if (timeCheckIntervalRef.current) {
        clearInterval(timeCheckIntervalRef.current);
      }
      if (bufferCheckIntervalRef.current) {
        clearInterval(bufferCheckIntervalRef.current);
      }
    };
  }, [isActive, isPrecaching, forceLazyLoad, isPlayerReady, isFullyBuffered]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeCheckIntervalRef.current) {
        clearInterval(timeCheckIntervalRef.current);
      }
      if (bufferCheckIntervalRef.current) {
        clearInterval(bufferCheckIntervalRef.current);
      }
    };
  }, []);

  // Handle link navigation
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.location.href = linkUrl;
  };
  
  if (!videoId) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-gray-900 text-white">
        <p>Invalid YouTube URL</p>
      </div>
    );
  }
  
  const onReady: YouTubeProps['onReady'] = (event) => {
    playerRef.current = event.target;
    
    // Add a delay to ensure the player is fully initialized in the DOM
    const timer = setTimeout(() => {
      playerInitializedRef.current = true;
      setIsPlayerReady(true);
      setIsLoaded(true);
      
      if (onLoad) {
        onLoad();
      }
      
      safePlayerOperation((player) => {
        // Set playback quality when ready
        player.setPlaybackQuality(isActive ? 'hd720' : 'medium');
        player.mute();
        
        const { startTime } = timeRangeRef.current;
        player.seekTo(startTime, true);
        
        if (!isFullyBuffered) {
          startBufferCheck();
        }
        
        if (isActive) {
          enforceTimeRange();
          player.playVideo();
        } else if (isPrecaching || forceLazyLoad) {
          // For precaching, just load but don't necessarily play
          player.playVideo();
          setTimeout(() => {
            if (!isActive) {
              safePlayerOperation((p) => p.pauseVideo());
            }
          }, 500);
        }
      });
    }, 1000); // Increased delay for more reliable initialization
    
    return () => clearTimeout(timer);
  };
  
  // Handle state changes
  const onStateChange: YouTubeProps['onStateChange'] = (event) => {
    if (!isPlayerReady || !playerInitializedRef.current) return;
    
    const { startTime, endTime } = timeRangeRef.current;
    
    // Check buffer status when state changes
    checkBufferStatus();
    
    try {
      // If video is playing, check if it's within the correct range
      if (event.data === YouTube.PlayerState.PLAYING && isActive) {
        const currentTime = event.target.getCurrentTime();
        
        // If outside valid range, reset
        if ((endTime > startTime && (currentTime >= endTime || currentTime < startTime))) {
          event.target.seekTo(startTime, true);
        }
      }
      
      // If video ended and we're the active slide, restart it
      if (event.data === YouTube.PlayerState.ENDED && isActive) {
        event.target.seekTo(startTime, true);
        setTimeout(() => {
          safePlayerOperation((player) => player.playVideo());
        }, 100);
      }
      
      // If this is the active slide but video is paused, resume it
      if (event.data === YouTube.PlayerState.PAUSED && isActive) {
        setTimeout(() => {
          safePlayerOperation((player) => player.playVideo());
        }, 100);
      }
    } catch (error) {
      // Silent error handling
    }
  };
  
  // Handle errors
  const onError: YouTubeProps['onError'] = () => {
    setIsLoaded(true); // Still mark as loaded to remove spinner
    
    // Notify parent component even if there's an error
    if (onLoad) {
      onLoad();
    }
  };
  
  // Configure the player
  const opts: YouTubeProps['opts'] = {
    width: '100%',
    height: '100%',
    playerVars: extractPlayerVars(mediaUrl),
  };
  
  // Determine if we should render the player based on loading strategy
  const shouldRenderPlayer = isActive || isPrecaching || forceLazyLoad;
  
  // Determine visibility classes
  const visibilityClass = isActive 
    ? 'opacity-100 z-10' 
    : isPrecaching || forceLazyLoad
      ? 'opacity-0 z-0' 
      : 'opacity-0 z-0 pointer-events-none';
  
  return (
    <div 
      ref={containerRef} 
      className={`absolute inset-0 w-full h-full overflow-hidden cursor-pointer transition-opacity duration-300 ${visibilityClass}`}
      onClick={handleClick}
    >
      {/* Loading indicator */}
      {!isLoaded && shouldRenderPlayer && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="w-12 h-12 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin"></div>
        </div>
      )}
      
      {/* YouTube component */}
      {shouldRenderPlayer && (
        <div className={`absolute inset-0 ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}>
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <YouTube
                videoId={videoId}
                opts={opts}
                onReady={onReady}
                onStateChange={onStateChange}
                onError={onError}
                className="absolute w-full h-full min-w-[150%] min-h-[150%] object-cover"
                title={altText}
                iframeClassName="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[130%] h-[130%] origin-center"
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Overlay to prevent hover interactions with YouTube UI but allow click for navigation */}
      <div className="absolute inset-0 z-10"></div>
    </div>
  );
};

export default YouTubeSlide;