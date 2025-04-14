// src/pages/searchPage/searchPage.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { useIsMobile } from "@/components/global/Mobile/use-mobile";
import { Button } from "@/components/ui/button";
import { Filter, Loader2, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClientFilteredSearch } from "@/pages/searchPage/hooks/useClientFilteredSearch";
import { ActiveFilters, FilterContent } from "@/pages/searchPage/search/Filters";
import { Pagination } from "@/pages/searchPage/search/Pagination";
import { ProductCard } from "@/pages/ProductCard/ProductCard";
import { useDebounce } from "@/components/global/hooks/use-debounce";
import SEO from '@/components/seo/SEO'; // Import SEO component

export default function SearchPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const isMobile = useIsMobile();
    const siteUrl = window.location.origin;

    // --- State managed by the Page component ---
    const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
    const [isDiscountFilterEnabled, setIsDiscountFilterEnabled] = useState(() => searchParams.get("filterByDiscount") === "true");
    const [discountPriceRange, setDiscountPriceRange] = useState<[number, number]>(() => { const min = Number(searchParams.get("minDiscountPrice")) || 0; const max = Number(searchParams.get("maxDiscountPrice")) || 0; return min <= max ? [min, max] : [0, 0]; });
    const debouncedPriceRange = useDebounce(discountPriceRange, 500);

    // --- Read parameters from URL ---
    const query = searchParams.get("q") || "";
    const activeCategories = searchParams.get("category")?.split(",") ?? [];
    const activeSubcategories = searchParams.get("subcategory")?.split(",") ?? [];
    const activeLabels = searchParams.get("label")?.split(",") ?? [];
    const activeConditions = searchParams.get("condition")?.split(",") ?? [];
    const sortBy = searchParams.get("sortBy") || "relevance";
    const page = Number.parseInt(searchParams.get("page") || "1");
    const pageSize = Number.parseInt(searchParams.get("pageSize") || "20");

    // --- Call the simplified hook ---
    const { results, totalResults, totalPages, isLoading, filterGroups, discountPriceBounds, didYouMean } = useClientFilteredSearch({ query, sortBy, page, pageSize, activeCategories, activeSubcategories, activeLabels, activeConditions, isDiscountFilterEnabled, discountPriceRange: debouncedPriceRange });

    // --- Handlers defined in the Page component ---
    const updateFilters = useCallback((updates: Record<string, string | null>) => { const params = new URLSearchParams(searchParams.toString()); Object.entries(updates).forEach(([key, value]) => { if (value === null || value === '') { params.delete(key); } else { params.set(key, value); } }); if (!("page" in updates)) { params.set("page", "1"); } navigate(`/search?${params.toString()}`, { replace: true }); }, [searchParams, navigate]);
    const toggleFilterOption = useCallback((filterKey: "category" | "subcategory" | "label" | "condition", option: string) => { const currentParam = searchParams.get(filterKey); let currentArray = currentParam ? currentParam.split(",") : []; const optionIndex = currentArray.indexOf(option); if (optionIndex > -1) { currentArray.splice(optionIndex, 1); } else { currentArray.push(option); } updateFilters({ [filterKey]: currentArray.length > 0 ? currentArray.join(",") : null }); }, [searchParams, updateFilters]);
    const handleDiscountFilterToggle = useCallback((checked: boolean) => { setIsDiscountFilterEnabled(checked); if (checked) { setDiscountPriceRange(discountPriceBounds); updateFilters({ filterByDiscount: "true", minDiscountPrice: discountPriceBounds[0].toString(), maxDiscountPrice: discountPriceBounds[1].toString(), }); } else { updateFilters({ filterByDiscount: null, minDiscountPrice: null, maxDiscountPrice: null, }); setDiscountPriceRange(discountPriceBounds); } }, [updateFilters, discountPriceBounds]);
    const handlePriceRangeChange = useCallback((value: [number, number] | number, isMinValue?: boolean) => {
        if (Array.isArray(value)) { setDiscountPriceRange(value[0] <= value[1] ? value : [value[1], value[0]]); }
        else if (typeof value === 'number' && typeof isMinValue === 'boolean') { setDiscountPriceRange((prev) => { const newRange: [number, number] = isMinValue ? [value, prev[1]] : [prev[0], value]; if (newRange[0] > newRange[1]) { return isMinValue ? [newRange[1], newRange[1]] : [prev[0], newRange[0]]; } return newRange; }); }
        else { console.warn("Invalid value passed to handlePriceRangeChange:", value); }
    }, []);
    const handleClearFilters = useCallback(() => { updateFilters({ category: null, subcategory: null, label: null, condition: null, filterByDiscount: null, minDiscountPrice: null, maxDiscountPrice: null, page: "1", sortBy: "relevance" }); setIsDiscountFilterEnabled(false); setDiscountPriceRange(discountPriceBounds); }, [updateFilters, discountPriceBounds]);
    const handleSuggestionClick = useCallback((suggestion: string) => { updateFilters({ q: suggestion, page: "1" }); }, [updateFilters]);
    const handleSortChange = (value: string) => { updateFilters({ sortBy: value }); };

    // --- Effect to sync local state from URL --- (Refined logic from previous step)
    useEffect(() => {
        const urlEnabled = searchParams.get("filterByDiscount") === "true";
        // Use bounds as default if URL params are missing
        const urlMin = Number(searchParams.get("minDiscountPrice")) || discountPriceBounds[0];
        const urlMax = Number(searchParams.get("maxDiscountPrice")) || discountPriceBounds[1];

        setIsDiscountFilterEnabled(urlEnabled); // Sync enabled state

        // Sync range state, clamping URL values to fetched bounds
        const clampedMin = Math.max(discountPriceBounds[0], Math.min(urlMin, discountPriceBounds[1]));
        const clampedMax = Math.min(discountPriceBounds[1], Math.max(urlMax, discountPriceBounds[0]));
        const clampedRange: [number, number] = clampedMin <= clampedMax ? [clampedMin, clampedMax] : [clampedMax, clampedMax];

        // Update local state only if it differs from the clamped URL values
        setDiscountPriceRange(prevRange => {
            if (prevRange[0] !== clampedRange[0] || prevRange[1] !== clampedRange[1]) {
                return clampedRange;
            }
            return prevRange;
        });

    }, [searchParams, discountPriceBounds]); // Rerun when URL or bounds change

    // --- Scroll to Top ---
    useEffect(() => { window.scrollTo({ top: 0, behavior: "auto" }); }, []);

    // --- Active Filters Check ---
    const hasActiveFilters = activeCategories.length > 0 || activeSubcategories.length > 0 || activeLabels.length > 0 || activeConditions.length > 0 || isDiscountFilterEnabled;

    // --- SEO Data ---
    const pageTitle = query ? `Search results for "${query}" | GNT Store` : "Search Products | GNT Store";
    const pageDescription = `Find ${query ? `"${query}"` : 'consoles, computers, and accessories'} on GNT Store. ${totalResults} results found.`;
    // Canonical URL for search should generally be the search page itself, possibly with the query parameter
    const canonicalUrl = `${siteUrl}${location.pathname}?q=${encodeURIComponent(query)}`; // Include query, exclude filters/pagination

   // --- Render ---
    return (
        <div className="min-h-screen bg-[#0f1115] text-white">
            <SEO
                title={pageTitle}
                description={pageDescription.substring(0, 160)}
                canonicalUrl={canonicalUrl} // Use search canonical URL
                noIndex={true} // Often good practice to noindex search result pages
                ogData={{
                    title: pageTitle,
                    description: pageDescription.substring(0, 160),
                    url: canonicalUrl,
                    type: 'website', // or 'object' if more appropriate
                    image: `${siteUrl}/favicon/og-image.png` // Generic site image
                }}
            />
            <div className="container mx-auto px-4 py-8">
                {/* Top section */}
                <div className="mb-6">
                     {didYouMean && ( <p className="text-sm text-gray-400 mb-2"> Did you mean: <button onClick={() => handleSuggestionClick(didYouMean)} className="ml-1 text-[#5865f2] hover:underline">{didYouMean}</button> </p> )}
                     <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <p className="text-sm text-gray-400">{`${totalResults} results ${query ? `for "${query}"` : ''}`}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            {/* Mobile Filter Trigger */}
                            {isMobile ? (
                                <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
                                    <SheetTrigger asChild>
                                        <Button variant="outline" size="sm" className="border-[#2a2d36] bg-[#1a1c23] flex items-center gap-2">
                                            <Filter className="w-4 h-4" /> Filters {hasActiveFilters && (<span className="w-2 h-2 rounded-full bg-[#5865f2]"></span>)}
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent side="left" className="bg-[#1a1c23] border-r border-[#2a2d36] text-white w-[85vw] max-w-md p-0 flex flex-col">
                                        <SheetHeader className="p-4 border-b border-[#2a2d36]">
                                            <SheetTitle>Filters</SheetTitle>
                                        </SheetHeader>
                                        <ScrollArea className="flex-1 px-4 py-2 dark-theme-scrollbar">
                                            <FilterContent
                                                filterGroups={filterGroups}
                                                activeCategories={activeCategories}
                                                activeSubcategories={activeSubcategories}
                                                activeLabels={activeLabels}
                                                activeConditions={activeConditions}
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
                                        <SheetFooter className="p-4 border-t border-[#2a2d36]">
                                            <Button variant="ghost" onClick={() => setIsFilterSheetOpen(false)}>Cancel</Button>
                                            <Button onClick={() => setIsFilterSheetOpen(false)} className="bg-[#5865f2] hover:bg-[#4752c4]">Apply Filters</Button>
                                        </SheetFooter>
                                    </SheetContent>
                                </Sheet>
                            ) : null } {/* Desktop filters are now in sidebar */}
                            {/* Sort Dropdown */}
                            <Select value={sortBy} onValueChange={handleSortChange}>
                                <SelectTrigger className="h-9 rounded-md border border-[#2a2d36] bg-[#1a1c23] px-3 text-sm text-white w-auto">
                                    <SelectValue placeholder="Sort by" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1a1c23] border-[#2a2d36] text-white">
                                    <SelectItem value="relevance">Relevance</SelectItem>
                                    <SelectItem value="price_asc">Price: Low to High</SelectItem>
                                    <SelectItem value="price_desc">Price: High to Low</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <ActiveFilters
                        activeCategories={activeCategories}
                        activeSubcategories={activeSubcategories}
                        activeLabels={activeLabels}
                        activeConditions={activeConditions}
                        isDiscountFilterEnabled={isDiscountFilterEnabled}
                        discountPriceRange={discountPriceRange}
                        toggleFilterOption={toggleFilterOption}
                        handleClearFilters={handleClearFilters}
                        handleDiscountFilterToggle={handleDiscountFilterToggle}
                    />
                </div>

                {/* Main content */}
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Desktop Sidebar */}
                    {!isMobile && (
                        <div className="w-full md:w-64 lg:w-72 flex-shrink-0">
                            <div className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg p-4 sticky top-20">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-lg">Filters</h3>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleClearFilters}
                                        className="h-8 px-2 text-xs hover:bg-[#2a2d36]"
                                    >
                                        <X className="w-3 h-3 mr-1" /> Clear all
                                    </Button>
                                </div>
                                <div className="dark-theme-scrollbar">
                                    <FilterContent
                                        filterGroups={filterGroups}
                                        activeCategories={activeCategories}
                                        activeSubcategories={activeSubcategories}
                                        activeLabels={activeLabels}
                                        activeConditions={activeConditions}
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
                        </div>
                    )}

                    {/* Results Area */}
                    <div className="flex-1">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-64">
                                <Loader2 className="w-8 h-8 text-[#5865f2] animate-spin" />
                            </div>
                        ) : results.length > 0 ? (
                            <>
                                <div className="grid grid-cols-2 xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                                    {results.map((product) => (
                                        <ProductCard key={product.slug} product={product} />
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
                                <p className="text-gray-400 mb-6">Try adjusting your search query or filters.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}