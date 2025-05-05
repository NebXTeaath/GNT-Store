//src\components\global\hooks\use-search-url.ts
import { useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

/**
 * Hook for managing search URL parameters
 */
export function useSearchUrl() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Function to update URL parameters
  const updateFilters = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    
    if (!("page" in updates)) {
      params.set("page", "1");
    }
    
    navigate(`/search?${params.toString()}`);
  }, [searchParams, navigate]);

  // Function to handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: string) => {
    updateFilters({ q: suggestion, page: "1" });
  }, [updateFilters]);

  // Function to clear all filters
  const handleClearFilters = useCallback((query: string) => {
    const params = new URLSearchParams();
    params.set("q", query);
    navigate(`/search?${params.toString()}`);
  }, [navigate]);

  return {
    searchParams,
    updateFilters,
    handleSuggestionClick,
    handleClearFilters
  };
}
