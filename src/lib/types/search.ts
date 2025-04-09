//types/search.ts
import type { Product } from "./product"

export interface SearchSuggestion {
  suggestion: string
  similarity_score: number
  estimated_results: number
}

export interface ProductSearchResult extends Product {
  score: number
}

export interface SearchResponse {
  results: ProductSearchResult[]
  suggestions?: SearchSuggestion[]
  didYouMean?: string
  totalResults?: number
  page?: number
  totalPages?: number
}

export interface SearchParams {
  term: string;
  category: string | null;
  subcategory: string | null;
  label: string | null;
  sortBy: string;
  page: number;
  pageSize: number;
}

export interface FilterOption {
  name: string;
  count: number;
}

export interface FilterGroups {
  categories: FilterOption[];
  subcategories: FilterOption[];
  labels: FilterOption[];
}

export interface SearchResults {
  results: ProductSearchResult[];
  suggestions?: SearchSuggestion[];
  didYouMean?: string | null;
}

export interface RangeError {
  min: string | null;
  max: string | null;
}