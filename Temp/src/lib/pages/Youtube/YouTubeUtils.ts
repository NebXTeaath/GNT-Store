// src\pages\HomePage\Youtube\YouTubeUtils.ts

/**
 * Extracts the YouTube video ID from a URL
 * Supports various YouTube URL formats including youtu.be, youtube.com/watch, 
 * and youtube.com/embed formats
 * 
 * @param url YouTube URL string
 * @returns YouTube video ID or empty string if not found
 */
export const extractVideoId = (url: string): string => {
    const regex = /(?:youtu\.be\/|v=|youtube\.com\/embed\/)([^?&]+)/;
    const match = url.match(regex);
    return match ? match[1] : '';
  };
  
  /**
   * Extracts time parameters from a YouTube URL
   * 
   * @param url YouTube URL with potential start and end parameters
   * @returns Object containing startTime and endTime in seconds
   */
  export const extractTimeParams = (url: string) => {
    const queryString = url.split('?')[1] || '';
    const params = new URLSearchParams(queryString);
    
    return {
      startTime: params.get('start') ? parseInt(params.get('start')!, 10) : 0,
      endTime: params.get('end') ? parseInt(params.get('end')!, 10) : 0
    };
  };
  
  /**
   * Creates the player parameters for YouTube embed
   * 
   * @param url YouTube URL with parameters
   * @param autoplay Whether to autoplay the video
   * @returns Object containing YouTube player parameters
   */
  export const createPlayerVars = (url: string, autoplay: boolean = false) => {
    const { startTime, endTime } = extractTimeParams(url);
    const videoId = extractVideoId(url);
    
    return {
      autoplay: autoplay ? 1 : 0,
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
      origin: typeof window !== 'undefined' ? window.location.origin : '',
      enablejsapi: 1,
      start: startTime,
      end: endTime > startTime ? endTime : undefined,
      hl: 'en',
      cc_load_policy: 0,
    };
  };