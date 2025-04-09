// src/hooks/useSearch.ts
import { useState, useEffect, useCallback } from "react";
import { getSearchResults } from "@/pages/searchPage/search/search-service";
import { useDebounce } from "@/components/global/hooks/use-debounce";
import { calculateDiscountPercentage } from "@/pages/searchPage/search/discountUtils";

export interface FilterOption {
  name: string;
  count: number;
}

export interface FilterGroups {
  categories: FilterOption[];
  subcategories: FilterOption[];
  labels: FilterOption[];
}

export function useSearch({
  query,
  sortBy,
  page,
  pageSize,
  activeCategories,
  activeSubcategories,
  activeLabels,
  searchParams,
  navigate,
}: {
  query: string;
  sortBy: string;
  page: number;
  pageSize: number;
  activeCategories: string[];
  activeSubcategories: string[];
  activeLabels: string[];
  searchParams: URLSearchParams;
  navigate: (url: string, options?: any) => void;
}) {
  const [results, setResults] = useState<any[]>([]);
  const [originalResults, setOriginalResults] = useState<any[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [didYouMean, setDidYouMean] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDiscountFilterEnabled, setIsDiscountFilterEnabled] = useState(
    searchParams.get("filterByDiscount") === "true"
  );
  const [filterGroups, setFilterGroups] = useState<FilterGroups>({
    categories: [],
    subcategories: [],
    labels: [],
  });
  const [discountPriceRange, setDiscountPriceRange] = useState<[number, number]>([
    Number(searchParams.get("minDiscountPrice")) || 0,
    Number(searchParams.get("maxDiscountPrice")) || 0,
  ]);
  const [discountPriceBounds, setDiscountPriceBounds] = useState<[number, number]>([0, 0]);
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);

  const debouncedPriceRange = useDebounce(discountPriceRange, 600);

  // Utility: Update URL filters
  const updateFilters = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      if (!("page" in updates)) {
        params.set("page", "1");
      }
      navigate(`/search?${params.toString()}`);
    },
    [searchParams, navigate]
  );

  // Toggle multi-select filter options
  const toggleFilterOption = useCallback(
    (filterKey: "category" | "subcategory" | "label", option: string) => {
      const currentParam = searchParams.get(filterKey);
      let currentArray = currentParam ? currentParam.split(",") : [];
      if (currentArray.includes(option)) {
        currentArray = currentArray.filter((item) => item !== option);
      } else {
        currentArray.push(option);
      }
      updateFilters({ [filterKey]: currentArray.length > 0 ? currentArray.join(",") : null });
    },
    [searchParams, updateFilters]
  );

  // Extract filter options from the full results
  const extractFilterOptions = useCallback((products: any[]) => {
    const categoryCounts: Record<string, number> = {};
    const subcategoryCounts: Record<string, number> = {};
    const labelCounts: Record<string, number> = {};

    products.forEach((product) => {
      if (product.category) {
        categoryCounts[product.category] = (categoryCounts[product.category] || 0) + 1;
      }
      if (product.subcategory) {
        subcategoryCounts[product.subcategory] = (subcategoryCounts[product.subcategory] || 0) + 1;
      }
      if (product.label) {
        labelCounts[product.label] = (labelCounts[product.label] || 0) + 1;
      }
    });

    const categoryOptions = Object.entries(categoryCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const subcategoryOptions = Object.entries(subcategoryCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const labelOptions = Object.entries(labelCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    setFilterGroups({
      categories: categoryOptions,
      subcategories: subcategoryOptions,
      labels: labelOptions,
    });
  }, []);

  // Fetch search results and apply multi-selection filters
  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!query) return;
      setIsLoading(true);
      try {
        const data = await getSearchResults({
          term: query,
          category: null,
          subcategory: null,
          label: null,
          sortBy,
          page,
          pageSize,
        });
        const fullResults = data.results || [];
        extractFilterOptions(fullResults);

        // Apply client-side multi-select filters
        let multiFiltered = fullResults;
        if (activeCategories.length > 0) {
          multiFiltered = multiFiltered.filter(
            (product) => product.category && activeCategories.includes(product.category)
          );
        }
        if (activeSubcategories.length > 0) {
          multiFiltered = multiFiltered.filter(
            (product) => product.subcategory && activeSubcategories.includes(product.subcategory)
          );
        }
        if (activeLabels.length > 0) {
          multiFiltered = multiFiltered.filter(
            (product) => product.label && activeLabels.includes(product.label)
          );
        }

        setOriginalResults(multiFiltered);
        setResults(multiFiltered);
        setTotalResults(multiFiltered.length);
        setTotalPages(Math.ceil(multiFiltered.length / pageSize));
        setSuggestions(data.suggestions || []);
        setDidYouMean(data.didYouMean || null);

        if (fullResults.length > 0) {
          const discountPrices = fullResults.map((item) => item.discount_price);
          const minDiscountValue = Math.floor(Math.min(...discountPrices));
          const maxDiscountValue = Math.ceil(Math.max(...discountPrices));
          setDiscountPriceBounds([minDiscountValue, maxDiscountValue]);
          if (searchParams.get("filterByDiscount") !== "true") {
            setDiscountPriceRange([minDiscountValue, maxDiscountValue]);
          }
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSearchResults();
  }, [
    query,
    sortBy,
    page,
    pageSize,
    activeCategories.join(","),
    activeSubcategories.join(","),
    activeLabels.join(","),
    extractFilterOptions,
    searchParams,
  ]);

  // Discount filtering effect
  useEffect(() => {
    if (originalResults.length > 0 && !isApplyingFilters) {
      let discountFiltered = originalResults;
      if (isDiscountFilterEnabled) {
        discountFiltered = discountFiltered.filter(
          (product) =>
            product.discount_price >= debouncedPriceRange[0] &&
            product.discount_price <= debouncedPriceRange[1]
        );
      }
      setResults(discountFiltered);
      setTotalResults(discountFiltered.length);
      setTotalPages(Math.ceil(discountFiltered.length / pageSize));
    }
  }, [isDiscountFilterEnabled, debouncedPriceRange, originalResults, pageSize, isApplyingFilters]);

  // Update URL when discount filter changes
  useEffect(() => {
    if (isDiscountFilterEnabled && !isApplyingFilters) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("filterByDiscount", "true");
      params.set("minDiscountPrice", debouncedPriceRange[0].toString());
      params.set("maxDiscountPrice", debouncedPriceRange[1].toString());
      params.set("page", "1");
      navigate(`/search?${params.toString()}`, { replace: true });
    }
  }, [debouncedPriceRange, isDiscountFilterEnabled, isApplyingFilters, searchParams, navigate]);

  const handleSuggestionClick = (suggestion: string) => {
    updateFilters({ q: suggestion, page: "1" });
  };

  const handleClearFilters = () => {
    const params = new URLSearchParams();
    params.set("q", query);
    navigate(`/search?${params.toString()}`);
    setIsDiscountFilterEnabled(false);

    if (originalResults.length > 0) {
      const discountPrices = originalResults.map((item) => item.discount_price);
      const minDiscountValue = Math.floor(Math.min(...discountPrices));
      const maxDiscountValue = Math.ceil(Math.max(...discountPrices));
      setDiscountPriceRange([minDiscountValue, maxDiscountValue]);
    }
  };

  const handleDiscountFilterToggle = (checked: boolean) => {
    setIsDiscountFilterEnabled(checked);
    if (checked) {
      updateFilters({
        filterByDiscount: "true",
        minDiscountPrice: discountPriceRange[0].toString(),
        maxDiscountPrice: discountPriceRange[1].toString(),
      });
    } else {
      updateFilters({
        filterByDiscount: null,
        minDiscountPrice: null,
        maxDiscountPrice: null,
      });
    }
  };

  // Expose methods and state needed by the UI
  return {
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
    handlePriceRangeChange: (value: [number, number] | number, isMin = false) => {
      // Reuse your original handlePriceRangeChange logic (simplified here)
      if (Array.isArray(value)) {
        setDiscountPriceRange(value);
      } else {
        // In this simplified version, we assume you provide a new value directly.
        // Add validation logic as needed.
        setDiscountPriceRange((prev) => (isMin ? [value, prev[1]] : [prev[0], value]));
      }
    },
    
  };
}
