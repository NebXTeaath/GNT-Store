// src/components/global/hooks/useSearch.ts
import { useQuery, keepPreviousData } from "@tanstack/react-query"; // Import keepPreviousData
import {
    getAutocompleteResults,
    getSearchResults,
    type SearchResultsParams,
    type SearchResultsData,
} from "@/pages/searchPage/search/search-service.ts"; // Adjust path if needed
import type { ProductSearchResult } from "@/lib/types/product"; // Adjust path if needed
import type { SearchSuggestion } from "@/lib/types/search"; // Adjust path if needed

/**
 * Hook to fetch autocomplete search results and suggestions.
 * @param term The search term (debounced term should ideally be passed here).
 * @param limit Max number of results.
 * @param enabled Controls if the query should run (e.g., based on term length).
 */
export function useAutocompleteSearch(term: string, limit = 5, enabled = true) {
    const queryKey = ["autocomplete", term, limit];

    return useQuery<
        {
            results: ProductSearchResult[];
            suggestions: SearchSuggestion[];
            didYouMean: string | null;
        },
        Error // Error type
    >({
        queryKey: queryKey,
        queryFn: () => getAutocompleteResults(term, limit),
        enabled: enabled && term.length >= 2, // Only run if enabled and term is long enough
        staleTime: 5 * 60 * 1000, // Cache autocomplete results for 5 minutes
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false, // Usually not needed for autocomplete
        refetchOnMount: false, // Don't refetch on mount if already cached
        retry: 1, // Retry once on failure
    });
}

/**
 * Hook to fetch paginated search results.
 * @param params Search parameters including term, filters, sorting, pagination.
 * @param enabled Controls if the query should run.
 */
export function useSearchResults(
    params: SearchResultsParams,
    enabled = true,
) {
    // Create a stable query key object - ensure order doesn't matter
    const queryKeyParams = {
        term: params.term || "",
        category: params.category,
        subcategory: params.subcategory,
        label: params.label,
        condition: params.condition,
        sortBy: params.sortBy,
        page: params.page,
        pageSize: params.pageSize,
        // Exclude price filters from key if they aren't used server-side
    };
    const queryKey = ["searchResults", queryKeyParams];

    return useQuery<SearchResultsData, Error>({
        queryKey: queryKey,
        queryFn: () => getSearchResults(params),
        enabled: enabled && (!!params.term || !!params.category || !!params.subcategory || !!params.label), // Enable if term or a filter exists
        staleTime: 3 * 60 * 1000, // Cache search results for 3 minutes
        gcTime: 10 * 60 * 1000,
        // FIX: Replace keepPreviousData: true with placeholderData
        placeholderData: keepPreviousData, // Keep showing old results while fetching new page/filters
        // Consider refetchOnWindowFocus based on user experience needs
    });
}