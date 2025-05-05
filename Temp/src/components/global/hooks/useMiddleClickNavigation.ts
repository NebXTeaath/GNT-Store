import { useEffect } from 'react';

/**
 * A custom hook that adds global middle-click navigation functionality
 * to any clickable element with data-href or href attributes.
 * 
 * This version properly handles the middle-click lifecycle and doesn't
 * interfere with regular clicks after a middle-click has occurred.
 */
const useMiddleClickNavigation = () => {
  useEffect(() => {
    // We'll track the URL to open on mouseup rather than using a boolean flag
    let urlToOpen: string | null = null;
    
    const handleMouseDown = (event: MouseEvent) => {
      // Only process middle mouse clicks (button 1)
      if (event.button !== 1) return;
      
      // Find the closest anchor or element with data-href
      let target = event.target as HTMLElement;
      
      // Traverse up the DOM to find a clickable parent with href or data-href
      while (target) {
        // Check for data-href attribute first (for custom components)
        if (target.dataset && target.dataset.href) {
          urlToOpen = target.dataset.href;
          break;
        }
        
        // Check if it's an anchor tag with href
        if (target.tagName === 'A' && (target as HTMLAnchorElement).href) {
          urlToOpen = (target as HTMLAnchorElement).href;
          break;
        }
        
        // Move up to parent
        target = target.parentElement as HTMLElement;
        if (!target) break;
      }
      
      // If we found a URL, prevent default behavior
      if (urlToOpen) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const handleMouseUp = (event: MouseEvent) => {
      // Only process middle mouse button events and only if we have a URL
      if (event.button === 1 && urlToOpen) {
        // Open the URL in a new tab
        window.open(urlToOpen, '_blank');
        
        // Prevent the default behavior
        event.preventDefault();
        event.stopPropagation();
        
        // Reset the stored URL immediately
        urlToOpen = null;
        
        // Return focus to the original window
        window.focus();
      }
    };
    
    // Reset URL on any mouse movement outside of the click sequence
    const handleMouseMove = () => {
      // If the user moves the mouse after pressing (but before releasing)
      // we'll assume they've changed their mind
      if (urlToOpen) {
        urlToOpen = null;
      }
    };

    // Add the event listeners to the document
    document.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('mouseup', handleMouseUp, true);
    document.addEventListener('mousemove', handleMouseMove, true);
    
    // Clean up the event listeners when the component unmounts
    return () => {
      document.removeEventListener('mousedown', handleMouseDown, true);
      document.removeEventListener('mouseup', handleMouseUp, true);
      document.removeEventListener('mousemove', handleMouseMove, true);
    };
  }, []);
};

export default useMiddleClickNavigation;