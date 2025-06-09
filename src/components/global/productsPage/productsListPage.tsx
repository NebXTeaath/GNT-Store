// src/components/global/productsPage/productsListPage.tsx
import React, { useEffect, useMemo, useState, useCallback, useLayoutEffect } from "react";
import { useParams, useSearchParams, Link, useLocation, useNavigate, useNavigationType, NavigationType } from "react-router-dom";
import { Loader2, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { ProductCard } from "@/components/global/productsPage/ProductCard/ProductCard";
import { Pagination } from "@/components/pages/searchPage/search/Pagination";
import { Product } from "@/lib/types/product";
import { useProducts } from "./useProducts";
import { ProductCarousel } from "@/components/pages/HomePage/ProductCarousel";
import { useLoading } from "@/components/global/Loading/LoadingContext";
import SEO from '@/components/seo/SEO';
import { useIsMobile } from "@/components/global/Mobile/use-mobile";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClientFilteredSearch } from "@/lib/pages/searchPage/hooks/useClientFilteredSearch";
import { ActiveFilters, FilterContent } from "@/components/pages/searchPage/search/Filters";

// --- Helper Functions ---
const capitalize = (text: string | null | undefined = "") => text ? text.split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ") : "";
const truncate = (text: string = "", maxLength: number = 20) => text?.length > maxLength ? text.substring(0, maxLength) + "..." : text;
const getScrollStorageKey = (url: string): string => `scroll-position-${url}`;

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

// --- Breadcrumb Component (Unchanged) ---
function ProductPageBreadcrumb() {
    const { category, subcategory } = useParams<{ category: string; subcategory: string }>();
    const [searchParams] = useSearchParams();
    const labelParam = searchParams.get("label") || null;

    const breadcrumbItems = [
        { label: "HOME", href: "/" },
        ...(category ? [{ label: truncate(capitalize(category)).toUpperCase(), href: `/${category}` }] : []),
        ...(subcategory ? [{ label: truncate(capitalize(subcategory)).toUpperCase(), href: `/${category}/${subcategory}` }] : []),
        ...(labelParam ? [{ label: truncate(capitalize(labelParam)).toUpperCase(), href: null }] : []),
    ];

    return ( <Breadcrumb className="mb-8"> <BreadcrumbList className="text-xl font-bold"> {breadcrumbItems.map((item, index) => { const isLast = index === breadcrumbItems.length - 1; return ( <React.Fragment key={item.label}> {index > 0 && <BreadcrumbSeparator />} <BreadcrumbItem> {isLast || !item.href ? ( <BreadcrumbPage className="text-white">{item.label}</BreadcrumbPage> ) : ( <BreadcrumbLink href={item.href} className="hover:text-[#5865f2] transition-colors">{item.label}</BreadcrumbLink> )} </BreadcrumbItem> </React.Fragment> ); })} </BreadcrumbList> </Breadcrumb> );
}

