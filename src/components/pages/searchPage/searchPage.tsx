// src/components/pages/searchPage/searchPage.tsx
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { useIsMobile } from "@/components/global/Mobile/use-mobile";
import { Button } from "@/components/ui/button";
import { Filter, Loader2, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClientFilteredSearch } from "@/lib/pages/searchPage/hooks/useClientFilteredSearch";
import { ActiveFilters, FilterContent } from "@/components/pages/searchPage/search/Filters";
import { Pagination } from "@/components/pages/searchPage/search/Pagination";
import { ProductCard } from "@/components/global/productsPage/ProductCard/ProductCard";
import SEO from '@/components/seo/SEO';

const toggleUrlParamArray = (currentParam: string | null, option: string): string | null => {
    const currentArray = currentParam ? currentParam.split(",") : [];
    const optionIndex = currentArray.indexOf(option);
    if (optionIndex > -1) {
        currentArray.splice(optionIndex, 1);
    } else {
        currentArray.push(option);
    }
    return currentArray.length > 0 ? currentArray.join(",") : null;
};

export default function SearchPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const isMobile = useIsMobile();
    const siteUrl = window.location.origin;

    const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

    const query = searchParams.get("q") || "";
    const sortBy = searchParams.get("sortBy") || "relevance";
    const page = Number.parseInt(searchParams.get("page") || "1");
    const pageSize = Number.parseInt(searchParams.get("pageSize") || "20");

    const activeCategories = useMemo(() => searchParams.get("category")?.split(",") ?? [], [searchParams]);
    const activeSubcategories = useMemo(() => searchParams.get("subcategory")?.split(",") ?? [], [searchParams]);
    const activeLabels = useMemo(() => searchParams.get("label")?.split(",") ?? [], [searchParams]);
    const activeConditions = useMemo(() => searchParams.get("condition")?.split(",") ?? [], [searchParams]);

    const [isDiscountFilterEnabled, setIsDiscountFilterEnabled] = useState(false);
    const [discountPriceRange, setDiscountPriceRange] = useState<[number, number]>([0, 0]);
    // activeTechSpecs structure: { specKey: ['val1', 'val2'], rangeSpecKey: ['min_val', 'max_val'] }
    const [activeTechSpecs, setActiveTechSpecs] = useState<Record<string, string[]>>({});

    const {
        results, totalResults, totalPages, isLoading,
        filterGroups, dynamicSpecFilters,
        discountPriceBounds, didYouMean,
    } = useClientFilteredSearch({
        query, sortBy, page, pageSize,
        activeCategories, activeSubcategories, activeLabels, activeConditions,
        activeTechSpecs, isDiscountFilterEnabled, discountPriceRange,
    });

    const updateFilters = useCallback((updates: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(updates).forEach(([key, value]) => {
            if (value === null || value === '') {
                params.delete(key);
            } else {
                params.set(key, value);
            }
        });
        if (!("page" in updates)) {
            params.set("page", "1");
        }
        navigate(`/search?${params.toString()}`, { replace: true });
    }, [searchParams, navigate]);

    const toggleFilterOption = useCallback((filterKey: "category" | "subcategory" | "label" | "condition", option: string) => {
        const currentParam = searchParams.get(filterKey);
        const updatedParam = toggleUrlParamArray(currentParam, option);
        updateFilters({ [filterKey]: updatedParam });
    }, [searchParams, updateFilters]);

    const toggleTechSpecFilter = useCallback((specKey: string, option: string | number | boolean) => {
        const stringOption = String(option);
        const urlKey = `spec_${specKey}`;
        const currentParam = searchParams.get(urlKey);
        const updatedParam = toggleUrlParamArray(currentParam, stringOption);
        updateFilters({ [urlKey]: updatedParam });
    }, [searchParams, updateFilters]);

    const handleTechSpecRangeChange = useCallback((specKey: string, range: [number, number]) => {
        const urlKeyMin = `spec_${specKey}_min`;
        const urlKeyMax = `spec_${specKey}_max`;
        if (range[0] === -1 && range[1] === -1) { // Signal to clear
            updateFilters({ [urlKeyMin]: null, [urlKeyMax]: null });
        } else {
            updateFilters({
                [urlKeyMin]: String(range[0]),
                [urlKeyMax]: String(range[1]),
            });
        }
    }, [updateFilters]);

    const handleDiscountFilterToggle = useCallback((checked: boolean) => {
        if (checked) {
            updateFilters({
                filterByDiscount: "true",
                minDiscountPrice: discountPriceBounds[0].toString(),
                maxDiscountPrice: discountPriceBounds[1].toString(),
            });
        } else {
            updateFilters({
                filterByDiscount: null, minDiscountPrice: null, maxDiscountPrice: null,
            });
        }
    }, [updateFilters, discountPriceBounds]);
    
    const handlePriceRangeChange = (value: [number, number] | number, isMin?: boolean) => {
        if (Array.isArray(value)) { setDiscountPriceRange(value); } 
        else if (typeof value === 'number' && typeof isMin === 'boolean') { setDiscountPriceRange(prev => { const newRange: [number, number] = [...prev]; newRange[isMin ? 0 : 1] = value; return newRange; }); }
    };

    const onApplyPriceFilter = useCallback((range: [number, number]) => {
        const [min, max] = range;
        let finalMin = Math.max(discountPriceBounds[0], min);
        let finalMax = Math.min(discountPriceBounds[1], max);
        if (finalMin > finalMax) [finalMin, finalMax] = [finalMax, finalMin];
        setDiscountPriceRange([finalMin, finalMax]);
        updateFilters({
            filterByDiscount: "true", minDiscountPrice: finalMin.toString(), maxDiscountPrice: finalMax.toString(),
        });
    }, [discountPriceBounds, updateFilters]);

    const handleClearFilters = useCallback(() => {
        const paramsToClear: Record<string, null> = {
            category: null, subcategory: null, label: null, condition: null,
            filterByDiscount: null, minDiscountPrice: null, maxDiscountPrice: null,
        };
        for (const key of searchParams.keys()) {
            if (key.startsWith('spec_')) { paramsToClear[key] = null; }
        }
        paramsToClear.page = null;
        paramsToClear.sortBy = null;
        updateFilters(paramsToClear);
    }, [updateFilters, searchParams]);

    const handleSuggestionClick = useCallback((suggestion: string) => { updateFilters({ q: suggestion, page: "1" }); }, [updateFilters]);
    const handleSortChange = (value: string) => { updateFilters({ sortBy: value }); };

    // --- MODIFICATION START: Parse URL for all tech spec types ---
    useEffect(() => {
        const specs: Record<string, string[]> = {};
        
        searchParams.forEach((value, key) => {
            if (key.startsWith('spec_')) {
                const baseKey = key.substring(5); // e.g., 'brand', 'core_count', 'socket_compatibility_intel', 'speed_mhz_min', 'speed_mhz_max'

                if (baseKey.endsWith('_min')) {
                    const specKey = baseKey.replace('_min', '');
                    const maxValue = searchParams.get(`spec_${specKey}_max`);
                    if (maxValue !== null) {
                        // This is a numeric range filter
                        specs[specKey] = [value, maxValue];
                    }
                } else if (!baseKey.endsWith('_max')) { // Ignore _max keys in this pass
                     // This is a checkbox or boolean or array-checkbox filter
                     // Value is a comma-separated string of selected options
                    specs[baseKey] = value.split(',');
                }
            }
        });
        setActiveTechSpecs(specs);

        const urlEnabled = searchParams.get("filterByDiscount") === "true";
        const urlMin = Number(searchParams.get("minDiscountPrice")) || discountPriceBounds[0];
        const urlMax = Number(searchParams.get("maxDiscountPrice")) || discountPriceBounds[1];
        setIsDiscountFilterEnabled(urlEnabled);
        if (discountPriceBounds[0] !== 0 || discountPriceBounds[1] !== 0) {
            const clampedMin = Math.max(discountPriceBounds[0], urlMin);
            const clampedMax = Math.min(discountPriceBounds[1], urlMax);
            setDiscountPriceRange([clampedMin, clampedMax]);
        }
    }, [searchParams, discountPriceBounds]);
    // --- MODIFICATION END ---


    useEffect(() => { window.scrollTo({ top: 0, behavior: "auto" }); }, [page]);

    const pageTitle = query ? `Search results for "${query}" | GNT Store` : "Search Products | GNT Store";
    const pageDescription = `Find ${query ? `"${query}"` : 'consoles, computers, and accessories'} on GNT Store. ${totalResults} results found.`;
    const canonicalUrl = `${siteUrl}${location.pathname}?q=${encodeURIComponent(query)}`;

    return (
        <div className="min-h-screen bg-[#0f1115] text-white">
            <SEO title={pageTitle} description={pageDescription.substring(0, 160)} canonicalUrl={canonicalUrl} noIndex={true} ogData={{ title: pageTitle, description: pageDescription.substring(0, 160), url: canonicalUrl, type: 'website', image: `${siteUrl}/favicon/og-image.png` }} />
            <div className="container mx-auto px-4 py-8">
                <div className="mb-6">
                    {didYouMean && (<p className="text-sm text-gray-400 mb-2"> Did you mean: <button onClick={() => handleSuggestionClick(didYouMean)} className="ml-1 text-[#5865f2] hover:underline">{didYouMean}</button> </p>)}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div><p className="text-sm text-gray-400">{`${totalResults} results ${query ? `for "${query}"` : ''}`}</p></div>
                        <div className="flex items-center gap-4">
                            {isMobile && (
                                <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
                                    <SheetTrigger asChild><Button variant="outline" size="sm" className="border-[#2a2d36] bg-[#1a1c23] flex items-center gap-2"> <Filter className="w-4 h-4" /> Filters</Button></SheetTrigger>
                                    <SheetContent side="left" className="bg-[#1a1c23] border-r border-[#2a2d36] text-white w-[85vw] max-w-md p-0 flex flex-col">
                                        <SheetHeader className="p-4 border-b border-[#2a2d36]"><SheetTitle>Filters</SheetTitle></SheetHeader>
                                        <ScrollArea className="flex-1 px-4 py-2 dark-theme-scrollbar">
                                            <FilterContent {...{ filterGroups, activeCategories, activeSubcategories, activeLabels, activeConditions, toggleFilterOption, handleClearFilters, isDiscountFilterEnabled, handleDiscountFilterToggle, discountPriceRange, handlePriceRangeChange, discountPriceBounds, dynamicSpecFilters, activeTechSpecs, toggleTechSpecFilter, onApplyPriceFilter, handleTechSpecRangeChange }} />
                                        </ScrollArea>
                                        <SheetFooter className="p-4 border-t border-[#2a2d36]"><Button onClick={() => setIsFilterSheetOpen(false)} className="bg-[#5865f2] hover:bg-[#4752c4]">Apply Filters</Button></SheetFooter>
                                    </SheetContent>
                                </Sheet>
                            )}
                            <Select value={sortBy} onValueChange={handleSortChange}>
                                <SelectTrigger className="h-9 rounded-md border border-[#2a2d36] bg-[#1a1c23] px-3 text-sm text-white w-auto"><SelectValue placeholder="Sort by" /></SelectTrigger>
                                <SelectContent className="bg-[#1a1c23] border-[#2a2d36] text-white"><SelectItem value="relevance">Relevance</SelectItem><SelectItem value="price_asc">Price: Low to High</SelectItem><SelectItem value="price_desc">Price: High to Low</SelectItem></SelectContent>
                            </Select>
                        </div>
                    </div>
                    <ActiveFilters {...{ activeCategories, activeSubcategories, activeLabels, activeConditions, isDiscountFilterEnabled, discountPriceRange, toggleFilterOption, handleClearFilters, handleDiscountFilterToggle, activeTechSpecs, toggleTechSpecFilter, handleTechSpecRangeChange }} />
                </div>
                <div className="flex flex-col md:flex-row gap-6">
                    {!isMobile && (
                        <div className="w-full md:w-64 lg:w-72 flex-shrink-0">
                            <div className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg p-4 sticky top-20">
                                <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-lg">Filters</h3><Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-8 px-2 text-xs hover:bg-[#2a2d36]"><X className="w-3 h-3 mr-1" /> Clear all</Button></div>
                                <div className="dark-theme-scrollbar">
                                    <FilterContent {...{ filterGroups, activeCategories, activeSubcategories, activeLabels, activeConditions, toggleFilterOption, handleClearFilters, isDiscountFilterEnabled, handleDiscountFilterToggle, discountPriceRange, handlePriceRangeChange, discountPriceBounds, dynamicSpecFilters, activeTechSpecs, toggleTechSpecFilter, onApplyPriceFilter, handleTechSpecRangeChange }} />
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="flex-1">
                        {isLoading ? (<div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 text-[#5865f2] animate-spin" /></div>
                        ) : results.length > 0 ? (
                            <>
                                <div className="grid grid-cols-2 xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"> {results.map((product) => (<ProductCard key={product.slug} product={product} />))} </div>
                                {totalPages > 1 && (<div className="mt-8 flex justify-center"><Pagination currentPage={page} totalPages={totalPages} onPageChange={(newPage: number) => updateFilters({ page: newPage.toString() })} /></div>)}
                            </>
                        ) : (<div className="text-center py-12 bg-[#1a1c23] rounded-lg"><h3 className="text-lg font-medium mb-2">No results found</h3><p className="text-gray-400 mb-6">Try adjusting your search query or filters.</p></div>)}
                    </div>
                </div>
            </div>
        </div>
    );
}