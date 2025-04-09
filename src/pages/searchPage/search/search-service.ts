// src/pages/searchPage/search/search-service.ts
import { supabase } from "@/lib/supabase";
import type { ProductSearchResult } from "@/lib/types/product"; // Adjust path if needed
import type { SearchSuggestion } from "@/lib/types/search"; // Adjust path if needed

// Interfaces (assume defined or imported correctly)
// interface ProductSearchResult { ... }
// interface SearchSuggestion { ... }


/**
 * Fetches autocomplete results, suggestions, and 'did you mean'.
 * This function will be called by the useAutocompleteSearch hook.
 */
export async function getAutocompleteResults(
    term: string,
    limit = 5,
): Promise<{
    results: ProductSearchResult[];
    suggestions: SearchSuggestion[];
    didYouMean: string | null;
}> {
    if (!term || term.length < 2) {
        return { results: [], suggestions: [], didYouMean: null };
    }

    try {
        const [autocompleteRes, suggestionsRes] = await Promise.allSettled([
            supabase.rpc("enhanced_autocomplete_search", {
                search_query: term, max_results: limit, similarity_threshold: 0.2,
            }),
            supabase.rpc("get_search_suggestions", {
                search_term: term, max_suggestions: 4, min_similarity: 0.3,
            }),
        ]);

        let autocompleteResults: ProductSearchResult[] = [];
        if (autocompleteRes.status === "fulfilled" && !autocompleteRes.value.error) {
            autocompleteResults = autocompleteRes.value.data || [];
        } else if (autocompleteRes.status === "rejected" || autocompleteRes.value.error) {
            console.error("Autocomplete search RPC error:", autocompleteRes.status === 'rejected' ? autocompleteRes.reason : autocompleteRes.value.error);
        }

        let suggestions: SearchSuggestion[] = [];
        let didYouMean: string | null = null;
        if (suggestionsRes.status === "fulfilled" && !suggestionsRes.value.error) {
            suggestions = suggestionsRes.value.data || [];
            if (suggestions.length > 0 && suggestions[0].similarity_score > 0.6) {
                didYouMean = suggestions[0].suggestion;
            }
            // console.log("Suggestions Data :: ", suggestions); // Keep if needed
        } else if (suggestionsRes.status === "rejected" || suggestionsRes.value.error) {
            console.error("Search suggestions RPC error:", suggestionsRes.status === 'rejected' ? suggestionsRes.reason : suggestionsRes.value.error);
        }

        return { results: autocompleteResults, suggestions: suggestions, didYouMean };
    } catch (error) {
        console.error("General search autocomplete error:", error);
        return { results: [], suggestions: [], didYouMean: null };
    }
}

// Interface for search results parameters (Unchanged)
export interface SearchResultsParams { /* ... */
    term: string; category?: string | null; subcategory?: string | null; label?: string | null; minPrice?: number | null; maxPrice?: number | null; condition?: string | null; sortBy?: string; page?: number; pageSize?: number;
}
// Interface for the return value of getSearchResults (Unchanged)
export interface SearchResultsData { /* ... */
    results: ProductSearchResult[]; totalResults: number; page: number; totalPages: number; suggestions: SearchSuggestion[]; didYouMean: string | null;
}

/**
 * Fetches paginated search results and total count.
 * This function will be called by the useSearchResults hook.
 */
export async function getSearchResults(
    params: SearchResultsParams
): Promise<SearchResultsData> {
    const { term, category = null, subcategory = null, condition = null, sortBy = "relevance", page = 1, pageSize = 20, label = null, } = params;

    if (!term && !category && !subcategory && !label) {
        console.warn("Search attempted without term or primary filters.");
        // Return empty results if no search term or filters are provided
        return { results: [], totalResults: 0, page: 1, totalPages: 0, suggestions: [], didYouMean: null };
    }

    try {
        const [searchRes, countRes, suggestionsRes] = await Promise.allSettled([
            supabase.rpc("unified_product_search", { search_term: term || "", p_category: category, p_subcategory: subcategory, min_price: null, max_price: null, condition_filter: condition, include_inactive: false, sort_by: sortBy, page_number: page, page_size: pageSize, min_relevance: 0.1, }),
            supabase.rpc("get_product_search_count", { search_term: term || "", p_category: category, p_subcategory: subcategory, min_price: null, max_price: null, condition_filter: condition, include_inactive: false, label_filter: label, min_relevance: 0.1, }),
            (term && term.length > 0) ? supabase.rpc("get_search_suggestions", { search_term: term, max_suggestions: 5, min_similarity: 0.3, }) : Promise.resolve({ data: [], error: null })
        ]);

        let searchResults: ProductSearchResult[] = [];
        if (searchRes.status === 'fulfilled' && !searchRes.value.error) {
            searchResults = searchRes.value.data || [];
        } else if (searchRes.status === 'rejected' || searchRes.value.error) {
            console.error("Search results RPC error:", searchRes.status === 'rejected' ? searchRes.reason : searchRes.value.error);
             // FIX: Check error before accessing message
            throw new Error(searchRes.status === 'rejected' ? 'Failed to fetch search results' : searchRes.value.error?.message || 'Unknown search error');
        }

        let totalResults = 0;
        if (countRes.status === 'fulfilled' && !countRes.value.error) {
            totalResults = countRes.value.data || 0;
        } else if (countRes.status === 'rejected' || countRes.value.error) {
            console.error("Search count RPC error:", countRes.status === 'rejected' ? countRes.reason : countRes.value.error);
             // FIX: Check error before accessing message
            throw new Error(countRes.status === 'rejected' ? 'Failed to fetch search count' : countRes.value.error?.message || 'Unknown count error');
        }

        let suggestions: SearchSuggestion[] = [];
        let didYouMean: string | null = null;
        if (suggestionsRes.status === 'fulfilled' && suggestionsRes.value && !suggestionsRes.value.error) {
            suggestions = suggestionsRes.value.data || [];
            if (suggestions.length > 0 && suggestions[0].similarity_score > 0.6) {
                didYouMean = suggestions[0].suggestion;
            }
        } else if (suggestionsRes.status === 'rejected' || (suggestionsRes.status === 'fulfilled' && suggestionsRes.value?.error)) {
            // Log suggestion errors but don't fail the whole search for it
            console.warn("Search suggestions RPC error:", suggestionsRes.status === 'rejected' ? suggestionsRes.reason : suggestionsRes.value?.error);
        }

        const totalPages = pageSize > 0 ? Math.ceil(totalResults / pageSize) : 0;

        return { results: searchResults, totalResults, page, totalPages, suggestions, didYouMean };

    } catch (error) {
        console.error("General search error:", error);
        if (error instanceof Error) { throw error; }
        else { throw new Error("An unknown error occurred during search."); }
    }
}