// --- Main Component ---
export default function ProductsPage() {
    const { category, subcategory } = useParams<{ category: string; subcategory?: string }>();
    // FIX: Removed unused setSearchParams
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();
    const navigationType = useNavigationType();
    const isMobile = useIsMobile();
    const { setIsLoadingProducts, setLoadingMessage } = useLoading();
    const siteUrl = window.location.origin;
    const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

    // --- View Mode Logic ---
    const labelParam = searchParams.get("label");
    const filterParams = ['condition', 'sortBy', 'filterByDiscount', 'minDiscountPrice', 'maxDiscountPrice'];
    const hasSpecFilters = Array.from(searchParams.keys()).some(key => key.startsWith('spec_'));
    const hasOtherFilters = filterParams.some(p => searchParams.has(p));
    const isFilterableGridMode = !!labelParam || hasOtherFilters || hasSpecFilters;

    // --- Carousel View Logic ---
    const { products: carouselProducts, isLoading: isCarouselLoading, error: carouselError } = useProducts({
        category, subcategory, pageSize: 1000,
    });
    useEffect(() => {
        if (!isFilterableGridMode) {
            setLoadingMessage("Loading products..."); setIsLoadingProducts(isCarouselLoading);
        }
    }, [isCarouselLoading, isFilterableGridMode, setIsLoadingProducts, setLoadingMessage]);
    
    // --- Filterable Grid View Logic ---
    const page = parseInt(searchParams.get("page") || "1");
    const sortBy = searchParams.get("sortBy") || "relevance";
    const activeConditions = useMemo(() => searchParams.get("condition")?.split(",") ?? [], [searchParams]);
    const [isDiscountFilterEnabled, setIsDiscountFilterEnabled] = useState(false);
    const [discountPriceRange, setDiscountPriceRange] = useState<[number, number]>([0, 0]);
    const [activeTechSpecs, setActiveTechSpecs] = useState<Record<string, string[]>>({});

    const {
        results: gridResults, totalResults, totalPages, isLoading: isGridLoading,
        filterGroups, dynamicSpecFilters, discountPriceBounds,
    } = useClientFilteredSearch({
        query: labelParam || "", category: category, subcategory: subcategory, sortBy, page, pageSize: 20,
        activeCategories: [], activeSubcategories: [], activeLabels: labelParam ? [labelParam] : [],
        activeConditions, activeTechSpecs, isDiscountFilterEnabled, discountPriceRange,
    });

    useEffect(() => {
        if (isFilterableGridMode) {
            setLoadingMessage("Filtering products..."); setIsLoadingProducts(isGridLoading);
        }
    }, [isGridLoading, isFilterableGridMode, setIsLoadingProducts, setLoadingMessage]);

    // --- Filter Handlers ---
    const updateFilters = useCallback((updates: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(updates).forEach(([key, value]) => {
            if (value === null || value === '') params.delete(key);
            else params.set(key, value);
        });
        if (!("page" in updates)) params.set("page", "1");
        navigate(`${location.pathname}?${params.toString()}`, { replace: true });
    }, [searchParams, navigate, location.pathname]);
    
    // FIX: Corrected signature to match prop type
    const toggleFilterOption = useCallback((filterKey: "category" | "subcategory" | "label" | "condition", option: string) => {
        const currentParam = searchParams.get(filterKey);
        updateFilters({ [filterKey]: toggleUrlParamArray(currentParam, option) });
    }, [searchParams, updateFilters]);

    const toggleTechSpecFilter = useCallback((specKey: string, option: string | number | boolean) => {
        const urlKey = `spec_${specKey}`;
        updateFilters({ [urlKey]: toggleUrlParamArray(searchParams.get(urlKey), String(option)) });
    }, [searchParams, updateFilters]);

    const handleTechSpecRangeChange = useCallback((specKey: string, range: [number, number]) => {
        const [min, max] = range;
        const urlKeyMin = `spec_${specKey}_min`; const urlKeyMax = `spec_${specKey}_max`;
        if (min === -1 && max === -1) {
            updateFilters({ [urlKeyMin]: null, [urlKeyMax]: null });
        } else {
            updateFilters({ [urlKeyMin]: String(min), [urlKeyMax]: String(max) });
        }
    }, [updateFilters]);

    const handleDiscountFilterToggle = useCallback((checked: boolean) => {
        if (checked) {
            updateFilters({ filterByDiscount: "true", minDiscountPrice: discountPriceBounds[0].toString(), maxDiscountPrice: discountPriceBounds[1].toString() });
        } else {
            updateFilters({ filterByDiscount: null, minDiscountPrice: null, maxDiscountPrice: null });
        }
    }, [updateFilters, discountPriceBounds]);
    
    // FIX: Added missing handlePriceRangeChange function
    const handlePriceRangeChange = (value: [number, number] | number, isMin?: boolean) => {
        if (Array.isArray(value)) { setDiscountPriceRange(value); } 
        else if (typeof value === 'number' && typeof isMin === 'boolean') { setDiscountPriceRange(prev => { const newRange: [number, number] = [...prev]; newRange[isMin ? 0 : 1] = value; return newRange; }); }
    };
    
    const onApplyPriceFilter = useCallback((range: [number, number]) => {
        let [min, max] = range;
        if (min > max) [min, max] = [max, min];
        updateFilters({ filterByDiscount: "true", minDiscountPrice: String(min), maxDiscountPrice: String(max) });
    }, [updateFilters]);
    
    const handleClearFilters = useCallback(() => {
        const paramsToClear: Record<string, null> = { condition: null, filterByDiscount: null, minDiscountPrice: null, maxDiscountPrice: null, page: null, sortBy: null };
        for (const key of searchParams.keys()) {
            if (key.startsWith('spec_')) paramsToClear[key] = null;
        }
        updateFilters(paramsToClear);
    }, [updateFilters, searchParams]);
    
    const handleSortChange = (value: string) => { updateFilters({ sortBy: value }); };
    
    useEffect(() => {
        const specs: Record<string, string[]> = {};
        searchParams.forEach((value, key) => {
            if (key.startsWith('spec_')) {
                const baseKey = key.substring(5);
                if (baseKey.endsWith('_min')) {
                    const specKey = baseKey.replace('_min', '');
                    const maxValue = searchParams.get(`spec_${specKey}_max`);
                    if (maxValue !== null) specs[specKey] = [value, maxValue];
                } else if (!baseKey.endsWith('_max')) {
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

    // --- Scroll Restoration ---
    useEffect(() => { if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'; }, []);
    const [productsReady, setProductsReady] = useState(false);
    const currentPageUrl = location.pathname + location.search;
    useEffect(() => { setProductsReady(!isGridLoading && gridResults.length > 0); }, [isGridLoading, gridResults]);
    useLayoutEffect(() => { const handleScroll = () => sessionStorage.setItem(getScrollStorageKey(currentPageUrl), window.scrollY.toString()); window.addEventListener('scroll', handleScroll); return () => window.removeEventListener('scroll', handleScroll); }, [currentPageUrl]);
    useEffect(() => { if (navigationType === NavigationType.Pop && productsReady) { const savedPosition = sessionStorage.getItem(getScrollStorageKey(currentPageUrl)); if (savedPosition) window.scrollTo(0, parseInt(savedPosition, 10)); else window.scrollTo({ top: 0, behavior: "auto" }); } else if (navigationType !== NavigationType.Pop) { window.scrollTo({ top: 0, behavior: "auto" }); } }, [currentPageUrl, navigationType, productsReady]);
    
    // --- SEO Data Generation ---
    const generateTitle = () => { let title = "Shop"; if (category) title += ` ${capitalize(category)}`; if (subcategory) title += ` ${capitalize(subcategory)}`; if (labelParam) title += ` - ${capitalize(labelParam)}`; return `${title} | GNT Store`; };
    const generateDescription = () => `Browse ${capitalize(labelParam) || capitalize(subcategory) || capitalize(category) || 'all products'} at GNT Store. Find the best deals on gaming consoles, computers, and accessories.`;
    const baseCanonicalPath = subcategory ? `/${category}/${subcategory}` : category ? `/${category}` : '/';
    const canonicalUrl = labelParam ? `${siteUrl}${baseCanonicalPath}?label=${encodeURIComponent(labelParam)}` : `${siteUrl}${baseCanonicalPath}`;

    // --- Render Logic ---
    if (isFilterableGridMode) {
        return (
            <div className="min-h-screen bg-[#0f1115] text-white">
                <SEO title={generateTitle()} description={generateDescription()} canonicalUrl={canonicalUrl} ogData={{ title: generateTitle(), description: generateDescription(), url: canonicalUrl, type: 'product.group', image: `${siteUrl}/favicon/og-image.png` }} />
                <div className="container mx-auto px-4 py-8">
                    <ProductPageBreadcrumb />
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
                        <div><p className="text-sm text-gray-400">{`${totalResults} results`}</p></div>
                        <div className="flex items-center gap-4">
                            {isMobile && (
                                <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
                                    <SheetTrigger asChild><Button variant="outline" size="sm" className="border-[#2a2d36] bg-[#1a1c23] flex items-center gap-2"> <Filter className="w-4 h-4" /> Filters</Button></SheetTrigger>
                                    <SheetContent side="left" className="bg-[#1a1c23] border-r border-[#2a2d36] text-white w-[85vw] max-w-md p-0 flex flex-col">
                                        <SheetHeader className="p-4 border-b border-[#2a2d36]"><SheetTitle>Filters</SheetTitle></SheetHeader>
                                        <ScrollArea className="flex-1 px-4 py-2 dark-theme-scrollbar">
                                            {/* FIX: Explicitly pass all required props */}
                                            <FilterContent 
                                                showCategoryFilter={false} 
                                                showSubcategoryFilter={false} 
                                                showLabelFilter={false} 
                                                filterGroups={filterGroups}
                                                activeCategories={[]}
                                                activeSubcategories={[]}
                                                activeLabels={[]}
                                                activeConditions={activeConditions}
                                                toggleFilterOption={toggleFilterOption}
                                                handleClearFilters={handleClearFilters}
                                                isDiscountFilterEnabled={isDiscountFilterEnabled}
                                                handleDiscountFilterToggle={handleDiscountFilterToggle}
                                                discountPriceRange={discountPriceRange}
                                                handlePriceRangeChange={handlePriceRangeChange}
                                                onApplyPriceFilter={onApplyPriceFilter}
                                                discountPriceBounds={discountPriceBounds}
                                                dynamicSpecFilters={dynamicSpecFilters}
                                                activeTechSpecs={activeTechSpecs}
                                                toggleTechSpecFilter={toggleTechSpecFilter}
                                                handleTechSpecRangeChange={handleTechSpecRangeChange} 
                                            />
                                        </ScrollArea>
                                        <SheetFooter className="p-4 border-t border-[#2a2d36]"><Button onClick={() => setIsFilterSheetOpen(false)} className="bg-[#5865f2] hover:bg-[#4752c4]">Apply Filters</Button></SheetFooter>
                                    </SheetContent>
                                </Sheet>
                            )}
                            <Select value={sortBy} onValueChange={handleSortChange}><SelectTrigger className="h-9 rounded-md border border-[#2a2d36] bg-[#1a1c23] px-3 text-sm text-white w-auto"><SelectValue placeholder="Sort by" /></SelectTrigger><SelectContent className="bg-[#1a1c23] border-[#2a2d36] text-white"><SelectItem value="relevance">Relevance</SelectItem><SelectItem value="price_asc">Price: Low to High</SelectItem><SelectItem value="price_desc">Price: High to Low</SelectItem></SelectContent></Select>
                        </div>
                    </div>
                    {/* FIX: Corrected props for ActiveFilters */}
                    <ActiveFilters 
                        activeCategories={[]} 
                        activeSubcategories={[]} 
                        activeLabels={[]} 
                        activeConditions={activeConditions} 
                        isDiscountFilterEnabled={isDiscountFilterEnabled} 
                        discountPriceRange={discountPriceRange} 
                        toggleFilterOption={toggleFilterOption} 
                        handleClearFilters={handleClearFilters} 
                        handleDiscountFilterToggle={handleDiscountFilterToggle} 
                        activeTechSpecs={activeTechSpecs} 
                        toggleTechSpecFilter={toggleTechSpecFilter} 
                        handleTechSpecRangeChange={handleTechSpecRangeChange} 
                    />

                    <div className="flex flex-col md:flex-row gap-6">
                        {!isMobile && (
                            <div className="w-full md:w-64 lg:w-72 flex-shrink-0">
                                <div className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg p-4 sticky top-20">
                                    <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-lg">Filters</h3><Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-8 px-2 text-xs hover:bg-[#2a2d36]"><X className="w-3 h-3 mr-1" /> Clear all</Button></div>
                                    {/* FIX: Explicitly pass all required props */}
                                    <FilterContent 
                                        showCategoryFilter={false} 
                                        showSubcategoryFilter={false} 
                                        showLabelFilter={false} 
                                        filterGroups={filterGroups}
                                        activeCategories={[]}
                                        activeSubcategories={[]}
                                        activeLabels={[]}
                                        activeConditions={activeConditions}
                                        toggleFilterOption={toggleFilterOption}
                                        handleClearFilters={handleClearFilters}
                                        isDiscountFilterEnabled={isDiscountFilterEnabled}
                                        handleDiscountFilterToggle={handleDiscountFilterToggle}
                                        discountPriceRange={discountPriceRange}
                                        handlePriceRangeChange={handlePriceRangeChange}
                                        onApplyPriceFilter={onApplyPriceFilter}
                                        discountPriceBounds={discountPriceBounds}
                                        dynamicSpecFilters={dynamicSpecFilters}
                                        activeTechSpecs={activeTechSpecs}
                                        toggleTechSpecFilter={toggleTechSpecFilter}
                                        handleTechSpecRangeChange={handleTechSpecRangeChange} 
                                    />
                                </div>
                            </div>
                        )}
                        <div className="flex-1">
                            {isGridLoading ? (<div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 text-[#5865f2] animate-spin" /></div>
                            ) : gridResults.length > 0 ? (
                                <>
                                    <div className="grid grid-cols-2 xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"> {gridResults.map((product) => (<ProductCard key={product.slug} product={product} />))} </div>
                                    {totalPages > 1 && (<div className="mt-8 flex justify-center"><Pagination currentPage={page} totalPages={totalPages} onPageChange={(newPage: number) => updateFilters({ page: newPage.toString() })} /></div>)}
                                </>
                            ) : (<div className="text-center py-12 bg-[#1a1c23] rounded-lg"><h3 className="text-lg font-medium mb-2">No products found</h3><p className="text-gray-400">Try adjusting your filters.</p></div>)}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    
    // Default Carousel View
    const groupedProducts = carouselProducts.reduce((groups: { [key: string]: Product[] }, product) => { const key = (product && (product[subcategory ? "label" : "subcategory"] || "Other")); if (!groups[key]) groups[key] = []; groups[key].push(product); return groups; }, {});
    return (
        <div className="min-h-screen bg-[#0f1115] text-white">
            <SEO title={generateTitle()} description={generateDescription()} canonicalUrl={canonicalUrl} ogData={{ title: generateTitle(), description: generateDescription(), url: canonicalUrl, type: 'product.group', image: `${siteUrl}/favicon/og-image.png` }} />
            <div className="container mx-auto px-4 py-8">
                <ProductPageBreadcrumb />
                {isCarouselLoading ? (<div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 text-[#5865f2] animate-spin" /></div>
                ) : carouselError ? (<div className="text-center py-12 bg-[#1a1c23] rounded-lg"><h3 className="text-lg font-medium mb-2">Error</h3><p className="text-gray-400">{carouselError}</p></div>
                ) : Object.keys(groupedProducts).length > 0 ? (Object.entries(groupedProducts).map(([groupKey, groupProducts]) => { const previewProducts = groupProducts.slice(0, 10); const showAllUrl = subcategory ? `/${category}/${subcategory}?label=${encodeURIComponent(groupKey)}` : `/${category}/${groupKey}`; return (
                    <div key={groupKey} className="mb-12"><div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold text-white">{capitalize(groupKey)} ({groupProducts.length})</h2><div><Button asChild variant="ghost" className="text-gray-300 bg-gray-800 hover:text-white hover:bg-[#4752c4]"><Link to={showAllUrl}>Show All</Link></Button></div></div><ProductCarousel products={previewProducts} /></div>); })
                ) : (<div className="text-center py-12 bg-[#1a1c23] rounded-lg"><h3 className="text-lg font-medium mb-2">No products found</h3><p className="text-gray-400">Try browsing a different category.</p></div>)}
            </div>
        </div>
    );
}