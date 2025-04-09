import { supabase } from "@/lib/supabase";
import type { ProductSearchResult } from "@/lib/types/product";
import type { SearchSuggestion } from "@/lib/types/search";

// Autocomplete function using the enhanced_autocomplete_search RPC.
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
    const { data: autocompleteResults, error: autocompleteError } = await supabase.rpc(
      "enhanced_autocomplete_search",
      {
        search_query: term,
        max_results: limit,
        similarity_threshold: 0.2,
      }
    );
    if (autocompleteError) throw autocompleteError;
    
    const { data: suggestions, error: suggestionsError } = await supabase.rpc(
      "get_search_suggestions",
      {
        search_term: term,
        max_suggestions: 4,
        min_similarity: 0.3,
      }
    );
    if (suggestionsError) throw suggestionsError;
    
    let didYouMean: string | null = null;
    if (suggestions && suggestions.length > 0 && suggestions[0].similarity_score > 0.6) {
      didYouMean = suggestions[0].suggestion;
    }
    return { results: autocompleteResults || [], suggestions: suggestions || [], didYouMean };
  } catch (error) {
    console.error("Search autocomplete error:", error);
    return { results: [], suggestions: [], didYouMean: null };
  }
}

// Search function with updated filtering parameters.
export async function getSearchResults(params: {
  term: string;
  p_category?: string[] | null;
  p_subcategory?: string[] | null;
  label_filter?: string[] | null;
  min_price?: number | null;
  max_price?: number | null;
  condition_filter?: string[] | null;
  include_inactive?: boolean;
  sort_by?: string;
  page_number?: number;
  page_size?: number;
  min_relevance?: number;
}): Promise<{
  results: ProductSearchResult[];
  totalResults: number;
  page: number;
  totalPages: number;
  suggestions: SearchSuggestion[];
  didYouMean: string | null;
}> {
  const {
    term,
    p_category = null,
    p_subcategory = null,
    label_filter = null,
    min_price = null,
    max_price = null,
    condition_filter = null,
    include_inactive = false,
    sort_by = "relevance",
    page_number = 1,
    page_size = 20,
    min_relevance = 0.1,
  } = params;

  try {
    const searchParamsObj: Record<string, any> = {
      search_term: term,
      p_category,
      p_subcategory,
      min_price,
      max_price,
      condition_filter,
      include_inactive,
      sort_by,
      page_number,
      page_size,
      min_relevance,
      label_filter,
    };
    
    const { data: searchResults, error: searchError } = await supabase.rpc(
      "unified_product_search",
      searchParamsObj
    );
    if (searchError) throw searchError;

    const countParamsObj: Record<string, any> = {
      search_term: term,
      p_category,
      p_subcategory,
      min_price,
      max_price,
      condition_filter,
      include_inactive,
      min_relevance,
      label_filter,
    };
    
    const { data: countData, error: countError } = await supabase.rpc(
      "get_product_search_count",
      countParamsObj
    );
    if (countError) throw countError;

    const totalResults = countData as number;
    const totalPages = Math.ceil(totalResults / page_size);

    let suggestions: SearchSuggestion[] = [];
    let didYouMean: string | null = null;
    if ((searchResults?.length || 0) < 5 && term.length > 0) {
      const { data: suggestionsData, error: suggestionsError } = await supabase.rpc(
        "get_search_suggestions",
        {
          search_term: term,
          max_suggestions: 5,
          min_similarity: 0.3,
        }
      );
      if (!suggestionsError && suggestionsData) {
        suggestions = suggestionsData;
        if (suggestions.length > 0 && suggestions[0].similarity_score > 0.6) {
          didYouMean = suggestions[0].suggestion;
        }
      }
    }

    return {
      results: searchResults || [],
      totalResults,
      page: page_number,
      totalPages,
      suggestions,
      didYouMean,
    };
  } catch (error) {
    console.error("Search error:", error);
    return {
      results: [],
      totalResults: 0,
      page: 1,
      totalPages: 0,
      suggestions: [],
      didYouMean: null,
    };
  }
}
