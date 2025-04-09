//src/components/app/search/page.tsx
"use client"
import { useState, useEffect, useCallback } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { SearchBar } from "@/components/global/desktop/search-bar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Filter, X } from "lucide-react"
import { getSearchResults } from "@/pages/searchPage/search/search-service.ts"
import type { ProductSearchResult } from "@/lib/types/product"
import type { SearchSuggestion } from "@/lib/types/search"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { useIsMobile } from "@/components/global/Mobile/use-mobile.tsx"
import { Slider } from "@/components/ui/slider"
import { useDebounce } from "@/components/global/hooks/use-debounce.ts"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

// Define filter option type
interface FilterOption {
  name: string
  count: number
}

// Define filter groups
interface FilterGroups {
  categories: FilterOption[]
  subcategories: FilterOption[]
  labels: FilterOption[]
}

export default function SearchPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const query = searchParams.get("q") || ""
  // Parse comma-separated filter values into arrays
  const activeCategories = searchParams.get("category") ? searchParams.get("category")!.split(",") : []
  const activeSubcategories = searchParams.get("subcategory") ? searchParams.get("subcategory")!.split(",") : []
  const activeLabels = searchParams.get("label") ? searchParams.get("label")!.split(",") : []

  const sortBy = searchParams.get("sortBy") || "relevance"
  const page = Number.parseInt(searchParams.get("page") || "1")
  const pageSize = Number.parseInt(searchParams.get("pageSize") || "20")

  // Discount filter comes from URL (for UI display)
  const filterByDiscount = searchParams.get("filterByDiscount") === "true"
  const minDiscountPrice = Number.parseFloat(searchParams.get("minDiscountPrice") || "0")
  const maxDiscountPrice = Number.parseFloat(searchParams.get("maxDiscountPrice") || "0")

  const [results, setResults] = useState<ProductSearchResult[]>([])
  const [originalResults, setOriginalResults] = useState<ProductSearchResult[]>([])
  const [totalResults, setTotalResults] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [didYouMean, setDidYouMean] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDiscountFilterEnabled, setIsDiscountFilterEnabled] = useState(filterByDiscount)
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)

  // Dynamic filter options from the full (unfiltered) result set
  const [filterGroups, setFilterGroups] = useState<FilterGroups>({
    categories: [],
    subcategories: [],
    labels: [],
  })

  // State for discount price range and validation
  const [discountPriceRange, setDiscountPriceRange] = useState<[number, number]>([
    filterByDiscount ? minDiscountPrice : 0,
    filterByDiscount ? maxDiscountPrice : 0,
  ])
  const [discountPriceBounds, setDiscountPriceBounds] = useState<[number, number]>([0, 0])

  // Error state for input validation feedback
  const [rangeError, setRangeError] = useState<{ min: string | null; max: string | null }>({
    min: null,
    max: null,
  })

  // Flag to prevent unnecessary updates
  const [isApplyingFilters, setIsApplyingFilters] = useState(false)

  // Create debounced version of the price range
  const debouncedPriceRange = useDebounce(discountPriceRange, 600)

  // Helper to update URL params (used for both multi-selection and discount)
  const updateFilters = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null) {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      })
      if (!("page" in updates)) {
        params.set("page", "1")
      }
      navigate(`/search?${params.toString()}`)
    },
    [searchParams, navigate],
  )

  // Helper for toggling filter options in multi-selection groups
  const toggleFilterOption = (filterKey: "category" | "subcategory" | "label", option: string) => {
    const currentParam = searchParams.get(filterKey)
    let currentArray = currentParam ? currentParam.split(",") : []
    if (currentArray.includes(option)) {
      currentArray = currentArray.filter((item) => item !== option)
    } else {
      currentArray.push(option)
    }
    updateFilters({ [filterKey]: currentArray.length > 0 ? currentArray.join(",") : null })
  }

  // Extract filter options from a full result set
  const extractFilterOptions = useCallback((products: ProductSearchResult[]) => {
    const categoryCounts: Record<string, number> = {}
    const subcategoryCounts: Record<string, number> = {}
    const labelCounts: Record<string, number> = {}

    products.forEach((product) => {
      if (product.category) {
        categoryCounts[product.category] = (categoryCounts[product.category] || 0) + 1
      }
      if (product.subcategory) {
        subcategoryCounts[product.subcategory] = (subcategoryCounts[product.subcategory] || 0) + 1
      }
      if (product.label) {
        labelCounts[product.label] = (labelCounts[product.label] || 0) + 1
      }
    })

    const categoryOptions = Object.entries(categoryCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    const subcategoryOptions = Object.entries(subcategoryCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    const labelOptions = Object.entries(labelCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    setFilterGroups({
      categories: categoryOptions,
      subcategories: subcategoryOptions,
      labels: labelOptions,
    })
  }, [])

  // --- FETCH EFFECT: Always fetch full results (without multi-selection filters) ---
  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!query) return

      setIsLoading(true)
      try {
        // Always fetch the full set (pass null for category/subcategory/label)
        const data = await getSearchResults({
          term: query,
          category: null,
          subcategory: null,
          label: null,
          sortBy,
          page,
          pageSize,
        })

        const fullResults = data.results || []
        // Extract full filter groups from the complete result set
        extractFilterOptions(fullResults)

        // Now apply multi-selection filters client-side
        let multiFiltered = fullResults
        if (activeCategories.length > 0) {
          multiFiltered = multiFiltered.filter(
            (product) => product.category && activeCategories.includes(product.category),
          )
        }
        if (activeSubcategories.length > 0) {
          multiFiltered = multiFiltered.filter(
            (product) => product.subcategory && activeSubcategories.includes(product.subcategory),
          )
        }
        if (activeLabels.length > 0) {
          multiFiltered = multiFiltered.filter((product) => product.label && activeLabels.includes(product.label))
        }

        setOriginalResults(multiFiltered)
        setResults(multiFiltered)
        setTotalResults(multiFiltered.length)
        setTotalPages(Math.ceil(multiFiltered.length / pageSize))
        setSuggestions(data.suggestions || [])
        setDidYouMean(data.didYouMean || null)

        if (fullResults.length > 0) {
          const discountPrices = fullResults.map((item) => item.discount_price)
          const minDiscountValue = Math.floor(Math.min(...discountPrices))
          const maxDiscountValue = Math.ceil(Math.max(...discountPrices))
          setDiscountPriceBounds([minDiscountValue, maxDiscountValue])
          // If discount filtering is off, initialize to full bounds
          if (!filterByDiscount) {
            setDiscountPriceRange([minDiscountValue, maxDiscountValue])
          }
        }
      } catch (error) {
        console.error("Search error:", error)
      } finally {
        setIsLoading(false)
      }
    }

    // Depend on query, sort, pagination, and a string representation of multi-selection filters.
    fetchSearchResults()
  }, [
    query,
    sortBy,
    page,
    pageSize,
    activeCategories.join(","),
    activeSubcategories.join(","),
    activeLabels.join(","),
    extractFilterOptions,
  ])

  // --- DISCOUNT FILTERING EFFECT: Apply discount filtering on top of multi-selection results ---
  useEffect(() => {
    if (originalResults.length > 0 && !isApplyingFilters) {
      let discountFiltered = originalResults
      if (isDiscountFilterEnabled) {
        discountFiltered = discountFiltered.filter(
          (product) =>
            product.discount_price >= debouncedPriceRange[0] && product.discount_price <= debouncedPriceRange[1],
        )
      }
      setResults(discountFiltered)
      setTotalResults(discountFiltered.length)
      setTotalPages(Math.ceil(discountFiltered.length / pageSize))
    }
  }, [isDiscountFilterEnabled, debouncedPriceRange, originalResults, pageSize, isApplyingFilters])

  // --- URL UPDATE EFFECT for discount price (using debounced value) ---
  useEffect(() => {
    if (isDiscountFilterEnabled && !isApplyingFilters) {
      const params = new URLSearchParams(searchParams.toString())
      params.set("filterByDiscount", "true")
      params.set("minDiscountPrice", debouncedPriceRange[0].toString())
      params.set("maxDiscountPrice", debouncedPriceRange[1].toString())
      params.set("page", "1")
      navigate(`/search?${params.toString()}`, { replace: true })
    }
  }, [debouncedPriceRange, isDiscountFilterEnabled, isApplyingFilters, searchParams, navigate])

  const handleSuggestionClick = (suggestion: string) => {
    updateFilters({ q: suggestion, page: "1" })
  }

  const handleClearFilters = () => {
    const params = new URLSearchParams()
    params.set("q", query)
    navigate(`/search?${params.toString()}`)
    setIsDiscountFilterEnabled(false)
    setRangeError({ min: null, max: null })
    setIsFilterSheetOpen(false)

    if (originalResults.length > 0) {
      const discountPrices = originalResults.map((item) => item.discount_price)
      const minDiscountValue = Math.floor(Math.min(...discountPrices))
      const maxDiscountValue = Math.ceil(Math.max(...discountPrices))
      setDiscountPriceRange([minDiscountValue, maxDiscountValue])
    }
  }

  const handleDiscountFilterToggle = (checked: boolean) => {
    setIsDiscountFilterEnabled(checked)
    if (checked) {
      updateFilters({
        filterByDiscount: "true",
        minDiscountPrice: discountPriceRange[0].toString(),
        maxDiscountPrice: discountPriceRange[1].toString(),
      })
    } else {
      updateFilters({
        filterByDiscount: null,
        minDiscountPrice: null,
        maxDiscountPrice: null,
      })
    }
  }

  const handlePriceRangeChange = (value: [number, number] | number, isMin = false) => {
    const [boundMin, boundMax] = discountPriceBounds
    if (Array.isArray(value)) {
      setRangeError({ min: null, max: null })
      setDiscountPriceRange(value)
    } else {
      const newValue = value
      const newMin = isMin ? newValue : discountPriceRange[0]
      const newMax = isMin ? discountPriceRange[1] : newValue

      if (isMin) {
        if (isNaN(newValue) || newValue < boundMin) {
          setRangeError((prev) => ({ ...prev, min: `Minimum must be at least $${boundMin}` }))
          return
        } else if (newValue > newMax) {
          setRangeError((prev) => ({ ...prev, min: `Minimum cannot exceed maximum ($${newMax})` }))
          return
        } else {
          setRangeError((prev) => ({ ...prev, min: null }))
        }
      } else {
        if (isNaN(newValue) || newValue > boundMax) {
          setRangeError((prev) => ({ ...prev, max: `Maximum cannot exceed $${boundMax}` }))
          return
        } else if (newValue < newMin) {
          setRangeError((prev) => ({ ...prev, max: `Maximum cannot be less than minimum ($${newMin})` }))
          return
        } else {
          setRangeError((prev) => ({ ...prev, max: null }))
        }
      }

      setDiscountPriceRange([newMin, newMax])
    }
  }

  const calculateDiscountPercentage = (price: number, discountPrice: number): number => {
    if (price <= 0 || discountPrice >= price) return 0
    return Math.round(((price - discountPrice) / price) * 100)
  }

  const FilterBadge = ({ label, onRemove }: { label: string; onRemove: () => void }) => (
    <Badge className="bg-[#5865f2] text-white py-1 px-2 flex items-center gap-1">
      {label}
      <button onClick={onRemove} className="ml-1">
        <X className="h-3 w-3" />
      </button>
    </Badge>
  )

  const ActiveFilters = () => {
    const hasActiveFilters =
      activeCategories.length > 0 || activeSubcategories.length > 0 || activeLabels.length > 0 || filterByDiscount

    if (!hasActiveFilters) return null
    return (
      <div className="flex flex-wrap gap-2 my-4">
        {activeCategories.map((cat) => (
          <FilterBadge
            key={`cat-${cat}`}
            label={`Category: ${cat}`}
            onRemove={() => toggleFilterOption("category", cat)}
          />
        ))}
        {activeSubcategories.map((sub) => (
          <FilterBadge
            key={`sub-${sub}`}
            label={`Subcategory: ${sub}`}
            onRemove={() => toggleFilterOption("subcategory", sub)}
          />
        ))}
        {activeLabels.map((lab) => (
          <FilterBadge key={`lab-${lab}`} label={`Label: ${lab}`} onRemove={() => toggleFilterOption("label", lab)} />
        ))}
        {filterByDiscount && (
          <FilterBadge
            label={`Price: $${discountPriceRange[0]} - $${discountPriceRange[1]}`}
            onRemove={() => handleDiscountFilterToggle(false)}
          />
        )}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-xs hover:bg-[#2a2d36]">
            Clear all
          </Button>
        )}
      </div>
    )
  }

  const hasActiveFilters =
    activeCategories.length > 0 || activeSubcategories.length > 0 || activeLabels.length > 0 || filterByDiscount

  return (
    <div className="min-h-screen bg-[#0f1115] text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          

          {didYouMean && (
            <p className="text-sm text-gray-400 mb-2">
              Did you mean:
              <button onClick={() => handleSuggestionClick(didYouMean)} className="ml-1 text-[#5865f2] hover:underline">
                {didYouMean}
              </button>
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center">
              <p className="text-sm text-gray-400">{`${totalResults} results for "${query}"`}</p>
            </div>

            <div className="flex items-center gap-4">
              {/* Mobile Filter Sheet */}
              {isMobile && (
                <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-[#2a2d36] bg-[#1a1c23] flex items-center gap-2"
                    >
                      <Filter className="w-4 h-4" />
                      Filters
                      {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-[#5865f2]"></span>}
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    side="left"
                    className="bg-[#1a1c23] border-r border-[#2a2d36] text-white w-[85vw] max-w-md p-0 flex flex-col"
                  >
                    <SheetHeader className="p-4 border-b border-[#2a2d36]">
                      <SheetTitle className="text-white">Filters</SheetTitle>
                    </SheetHeader>

                    <ScrollArea className="flex-1 px-4 py-2">
                      <FilterContent
                        filterGroups={filterGroups}
                        activeCategories={activeCategories}
                        activeSubcategories={activeSubcategories}
                        activeLabels={activeLabels}
                        toggleFilterOption={toggleFilterOption}
                        updateFilters={updateFilters}
                        handleClearFilters={handleClearFilters}
                        isDiscountFilterEnabled={isDiscountFilterEnabled}
                        handleDiscountFilterToggle={handleDiscountFilterToggle}
                        discountPriceRange={discountPriceRange}
                        handlePriceRangeChange={handlePriceRangeChange}
                        discountPriceBounds={discountPriceBounds}
                        rangeError={rangeError}
                      />
                    </ScrollArea>

                    <SheetFooter className="p-4 border-t border-[#2a2d36] flex justify-between">
                      <Button
                        variant="ghost"
                        onClick={() => setIsFilterSheetOpen(false)}
                        className="hover:bg-[#2a2d36]"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          // Apply filters and close sheet
                          setIsFilterSheetOpen(false)
                        }}
                        className="bg-[#5865f2] hover:bg-[#4752c4]"
                      >
                        Apply Filters
                      </Button>
                    </SheetFooter>
                  </SheetContent>
                </Sheet>
              )}

              {/* Desktop Filter Button */}
              {!isMobile && (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-[#2a2d36] bg-[#1a1c23] flex items-center gap-2"
                    >
                      <Filter className="w-4 h-4" />
                      Filters
                      {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-[#5865f2]"></span>}
                    </Button>
                  </SheetTrigger>
                </Sheet>
              )}

              <select
                value={sortBy}
                onChange={(e) => updateFilters({ sortBy: e.target.value })}
                className="h-9 rounded-md border border-[#2a2d36] bg-[#1a1c23] px-3 text-sm text-white"
              >
                <option value="relevance">Relevance</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating">Rating</option>
                <option value="newest">Newest</option>
              </select>
            </div>
          </div>

          <ActiveFilters />
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Desktop Filter Sidebar */}
          {!isMobile && (
            <div className="w-64">
              <div className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">Filters</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                    className="h-8 px-2 text-xs hover:bg-[#2a2d36]"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Clear all
                  </Button>
                </div>
                <FilterContent
                  filterGroups={filterGroups}
                  activeCategories={activeCategories}
                  activeSubcategories={activeSubcategories}
                  activeLabels={activeLabels}
                  toggleFilterOption={toggleFilterOption}
                  updateFilters={updateFilters}
                  handleClearFilters={handleClearFilters}
                  isDiscountFilterEnabled={isDiscountFilterEnabled}
                  handleDiscountFilterToggle={handleDiscountFilterToggle}
                  discountPriceRange={discountPriceRange}
                  handlePriceRangeChange={handlePriceRangeChange}
                  discountPriceBounds={discountPriceBounds}
                  rangeError={rangeError}
                />
              </div>
            </div>
          )}

          <div className="flex-1">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 text-[#5865f2] animate-spin" />
              </div>
            ) : results.length > 0 ? (
              <>
                <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {results.map((product) => (
                    <div
                      key={product.product_id}
                      onClick={() => navigate(`/product/${product.product_id}`)}
                      className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg overflow-hidden hover:border-[#5865f2] transition-colors duration-300 cursor-pointer"
                    >
                      <div className="aspect-square relative">
                        <img
                          src={product.primary_image || "/placeholder.svg"}
                          alt={product.product_name}
                          className="w-full h-full object-cover"
                        />
                        {product.is_bestseller && (
                          <div className="absolute top-2 right-2 bg-[#EFBF04] text-[#444444] font-bold text-xs px-2 py-1 rounded border border-[#EFBF04]">
                            Popular
                          </div>
                        )}
                        <div className="absolute bottom-2 left-2 bg-[#1a1c23] text-white text-xs px-2 py-1 rounded border border-[#2a2d36]">
                          {product.label}
                        </div>
                        {product.price > product.discount_price && (
                          <div className="absolute bottom-2 right-2 bg-[#ff4d4d] text-white text-xs px-2 py-1 rounded">
                            {calculateDiscountPercentage(product.price, product.discount_price)}% OFF
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h2 className="font-bold mb-2 line-clamp-2 h-12 overflow-hidden text-ellipsis">
                          {product.product_name}
                        </h2>
                        <div className="flex justify-between items-center">
                          <div className="flex flex-col">
                            <p className="text-[#5865f2] font-bold text-xl">${product.discount_price.toFixed(2)}</p>
                            {product.price > product.discount_price && (
                              <p className="text-gray-400 text-xs line-through">${product.price.toFixed(2)}</p>
                            )}
                          </div>
                          {product.average_rating && (
                            <div className="flex items-center">
                              <span className="text-yellow-400 mr-1">★</span>
                              <span className="text-sm">{product.average_rating.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="mt-8 flex justify-center">
                    <Pagination>
                      <PaginationContent>
                        {page > 1 && (
                          <PaginationItem>
                            <PaginationPrevious onClick={() => updateFilters({ page: (page - 1).toString() })} />
                          </PaginationItem>
                        )}

                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum = page
                          if (page <= 3) {
                            pageNum = i + 1
                          } else if (page >= totalPages - 2) {
                            pageNum = totalPages - 4 + i
                          } else {
                            pageNum = page - 2 + i
                          }
                          if (pageNum < 1 || pageNum > totalPages) return null
                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationLink
                                isActive={page === pageNum}
                                onClick={() => updateFilters({ page: pageNum.toString() })}
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          )
                        })}

                        {page < totalPages && (
                          <PaginationItem>
                            <PaginationNext onClick={() => updateFilters({ page: (page + 1).toString() })} />
                          </PaginationItem>
                        )}
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 bg-[#1a1c23] rounded-lg">
                <h3 className="text-lg font-medium mb-2">No results found</h3>
                <p className="text-gray-400 mb-6">Try adjusting your search or filters</p>

                {suggestions.length > 0 && (
                  <div className="max-w-md mx-auto">
                    <h4 className="text-sm font-medium mb-2">Suggestions:</h4>
                    <div className="flex flex-wrap justify-center gap-2">
                      {suggestions.map((suggestion, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => handleSuggestionClick(suggestion.suggestion)}
                          className="border-[#2a2d36] bg-[#1a1c23] hover:bg-[#2a2d36]"
                        >
                          {suggestion.suggestion}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Updated FilterContent component with multi-selection support ---
interface FilterContentProps {
  filterGroups: FilterGroups
  activeCategories: string[]
  activeSubcategories: string[]
  activeLabels: string[]
  toggleFilterOption: (filterType: "category" | "subcategory" | "label", option: string) => void
  updateFilters: (updates: Record<string, string | null>) => void
  handleClearFilters: () => void
  isDiscountFilterEnabled: boolean
  handleDiscountFilterToggle: (checked: boolean) => void
  discountPriceRange: [number, number]
  handlePriceRangeChange: (value: [number, number] | number, isMin?: boolean) => void
  discountPriceBounds: [number, number]
  rangeError: { min: string | null; max: string | null }
}

function FilterContent({
  filterGroups,
  activeCategories,
  activeSubcategories,
  activeLabels,
  toggleFilterOption,
  updateFilters,
  handleClearFilters,
  isDiscountFilterEnabled,
  handleDiscountFilterToggle,
  discountPriceRange,
  handlePriceRangeChange,
  discountPriceBounds,
  rangeError,
}: FilterContentProps) {
  return (
    <div className="space-y-6">
      <Accordion type="single" collapsible defaultValue="categories" className="border-none">
        {/* Categories Section */}
        <AccordionItem value="categories" className="border-b border-[#2a2d36]">
          <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
            <div className="flex items-center">
              <span className={activeCategories.length > 0 ? "text-[#5865f2]" : "text-white"}>
                Categories
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
              {filterGroups.categories.length > 0 ? (
                filterGroups.categories.map((cat) => (
                  <div key={cat.name} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Checkbox
                        id={`category-${cat.name}`}
                        checked={activeCategories.includes(cat.name)}
                        onCheckedChange={() => toggleFilterOption("category", cat.name)}
                      />
                      <label 
                        htmlFor={`category-${cat.name}`} 
                        className={`ml-2 text-sm cursor-pointer ${
                          activeCategories.includes(cat.name) ? "text-[#5865f2]" : "text-gray-300"
                        }`}
                      >
                        {cat.name}
                      </label>
                    </div>
                    <span className="text-xs text-gray-400">({cat.count})</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400">No categories available</p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Subcategories Section */}
        <AccordionItem value="subcategories" className="border-b border-[#2a2d36]">
          <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
            <div className="flex items-center">
              <span className={activeSubcategories.length > 0 ? "text-[#5865f2]" : "text-white"}>
                Subcategories
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
              {filterGroups.subcategories.length > 0 ? (
                filterGroups.subcategories.map((subcat) => (
                  <div key={subcat.name} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Checkbox
                        id={`subcategory-${subcat.name}`}
                        checked={activeSubcategories.includes(subcat.name)}
                        onCheckedChange={() => toggleFilterOption("subcategory", subcat.name)}
                      />
                      <label
                        htmlFor={`subcategory-${subcat.name}`}
                        className={`ml-2 text-sm cursor-pointer ${
                          activeSubcategories.includes(subcat.name) ? "text-[#5865f2]" : "text-gray-300"
                        }`}
                      >
                        {subcat.name}
                      </label>
                    </div>
                    <span className="text-xs text-gray-400">({subcat.count})</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400">No subcategories available</p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Labels Section */}
        <AccordionItem value="labels" className="border-b border-[#2a2d36]">
          <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
            <div className="flex items-center">
              <span className={activeLabels.length > 0 ? "text-[#5865f2]" : "text-white"}>
                Labels
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
              {filterGroups.labels.length > 0 ? (
                filterGroups.labels.map((lab) => (
                  <div key={lab.name} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Checkbox
                        id={`label-${lab.name}`}
                        checked={activeLabels.includes(lab.name)}
                        onCheckedChange={() => toggleFilterOption("label", lab.name)}
                      />
                      <label 
                        htmlFor={`label-${lab.name}`} 
                        className={`ml-2 text-sm cursor-pointer ${
                          activeLabels.includes(lab.name) ? "text-[#5865f2]" : "text-gray-300"
                        }`}
                      >
                        {lab.name}
                      </label>
                    </div>
                    <span className="text-xs text-gray-400">({lab.count})</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400">No labels available</p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Discount Filter Section */}
        <AccordionItem value="discount" className="border-b border-[#2a2d36]">
          <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
            <div className="flex items-center">
              <span className={isDiscountFilterEnabled ? "text-[#5865f2]" : "text-white"}>
                Price Filter
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Checkbox
                  id="filter-by-discount"
                  checked={isDiscountFilterEnabled}
                  onCheckedChange={handleDiscountFilterToggle}
                />
                <label 
                  htmlFor="filter-by-discount" 
                  className={`text-sm font-medium cursor-pointer ${
                    isDiscountFilterEnabled ? "text-[#5865f2]" : "text-gray-300"
                  }`}
                >
                  Filter by Price
                </label>
              </div>
              <div className={isDiscountFilterEnabled ? "" : "opacity-50 pointer-events-none"}>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-300">Min: ${discountPriceRange[0]}</span>
                    <span className="text-sm text-gray-300">Max: ${discountPriceRange[1]}</span>
                  </div>
                  <Slider
                    min={discountPriceBounds[0]}
                    max={discountPriceBounds[1]}
                    step={1}
                    value={discountPriceRange}
                    onValueChange={(value) => {
                      if (Array.isArray(value) && value.length === 2) {
                        handlePriceRangeChange(value as [number, number])
                      }
                    }}
                    className="mb-2 
                      [&_[data-slot=slider-thumb]]:bg-[#5865f2] 
                      [&_[data-slot=slider-thumb]]:border-[#5865f2] 
                      [&_[data-slot=slider-thumb]]:focus:ring-[#5865f2] 
                      [&_[data-slot=slider-track]]:bg-[#2a2d36] 
                      [&_[data-slot=slider-range]]:bg-[#5865f27e]"
                    disabled={!isDiscountFilterEnabled}
                  />

                  <div className="flex gap-2 mt-2">
                    <div className="w-full">
                      <input
                        type="number"
                        value={discountPriceRange[0]}
                        onChange={(e) => {
                          const value = Number(e.target.value)
                          handlePriceRangeChange(value, true)
                        }}
                        className={`w-full bg-[#0f1115] border ${
                          rangeError.min ? "border-red-500" : "border-[#2a2d36]"
                        } rounded p-1 text-sm text-white`}
                        disabled={!isDiscountFilterEnabled}
                      />
                      {rangeError.min && <p className="text-xs text-red-500 mt-1">{rangeError.min}</p>}
                    </div>
                    <div className="w-full">
                      <input
                        type="number"
                        value={discountPriceRange[1]}
                        onChange={(e) => {
                          const value = Number(e.target.value)
                          handlePriceRangeChange(value, false)
                        }}
                        style={{ direction: "rtl", textAlign: "right" }}
                        className={`w-full bg-[#0f1115] border ${
                          rangeError.max ? "border-red-500" : "border-[#2a2d36]"
                        } rounded p-1 text-sm text-white`}
                        disabled={!isDiscountFilterEnabled}
                      />
                      {rangeError.max && <p className="text-xs text-red-500 mt-1">{rangeError.max}</p>}
                    </div>
                  </div>
                </div>
                <div className="bg-[#2a2d36] text-gray-400 text-xs p-2 rounded">
                  Filters will apply automatically after you stop making changes.
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
export { FilterContent }