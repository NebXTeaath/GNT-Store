// src/pages/searchPage/hooks/useClientFilteredSearch.ts

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchResults } from "@/components/global/hooks/useSearch";
import { useDebounce } from "@/components/global/hooks/use-debounce";
// Import the actual Product type expected by ProductCard and returned by search
import type { ProductSearchResult } from "@/lib/types/product"; // Adjust path if needed
// Removed local Product interface

// --- Interfaces --- (Keep FilterOption, FilterGroups)
export interface FilterOption { name: string; count: number; }
export interface FilterGroups { categories: FilterOption[]; subcategories: FilterOption[]; labels: FilterOption[]; conditions: FilterOption[]; }

// --- Hook Props ---
interface UseClientFilteredSearchParams {
    // Data fetching params
    query: string;
    sortBy: string;
    // Client-side filter params
    page: number;
    pageSize: number;
    activeCategories: string[];
    activeSubcategories: string[];
    activeLabels: string[];
    activeConditions: string[];
    isDiscountFilterEnabled: boolean;
    discountPriceRange: [number, number]; // Debounced value should be passed here
}

// --- Hook Return Value ---
interface UseClientFilteredSearchResult {
    results: ProductSearchResult[]; // Final paginated results
    totalResults: number; // Count after client-side filtering
    totalPages: number; // Pages after client-side filtering
    isLoading: boolean; // Loading state from initial fetch
    filterGroups: FilterGroups; // Filters extracted from original results
    discountPriceBounds: [number, number]; // Min/max price from original results
    didYouMean: string | null; // Suggestion from initial fetch
    serverError: string | null; // Error from initial fetch
}

export function useClientFilteredSearch({
    query, sortBy,
    page, pageSize,
    activeCategories, activeSubcategories, activeLabels, activeConditions,
    isDiscountFilterEnabled, discountPriceRange, // Expecting debounced range
}: UseClientFilteredSearchParams): UseClientFilteredSearchResult {

    // --- State within the hook ---
    const [originalResults, setOriginalResults] = useState<ProductSearchResult[]>([]);
    const [filterGroups, setFilterGroups] = useState<FilterGroups>({ categories: [], subcategories: [], labels: [], conditions: [] });
    const [discountPriceBounds, setDiscountPriceBounds] = useState<[number, number]>([0, 0]);

    // --- Fetch initial large dataset ---
    const {
        data: searchData,
        isLoading: isFetchingFromServer,
        error: serverError,
    } = useSearchResults(
        { term: query, sortBy: sortBy, page: 1, pageSize: 1000, /* other server filters null */ },
        !!query // Enable only if query exists
    );

    // --- Logic to Extract Filter Options & Bounds (runs when server data changes) ---
    const extractAndSetOptions = useCallback((products: ProductSearchResult[]) => {
        // Calculate Filter Groups
        const categoryCounts: Record<string, number> = {}; const subcategoryCounts: Record<string, number> = {}; const labelCounts: Record<string, number> = {}; const conditionCounts: Record<string, number> = {};
        products.forEach((product) => {
            if (product.category) categoryCounts[product.category] = (categoryCounts[product.category] || 0) + 1;
            if (product.subcategory) subcategoryCounts[product.subcategory] = (subcategoryCounts[product.subcategory] || 0) + 1;
            if (product.label) labelCounts[product.label] = (labelCounts[product.label] || 0) + 1;
            if (product.condition) conditionCounts[product.condition] = (conditionCounts[product.condition] || 0) + 1;
        });
        const mapAndSort = (counts: Record<string, number>): FilterOption[] => Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
        setFilterGroups({ categories: mapAndSort(categoryCounts), subcategories: mapAndSort(subcategoryCounts), labels: mapAndSort(labelCounts), conditions: mapAndSort(conditionCounts) });

        // Calculate Discount Bounds
        if (products.length > 0) {
            const discountPrices = products.map((item) => item.discount_price).filter(price => typeof price === 'number');
            if (discountPrices.length > 0) {
                const min = Math.max(0, Math.floor(Math.min(...discountPrices))); const max = Math.ceil(Math.max(...discountPrices));
                setDiscountPriceBounds(prevBounds => {
                    // Only update bounds state if they actually changed
                    if (prevBounds[0] !== min || prevBounds[1] !== max) {
                        return [min, max];
                    }
                    return prevBounds;
                });
            } else { setDiscountPriceBounds(prev => prev[0] !== 0 || prev[1] !== 0 ? [0, 0] : prev); }
        } else { setDiscountPriceBounds(prev => prev[0] !== 0 || prev[1] !== 0 ? [0, 0] : prev); }

    }, []); // This callback itself doesn't need dependencies

    useEffect(() => {
        if (!isFetchingFromServer && searchData?.results) {
            const fullResults = searchData.results as ProductSearchResult[];
            setOriginalResults(fullResults);
            extractAndSetOptions(fullResults);
        } else if (!isFetchingFromServer && !searchData?.results) {
             // Handle empty results from server
            setOriginalResults([]);
            extractAndSetOptions([]);
        }
         // Don't reset bounds here, extractAndSetOptions handles it based on results
    }, [searchData, isFetchingFromServer, extractAndSetOptions]);


    // --- Client-Side Filtering Logic ---
    const filteredResults = useMemo(() => {
        // 1. Apply multi-select filters
        let multiFiltered = originalResults;
        if (activeCategories.length > 0) { multiFiltered = multiFiltered.filter((p) => p.category && activeCategories.includes(p.category)); }
        if (activeSubcategories.length > 0) { multiFiltered = multiFiltered.filter((p) => p.subcategory && activeSubcategories.includes(p.subcategory)); }
        if (activeLabels.length > 0) { multiFiltered = multiFiltered.filter((p) => p.label && activeLabels.includes(p.label)); }
        if (activeConditions.length > 0) { multiFiltered = multiFiltered.filter((p) => p.condition && activeConditions.includes(p.condition)); }

        // 2. Apply discount price filter (using the debounced value passed as prop)
        let finalFiltered = multiFiltered;
        if (isDiscountFilterEnabled) {
            const [min, max] = discountPriceRange; // Use the prop directly
            finalFiltered = multiFiltered.filter((p) => p.discount_price >= min && p.discount_price <= max);
        }

        return finalFiltered;

    }, [originalResults, activeCategories, activeSubcategories, activeLabels, activeConditions, isDiscountFilterEnabled, discountPriceRange]);

    // --- Client-Side Pagination Logic ---
    const paginatedResults = useMemo(() => {
        return filteredResults.slice((page - 1) * pageSize, page * pageSize);
    }, [filteredResults, page, pageSize]);

    // --- Calculated Totals ---
    const totalResults = filteredResults.length;
    const totalPages = pageSize > 0 ? Math.ceil(totalResults / pageSize) : 1;

    // --- Return Values ---
    return {
        results: paginatedResults, // The final paginated results
        totalResults,
        totalPages,
        isLoading: isFetchingFromServer, // Reflects initial fetch loading
        filterGroups,
        discountPriceBounds,
        didYouMean: searchData?.didYouMean ?? null,
        serverError: serverError?.message || null,
    };
}