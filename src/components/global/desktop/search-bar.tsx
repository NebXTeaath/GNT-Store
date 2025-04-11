"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Search, X, Loader2 } from "lucide-react"
import { useDebounce } from "@/components/global/hooks/use-debounce"
import { useOnClickOutside } from "@/components/global/hooks/use-on-click-outside"
import { cn } from "@/lib/utils"
import type { ProductSearchResult } from "@/lib/types/product"
import type { SearchSuggestion } from "@/lib/types/search"
import { getAutocompleteResults } from "@/pages/searchPage/search/search-service"
import { useNavigate } from "react-router-dom"

interface SearchBarProps {
  className?: string
  placeholder?: string
  onSearch?: (term: string) => void
  mobile?: boolean
  value?: string;
  size?: "x-small" | "small" | "medium" | "large"; // Added x-small size option
}

export function SearchBar({ 
  className, 
  placeholder = "Search products...", 
  onSearch, 
  size = "medium" // Default size is medium
}: SearchBarProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([])
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [didYouMean, setDidYouMean] = useState<string | null>(null)
  const debouncedSearchTerm = useDebounce(searchTerm, 600)
  const searchRef = useRef<HTMLDivElement>(null)
  // Input reference to focus the input element programmatically
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useOnClickOutside(searchRef, () => {
    setIsFocused(false)
  })

  // Fetch search results when debounced search term changes
  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!debouncedSearchTerm || debouncedSearchTerm.length < 2) {
        setSearchResults([])
        setSuggestions([])
        setDidYouMean(null)
        return
      }

      setIsLoading(true)
      try {
        // Fetch autocomplete results using the service
        const data = await getAutocompleteResults(debouncedSearchTerm)

        setSearchResults(data.results || [])
        setSuggestions(data.suggestions || [])
        setDidYouMean(data.didYouMean || null)
      } catch (error) {
        console.error("Search error:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSearchResults()
  }, [debouncedSearchTerm])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      onSearch?.(searchTerm)
      navigate(`/search?q=${encodeURIComponent(searchTerm)}`)
      setIsFocused(false)
      // Remove focus from the input field after search submission
      inputRef.current?.blur()
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setSearchTerm(suggestion)
    navigate(`/search?q=${encodeURIComponent(suggestion)}`)
    setIsFocused(false)
    // Also remove focus when clicking a suggestion
    inputRef.current?.blur()
  }

  const handleResultClick = (productId: string) => {
    navigate(`/product/${productId}`)
    setIsFocused(false)
    // Also remove focus when clicking a result
    inputRef.current?.blur()
  }

  const clearSearch = () => {
    setSearchTerm("")
    setSearchResults([])
    setSuggestions([])
    setDidYouMean(null)
  }

  // Function to focus the input when the container is clicked
  const focusInput = () => {
    inputRef.current?.focus()
  }

  // Define width classes based on size prop
  const getSizeClasses = () => {
    switch (size) {
      case "x-small":
        return "max-w-[180px]"; // Much narrower width for extra small size
      case "small":
        return "max-w-xs";
      case "medium":
        return "max-w-sm lg:max-w-md";
      case "large":
        return "max-w-md lg:max-w-lg";
      default:
        return "max-w-sm lg:max-w-md";
    }
  }

  // Handle placeholder text based on size
  const getPlaceholder = () => {
    if (size === "x-small") {
      return "Search";
    }
    if (size === "small") {
      return "Search...";
    }
    return placeholder;
  }

  return (
    <div 
    ref={searchRef} 
    className={cn(
      "relative w-full min-w-0", 
      getSizeClasses(), 
      className
    )}
  >
    <form onSubmit={handleSearch} className="w-full">
      {/* Search input container with fixed height */}
      <div
        className={cn(
          "relative flex items-center border hover:border-[#5865f2] border-[#2a2d36] rounded-md px-3 py-1.5 bg-[#1a1c23] cursor-text",
          "h-10" ,
          isFocused && "ring-1 ring-[#5865f2]",
          size === "small" && "px-2 py-1 h-8", 
          size === "x-small" && "px-1.5 py-0.5 h-7"
        )}
        onClick={focusInput}
      >
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsFocused(true)}
            placeholder={getPlaceholder()}
            className={cn(
              "text-sm bg-transparent outline-none text-gray-300 w-full truncate",
              size === "small" && "text-xs", // Smaller text for small size
              size === "x-small" && "text-xs" // Also smaller text for x-small size
            )}
          />
          <div className="ml-auto flex-shrink-0">
            {isLoading ? (
              <Loader2 className={cn(
                "text-gray-400 animate-spin",
                size === "small" ? "h-3 w-3" : "h-4 w-4",
                size === "x-small" && "h-3 w-3" // Same small icon size for x-small
              )} />
            ) : searchTerm ? (
              <button 
                type="button" 
                onClick={(e) => {
                  e.stopPropagation();
                  clearSearch();
                }} 
                className="text-gray-400 hover:text-gray-300"
              >
                <X className={cn(
                  size === "small" || size === "x-small" ? "h-3 w-3" : "h-4 w-4"
                )} />
                <span className="sr-only">Clear search</span>
              </button>
            ) : (
              <Search className={cn(
                size === "small" || size === "x-small" ? "h-3 w-3" : "h-4 w-4",
                "text-gray-400"
              )} />
            )}
          </div>
        </div>
      </form>

      {/* Results dropdown with fixed positioning */}
  {isFocused && (searchResults.length > 0 || didYouMean || suggestions.length > 0) && (
    <div className="fixed left-0 right-0 top-full mt-1 rounded-md border border-[#2a2d36] bg-[#1a1c23] shadow-lg z-50 max-h-[80vh] overflow-y-auto"
         style={{
           width: searchRef.current?.offsetWidth + 'px',
           left: searchRef.current?.getBoundingClientRect().left + 'px'
         }}>
          {/* "Did you mean" suggestion */}
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

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="p-2">
              <h3 className="text-xs font-medium text-gray-400 mb-2">Products</h3>
              <div className="space-y-2">
                {searchResults.map((result) => (
                  <div
                    key={result.product_id}
                    onClick={() => handleResultClick(result.slug)}
                    data-href={`/product/${result.slug}`}
                    className="flex items-center gap-3 p-2 hover:bg-[#2a2d36] rounded-md cursor-pointer"
                  >
                    {result.primary_image && (
                      <div className="w-10 h-10 flex-shrink-0 rounded overflow-hidden bg-[#2a2d36]">
                        <img
                          src={result.primary_image || "/placeholder.svg"}
                          alt={result.product_name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">{result.product_name}</p>
                      <p className="text-xs text-gray-400">
                        {result.category} {result.subcategory ? `› ${result.subcategory}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-200">
                        {result.discount_price ? (
                          <>
                            <span className="text-[#5865f2]">${result.discount_price}</span>
                            <span className="text-xs text-gray-400 line-through ml-1">${result.price}</span>
                          </>
                        ) : (
                          <span>${result.price}</span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search suggestions */}
          {suggestions.length > 0 && (
            <div className="p-2 border-t border-[#2a2d36]">
              <h3 className="text-xs font-medium text-gray-400 mb-2">Suggestions</h3>
              <div className="grid grid-cols-2 gap-1">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion.suggestion)}
                    data-href={`/search?q=${encodeURIComponent(suggestion.suggestion)}`}
                    className="text-left text-sm text-gray-300 hover:text-white hover:bg-[#2a2d36] rounded px-2 py-1 truncate"
                  >
                    {suggestion.suggestion}
                    <span className="text-xs text-gray-500 ml-1">({suggestion.estimated_results})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* View all results button */}
          {searchTerm.length >= 2 && (
            <div className="p-2 border-t border-[#2a2d36]">
              <button
                onClick={handleSearch}
                data-href={`/search?q=${encodeURIComponent(searchTerm)}`}
                className="w-full text-center text-sm text-[#5865f2] hover:text-[#4752c4] py-1"
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