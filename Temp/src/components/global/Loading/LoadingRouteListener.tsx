// src/components/global/LoadingRouteListener.tsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useLoading } from "@/components/global/Loading/LoadingContext";

const LoadingRouteListener = () => {
  const location = useLocation();
  const { setIsLoading } = useLoading();
  
  useEffect(() => {
    // Short delay to allow the page to render before hiding loading screen
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300); // Adjust timing as needed
    
    return () => clearTimeout(timer);
  }, [location, setIsLoading]);
  
  return null; // This component doesn't render anything
};

export default LoadingRouteListener;