"use client";

import React from "react"; // Added React import
import { useSearchParams, useNavigate } from "react-router-dom";
import { useIsMobile } from "@/components/global/Mobile/use-mobile";
import { Button } from "@/components/ui/button";
import { Filter, Loader2, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Updated import
import { useSearch } from "@/pages/searchPage/hooks/useClientFilteredSearch";
import { ActiveFilters } from "@/pages/searchPage/search/Filters"; 
import { FilterContent } from "@/pages/searchPage/search/Filters";
import { Pagination } from "@/pages/searchPage/search/Pagination";
import { ProductCard } from "@/pages/searchPage/search/ProductCard";

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Extract parameters from URL
  const query = searchParams.get("q") || "";
  const activeCategories = searchParams.get("category") ? searchParams.get("category")!.split(",") : [];
  const activeSubcategories = searchParams.get("subcategory") ? searchParams.get("subcategory")!.split(",") : [];
  const activeLabels = searchParams.get("label") ? searchParams.get("label")!.split(",") : [];
  const sortBy = searchParams.get("sortBy") || "relevance";
  const page = Number.parseInt(searchParams.get("page") || "1");
  const pageSize = Number.parseInt(searchParams.get("pageSize") || "20");

  // Use the custom search hook to manage fetching, filtering, pagination, etc.
  const {
    results,
    totalResults,
    totalPages,
    isLoading,
    suggestions,
    didYouMean,
    discountPriceRange,
    discountPriceBounds,
    isDiscountFilterEnabled,
    filterGroups,
    updateFilters,
    toggleFilterOption,
    handleSuggestionClick,
    handleClearFilters,
    handleDiscountFilterToggle,
    handlePriceRangeChange,
  } = useSearch({
    query,
    sortBy,
    page,
    pageSize,
    activeCategories,
    activeSubcategories,
    activeLabels,
    searchParams,
    navigate,
  });

  // State for mobile filter sheet
  const [isFilterSheetOpen, setIsFilterSheetOpen] = React.useState(false);

  const hasActiveFilters =
    activeCategories.length > 0 ||
    activeSubcategories.length > 0 ||
    activeLabels.length > 0 ||
    isDiscountFilterEnabled;

  // Handle sort selection change with proper type
  const handleSortChange = (value: string) => {
    updateFilters({ sortBy: value });
  };

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
              {isMobile ? (
                <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="border-[#2a2d36] bg-[#1a1c23] flex items-center gap-2">
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
                      />
                    </ScrollArea>
                    <SheetFooter className="p-4 border-t border-[#2a2d36] flex justify-between">
                      <Button variant="ghost" onClick={() => setIsFilterSheetOpen(false)} className="hover:bg-[#2a2d36]">
                        Cancel
                      </Button>
                      <Button onClick={() => setIsFilterSheetOpen(false)} className="bg-[#5865f2] hover:bg-[#4752c4]">
                        Apply Filters
                      </Button>
                    </SheetFooter>
                  </SheetContent>
                </Sheet>
              ) : (
                // Desktop Filter Button
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="border-[#2a2d36] bg-[#1a1c23] flex items-center gap-2">
                      <Filter className="w-4 h-4" />
                      Filters
                      {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-[#5865f2]"></span>}
                    </Button>
                  </SheetTrigger>
                </Sheet>
              )}
              
              {/* Fixed Select component */}
              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="h-9 rounded-md border border-[#2a2d36] bg-[#1a1c23] px-3 text-sm text-white">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1c23] border-[#2a2d36] text-white">
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="price_asc">Price: Low to High</SelectItem>
                  <SelectItem value="price_desc">Price: High to Low</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Render active filters */}
          <ActiveFilters
            activeCategories={activeCategories}
            activeSubcategories={activeSubcategories}
            activeLabels={activeLabels}
            isDiscountFilterEnabled={isDiscountFilterEnabled}
            discountPriceRange={discountPriceRange}
            toggleFilterOption={toggleFilterOption}
            handleClearFilters={handleClearFilters}
            handleDiscountFilterToggle={handleDiscountFilterToggle}
          />
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
                    <ProductCard key={product.product_id} product={product} />
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="mt-8 flex justify-center">
                    <Pagination
                      currentPage={page}
                      totalPages={totalPages}
                      onPageChange={(newPage: number) => updateFilters({ page: newPage.toString() })}
                    />
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
  );
}