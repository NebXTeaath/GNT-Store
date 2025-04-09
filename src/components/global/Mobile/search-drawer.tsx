// src/components/global/Mobile/search-drawer.tsx
"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Search, X } from "lucide-react"
import { 
  Drawer, 
  DrawerContent, 
  DrawerFooter, 
  DrawerTitle, 
  DrawerDescription 
} from "@/components/ui/drawer"
import { useIsMobile } from "@/components/global/Mobile/use-mobile"
import { getAutocompleteResults } from "@/pages/searchPage/search/search-service"
import type { ProductSearchResult } from "@/lib/types/product"
import type { SearchSuggestion } from "@/lib/types/search"
import { useDebounce } from "@/components/global/hooks/use-debounce"
import { formatCurrencyWithSeparator } from "@/lib/currencyFormat"

interface SearchDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SearchDrawer({ open, onOpenChange }: SearchDrawerProps) {
  const [searchValue, setSearchValue] = useState("")
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [results, setResults] = useState<ProductSearchResult[]>([])
  const [didYouMean, setDidYouMean] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsContainerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  // Debounce search term as per the desktop component
  const debouncedSearchTerm = useDebounce(searchValue, 600)

  // Focus the input when the drawer opens
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [open])

  // Fetch autocomplete search results using the existing API
  useEffect(() => {
    const fetchSearchResults = async () => {
      if (debouncedSearchTerm.length < 2) {
        setResults([])
        setSuggestions([])
        setDidYouMean(null)
        return
      }

      setIsLoading(true)
      try {
        const data = await getAutocompleteResults(debouncedSearchTerm)
        setResults(data.results || [])
        setSuggestions(data.suggestions || [])
        setDidYouMean(data.didYouMean || null)
      } catch (error) {
        console.error("Search autocomplete error:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSearchResults()
  }, [debouncedSearchTerm])

  // Dismiss keyboard on mobile devices only if the tap occurs within the results container.
  const dismissKeyboard = (e: React.MouseEvent) => {
    if (
      isMobile &&
      resultsContainerRef.current &&
      e.target instanceof Node &&
      resultsContainerRef.current.contains(e.target)
    ) {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
      }
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchValue.trim()) {
      // Trigger keyboard dismissal using a simulated event with results container as target.
      dismissKeyboard({ target: resultsContainerRef.current } as unknown as React.MouseEvent)
      onOpenChange(false)
      navigate(`/search?q=${encodeURIComponent(searchValue.trim())}`)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    dismissKeyboard({ target: resultsContainerRef.current } as unknown as React.MouseEvent)
    onOpenChange(false)
    navigate(`/search?q=${encodeURIComponent(suggestion)}`)
  }

  const handleResultClick = (productId: string) => {
    dismissKeyboard({ target: resultsContainerRef.current } as unknown as React.MouseEvent)
    onOpenChange(false)
    navigate(`/product/${productId}`)
  }

  const clearSearch = () => {
    setSearchValue("")
    inputRef.current?.focus()
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-[#0f1115] text-white border-t border-[#2a2d36] flex flex-col h-[70vh]">
        <DrawerTitle className="sr-only">Product Search</DrawerTitle>
        <DrawerDescription className="sr-only">
          Search for products by name, category, or description
        </DrawerDescription>
        
        {/* Search header area */}
        <div className="p-4 border-b border-[#2a2d36]">
          <form onSubmit={handleSearch} className="relative">
            <div className="flex items-center h-12 w-full rounded-lg bg-[#1a1c23] border border-[#2a2d36] focus-within:border-[#5865f2] focus-within:shadow-sm focus-within:shadow-[#5865f2]/10">
              <Search className="h-5 w-5 text-gray-400 ml-3" />
              <input
                ref={inputRef}
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search for products..."
                className="flex-1 bg-transparent h-full px-3 text-white placeholder:text-gray-400 focus:outline-none"
                aria-label="Search input"
              />
              {searchValue && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="text-gray-400 hover:text-white transition-colors mr-2"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <button
                type="submit"
                className="h-full px-4 bg-[#5865f2] text-white rounded-r-lg hover:bg-[#4752c4] transition-colors"
                aria-label="Submit search"
              >
                Search
              </button>
            </div>
          </form>
        </div>

        {/* Scrollable results area */}
        <div
          ref={resultsContainerRef}
          onClick={dismissKeyboard}
          className="flex-1 overflow-y-auto p-4"
          style={{ paddingBottom: "6rem" }} // ensures space for the sticky footer
        >
          {isLoading && (
            <div className="text-center py-3" aria-live="polite" aria-busy="true">
              <div className="animate-spin h-5 w-5 border-2 border-[#5865f2] border-t-transparent rounded-full mx-auto"></div>
              <span className="sr-only">Loading search results</span>
            </div>
          )}

          {/* "Did you mean" suggestion */}
          {!isLoading && didYouMean && (
            <div className="mb-4" aria-live="polite">
              <p className="text-sm text-gray-400">
                Did you mean:{" "}
                <button
                  onClick={() => handleSuggestionClick(didYouMean)}
                  className="text-[#5865f2] hover:underline"
                >
                  {didYouMean}
                </button>
              </p>
            </div>
          )}

          {/* Product results */}
          {!isLoading && results.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm text-gray-400" id="search-results-heading">Products</h3>
              <div className="space-y-2" role="list" aria-labelledby="search-results-heading">
                {results.map((result) => (
                  <div
                    key={result.product_id}
                    onClick={() => handleResultClick(result.product_id)}
                    className="flex items-center gap-3 p-2 rounded hover:bg-[#2a2d36] cursor-pointer"
                    role="listitem"
                  >
                    <div className="w-10 h-10 bg-[#1a1c23] rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                      {result.primary_image ? (
                        <img
                          src={result.primary_image || "/placeholder.svg"}
                          alt=""
                          className="object-cover w-full h-full"
                          aria-hidden="true"
                        />
                      ) : (
                        <div className="text-gray-500 text-xs">No img</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-200 line-clamp-2 overflow-hidden">
                        {result.product_name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {result.category} {result.subcategory ? `› ${result.subcategory}` : ""}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {result.discount_price ? (
                        <div>
                          <span className="text-base font-bold text-[#5865f2]">{formatCurrencyWithSeparator(result.discount_price)}</span>
                          <span className="text-xs text-gray-400 line-through ml-1">{formatCurrencyWithSeparator(result.price)}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-[#5865f2]">{formatCurrencyWithSeparator(result.price)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search suggestions */}
          {!isLoading && suggestions.length > 0 && (
            <div className="space-y-2 mt-4">
              <h3 className="text-sm text-gray-400" id="search-suggestions-heading">Suggestions</h3>
              <div className="flex flex-wrap gap-2" role="list" aria-labelledby="search-suggestions-heading">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion.suggestion)}
                    className="text-sm bg-[#1a1c23] hover:bg-[#2a2d36] px-3 py-1 rounded-full border border-[#2a2d36]"
                    role="listitem"
                  >
                    {suggestion.suggestion}
                    {suggestion.estimated_results && (
                      <span className="text-xs text-gray-500 ml-1">
                        ({suggestion.estimated_results})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Empty states */}
          {!isLoading && searchValue.length >= 2 && results.length === 0 && suggestions.length === 0 && !didYouMean && (
            <div className="text-center py-4" aria-live="polite">
              <p className="text-gray-400">No results found</p>
            </div>
          )}

          {!isLoading && searchValue.length < 2 && (
            <div className="text-center py-4" aria-live="polite">
              <p className="text-gray-400">Type at least 2 characters to search</p>
            </div>
          )}
        </div>

        {/* Sticky footer */}
        <DrawerFooter className="sticky bottom-0 z-10 bg-[#0f1115] p-4 border-t border-[#2a2d36]">
          {searchValue.length >= 2 && (
            <button
              onClick={handleSearch}
              className="w-full text-center text-sm text-[#5865f2] hover:text-[#4752c4] py-2"
            >
              View all results for "{searchValue}"
            </button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}