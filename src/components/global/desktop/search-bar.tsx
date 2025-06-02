// src/components/global/desktop/search-bar.tsx
"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Search, X, Loader2, Star } from "lucide-react" // Import Star
import { useDebounce } from "@/components/global/hooks/use-debounce"
import { useOnClickOutside } from "@/components/global/hooks/use-on-click-outside"
import { cn } from "@/lib/utils"
import type { ProductSearchResult } from "@/lib/types/product"
import type { SearchSuggestion } from "@/lib/types/search"
import { getAutocompleteResults } from "@/lib/pages/searchPage/search/search-service";
import { useNavigate } from "react-router-dom"
import { formatCurrencyWithSeparator } from "@/lib/currencyFormat";

interface SearchBarProps {
  className?: string
  placeholder?: string
  onSearch?: (term: string) => void
  mobile?: boolean // This prop seems unused in the current logic, consider removing if not needed
  value?: string; // This prop seems unused, controlled internally by searchTerm
  size?: "x-small" | "small" | "medium" | "large";
}

export function SearchBar({
  className,
  placeholder = "Search products...",
  onSearch,
  size = "medium"
}: SearchBarProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([])
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [didYouMean, setDidYouMean] = useState<string | null>(null)
  const debouncedSearchTerm = useDebounce(searchTerm, 600)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useOnClickOutside(searchRef, () => {
    setIsFocused(false)
  })

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!debouncedSearchTerm || debouncedSearchTerm.length < 2) {
        setSearchResults([])
        setSuggestions([])
        setDidYouMean(null)
        // Do not set isLoading to false here if the condition is met early,
        // as it might hide a loader from a previous valid search too soon.
        // isLoading should be primarily controlled by the try/finally block.
        return
      }

      setIsLoading(true)
      try {
        const data = await getAutocompleteResults(debouncedSearchTerm)
        // console.log("Autocomplete results:", data); // For debugging
        setSearchResults(data.results || [])
        setSuggestions(data.suggestions || [])
        setDidYouMean(data.didYouMean || null)
      } catch (error) {
        console.error("Search error:", error)
        // Optionally set an error state to display to the user
      } finally {
        setIsLoading(false)
      }
    }
    fetchSearchResults()
  }, [debouncedSearchTerm])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      onSearch?.(searchTerm) // Call external onSearch if provided
      navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`)
      setIsFocused(false)
      inputRef.current?.blur()
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setSearchTerm(suggestion) // Update input with suggestion
    navigate(`/search?q=${encodeURIComponent(suggestion)}`)
    setIsFocused(false)
    inputRef.current?.blur()
  }

  const handleResultClick = (slug: string) => { // Expecting slug
    navigate(`/product/${slug}`)
    setIsFocused(false)
    inputRef.current?.blur()
  }

  const clearSearch = () => {
    setSearchTerm("")
    setSearchResults([])
    setSuggestions([])
    setDidYouMean(null)
    // Keep focus in input after clearing for better UX
    inputRef.current?.focus();
  }

  const focusInput = () => {
    inputRef.current?.focus()
    // No need to setIsFocused(true) here, onFocus on input will handle it.
  }

  // Define width classes based on size prop
  const getSizeClasses = () => {
    switch (size) {
      case "x-small":
        return "max-w-[180px]";
      case "small":
        return "max-w-xs"; // Tailwind's max-w-xs is 20rem or 320px
      case "medium":
        return "max-w-sm lg:max-w-md"; // sm: 24rem (384px), md: 28rem (448px)
      case "large":
        return "max-w-md lg:max-w-lg"; // md: 28rem (448px), lg: 32rem (512px)
      default:
        return "max-w-sm lg:max-w-md";
    }
  }

  const getPlaceholder = () => {
    if (size === "x-small") return "Search";
    if (size === "small") return "Search...";
    return placeholder;
  }

  return (
    <div ref={searchRef} className={cn("relative w-full min-w-0", getSizeClasses(), className)}>
      <form onSubmit={handleSearch} className="w-full">
        <div
          className={cn(
            "relative flex items-center border hover:border-[#5865f2] border-[#2a2d36] rounded-md px-3 py-1.5 bg-[#1a1c23] cursor-text transition-colors duration-200",
            isFocused && "ring-1 ring-[#5865f2] border-[#5865f2]", // Highlight border when focused
            size === "small" && "px-2 py-1",
            size === "x-small" && "px-1.5 py-0.5"
          )}
          onClick={focusInput} // Focus input when the div is clicked
        >
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsFocused(true)} // Set isFocused on input focus
            placeholder={getPlaceholder()}
            className={cn(
              "text-sm bg-transparent outline-none text-gray-300 w-full truncate placeholder-gray-500",
              size === "small" && "text-xs",
              size === "x-small" && "text-xs"
            )}
            aria-label="Search products"
          />
          <div className="ml-auto flex-shrink-0">
            {isLoading && searchTerm.length >= 2 ? ( // Show loader only when actively loading for a search term
              <Loader2 className={cn("text-gray-400 animate-spin", size === "small" ? "h-3 w-3" : "h-4 w-4", size === "x-small" && "h-3 w-3")} />
            ) : searchTerm ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent form submission or div click
                  clearSearch();
                }}
                className="text-gray-400 hover:text-gray-300 p-0.5" // Added padding for easier click
                aria-label="Clear search"
              >
                <X className={cn(size === "small" || size === "x-small" ? "h-3 w-3" : "h-4 w-4")} />
              </button>
            ) : (
              <Search className={cn(size === "small" || size === "x-small" ? "h-3 w-3" : "h-4 w-4", "text-gray-400")} />
            )}
          </div>
        </div>
      </form>

      {/* Search results dropdown */}
      {isFocused && searchTerm.length >= 2 && (isLoading || searchResults.length > 0 || didYouMean || suggestions.length > 0) && (
        <div className="absolute left-0 right-0 top-full mt-1 rounded-md border border-[#2a2d36] bg-[#1a1c23] shadow-lg z-50 max-h-[calc(80vh-60px)] overflow-y-auto dark-theme-scrollbar">
          {isLoading && searchResults.length === 0 && !didYouMean && !suggestions.length && (
             <div className="p-4 text-center text-gray-400 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Searching...
             </div>
          )}

          {didYouMean && (
            <div className="p-2 border-b border-[#2a2d36]">
              <p className="text-sm text-gray-400">
                Did you mean:
                <button
                  onClick={() => handleSuggestionClick(didYouMean)}
                  className="ml-1 text-[#5865f2] hover:underline"
                >
                  {didYouMean}
                </button>
              </p>
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="p-2">
              <h3 className="text-xs font-medium text-gray-400 mb-2 px-1">Products</h3>
              <div className="space-y-1">
                {searchResults.map((result) => {
                  const avgRating = result.average_rating ?? 0;
                  const revCount = result.review_count ?? 0;
                  return (
                    <div
                      key={result.product_id}
                      onClick={() => handleResultClick(result.slug)}
                      data-href={`/product/${result.slug}`}
                      className="flex items-start gap-3 p-2 hover:bg-[#2a2d36] rounded-md cursor-pointer" // items-start for better vertical alignment
                    >
                      {result.primary_image && (
                        <div className="w-12 h-12 flex-shrink-0 rounded overflow-hidden bg-[#2a2d36]">
                          <img
                            src={result.primary_image || "/placeholder.svg"}
                            alt={result.product_name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0"> {/* min-w-0 is important for truncation */}
                        <p className="text-sm font-medium text-gray-200 truncate" title={result.product_name}>
                          {result.product_name}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {result.category} {result.subcategory ? `› ${result.subcategory}` : ""} {result.label ? `› ${result.label}` : ""}
                        </p>
                        {avgRating > 0 && (
                          <div className="flex items-center gap-0.5 mt-0.5">
                            {Array(5).fill(0).map((_, i) => (
                              <Star
                                key={i}
                                size={12}
                                className={cn(
                                  "flex-shrink-0", // Prevent stars from shrinking too much
                                  i < Math.round(avgRating) ? "text-yellow-400 fill-yellow-400" : "text-gray-600"
                                )}
                              />
                            ))}
                            {revCount > 0 && (
                              <span className="text-xs text-gray-400 ml-1">
                                ({revCount})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0 ml-2"> {/* Added ml-2 for spacing */}
                        <p className="text-sm font-medium text-gray-200">
                          {result.discount_price < result.price ? (
                            <>
                              <span className="text-[#5865f2]">{formatCurrencyWithSeparator(result.discount_price)}</span>
                              <span className="text-xs text-gray-400 line-through ml-1">{formatCurrencyWithSeparator(result.price)}</span>
                            </>
                          ) : (
                            <span>{formatCurrencyWithSeparator(result.price)}</span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {suggestions.length > 0 && (
            <div className="p-2 border-t border-[#2a2d36]">
              <h3 className="text-xs font-medium text-gray-400 mb-2 px-1">Suggestions</h3>
              <div className="grid grid-cols-2 gap-1">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion.suggestion)}
                    data-href={`/search?q=${encodeURIComponent(suggestion.suggestion)}`}
                    className="text-left text-sm text-gray-300 hover:text-white hover:bg-[#2a2d36] rounded px-2 py-1 truncate"
                  >
                    {suggestion.suggestion}
                    {suggestion.estimated_results > 0 && ( // Only show count if > 0
                        <span className="text-xs text-gray-500 ml-1">({suggestion.estimated_results})</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {searchTerm.length >= 2 && (searchResults.length > 0 || suggestions.length > 0 || didYouMean) && ( // Only show if there's something to view all for
            <div className="p-2 border-t border-[#2a2d36]">
              <button
                onClick={handleSearch} // Re-use handleSearch for consistency
                data-href={`/search?q=${encodeURIComponent(searchTerm)}`}
                className="w-full text-center text-sm text-[#5865f2] hover:text-[#4752c4] py-1.5 rounded hover:bg-[#5865f2]/10"
              >
                View all results for "{searchTerm}"
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}