//src\pages\searchPage\search\search-service.ts
import { supabase } from "@/lib/supabase"
import type { ProductSearchResult } from "@/lib/types/product"
import type { SearchSuggestion } from "@/lib/types/search"

export async function getAutocompleteResults(
  term: string,
  limit = 5,
): Promise<{
  results: ProductSearchResult[]
  suggestions: SearchSuggestion[]
  didYouMean: string | null
}> {
  if (!term || term.length < 2) {
    return { results: [], suggestions: [], didYouMean: null }
  }

  try {
    // Get autocomplete results
    const { data: autocompleteResults, error: autocompleteError } = await supabase.rpc("enhanced_autocomplete_search", {
      search_query: term,
      max_results: limit,
      similarity_threshold: 0.2,
    })

    if (autocompleteError) throw autocompleteError

    // Get "did you mean" suggestions
    const { data: suggestions, error: suggestionsError } = await supabase.rpc("get_search_suggestions", {
      search_term: term,
      max_suggestions: 4,
      min_similarity: 0.3,
    })
    console.log("Suggestions :: ", suggestions)
    if (suggestionsError) throw suggestionsError

    // Determine if we should show a "did you mean" correction
    let didYouMean: string | null = null
    if (suggestions && suggestions.length > 0 && suggestions[0].similarity_score > 0.6) {
      didYouMean = suggestions[0].suggestion
    }

    return {
      results: autocompleteResults || [],
      suggestions: suggestions || [],
      didYouMean,
    }
  } catch (error) {
    console.error("Search autocomplete error:", error)
    return { results: [], suggestions: [], didYouMean: null }
  }
}

export async function getSearchResults(params: {
  term: string
  category?: string | null
  subcategory?: string | null
  label?: string | null
  minPrice?: number | null
  maxPrice?: number | null
  condition?: string | null
  sortBy?: string
  page?: number
  pageSize?: number
}): Promise<{
  results: ProductSearchResult[]
  totalResults: number
  page: number
  totalPages: number
  suggestions: SearchSuggestion[]
  didYouMean: string | null
}> {
  const {
    term,
    category = null,
    subcategory = null,
    minPrice = null,
    maxPrice = null,
    condition = null,
    sortBy = "relevance",
    page = 1,
    pageSize = 20,
  } = params

  try {
    // Get search results
    const { data: searchResults, error: searchError } = await supabase.rpc("unified_product_search", {
      search_term: term,
      p_category: category,
      p_subcategory: subcategory,
      min_price: minPrice,
      max_price: maxPrice,
      condition_filter: condition,
      include_inactive: false,
      sort_by: sortBy,
      page_number: page,
      page_size: pageSize,
      min_relevance: 0.1,
    })

    if (searchError) throw searchError

    // Get total count for pagination (approximate)
    // This is a simplified approach - for a production app, you might want to
    // create a separate RPC function that returns just the count
    const { data: countData, error: countError } = await supabase.rpc("unified_product_search", {
      search_term: term,
      p_category: category,
      p_subcategory: subcategory,
      min_price: minPrice,
      max_price: maxPrice,
      condition_filter: condition,
      include_inactive: false,
      sort_by: sortBy,
      page_number: 1,
      page_size: 1000, // Large number to get approximate count
      min_relevance: 0.1,
    })

    if (countError) throw countError

    const totalResults = countData?.length || 0
    const totalPages = Math.ceil(totalResults / pageSize)

    // Get "did you mean" suggestions if few results
    let suggestions: SearchSuggestion[] = []
    let didYouMean: string | null = null

    if ((searchResults?.length || 0) < 5 && term.length > 0) {
      const { data: suggestionsData, error: suggestionsError } = await supabase.rpc("get_search_suggestions", {
        search_term: term,
        max_suggestions: 5,
        min_similarity: 0.3,
      })

      if (!suggestionsError && suggestionsData) {
        suggestions = suggestionsData

        if (suggestions.length > 0 && suggestions[0].similarity_score > 0.6) {
          didYouMean = suggestions[0].suggestion
        }
      }
    }

    return {
      results: searchResults || [],
      totalResults,
      page,
      totalPages,
      suggestions,
      didYouMean,
    }
  } catch (error) {
    console.error("Search error:", error)
    return {
      results: [],
      totalResults: 0,
      page: 1,
      totalPages: 0,
      suggestions: [],
      didYouMean: null,
    }
  }
}

