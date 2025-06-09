// src/lib/pages/searchPage/hooks/useClientFilteredSearch.ts

import { useState, useEffect, useMemo } from "react";
import { useSearchResults } from "@/components/global/hooks/useSearch";
import type { ProductSearchResult } from "@/lib/types/product";

// --- Type Definitions ---
export interface FilterOption {
  name: string | number;
  count: number;
}

export interface FilterGroups {
  categories: FilterOption[];
  subcategories: FilterOption[];
  labels: FilterOption[];
  conditions: FilterOption[];
}

export interface DynamicSpecFilterOption {
  displayName: string;
  options: (string | number | boolean)[];
  filterType: 'boolean' | 'numeric-slider' | 'array-checkbox' | 'checkbox';
  elementType?: 'string' | 'number' | 'boolean';
}

export interface DynamicSpecFilters {
  [label: string]: {
    [specKey: string]: DynamicSpecFilterOption;
  };
}

interface UseClientFilteredSearchParams {
  query: string;
  category?: string;
  subcategory?: string;
  sortBy: string;
  page: number;
  pageSize: number;
  activeCategories: string[];
  activeSubcategories: string[];
  activeLabels: string[];
  activeConditions: string[];
  activeTechSpecs: Record<string, string[]>;
  isDiscountFilterEnabled: boolean;
  discountPriceRange: [number, number];
}

interface UseClientFilteredSearchResult {
  results: ProductSearchResult[];
  totalResults: number;
  totalPages: number;
  isLoading: boolean;
  filterGroups: FilterGroups;
  dynamicSpecFilters: DynamicSpecFilters;
  discountPriceBounds: [number, number];
  didYouMean: string | null;
  serverError: string | null;
}

const formatDisplayName = (key: string): string => {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export function useClientFilteredSearch({
  query, category, subcategory, sortBy, page, pageSize,
  activeCategories, activeSubcategories, activeLabels, activeConditions,
  activeTechSpecs, isDiscountFilterEnabled, discountPriceRange,
}: UseClientFilteredSearchParams): UseClientFilteredSearchResult {

  const [originalResults, setOriginalResults] = useState<ProductSearchResult[]>([]);
  const [filterGroups, setFilterGroups] = useState<FilterGroups>({ categories: [], subcategories: [], labels: [], conditions: [] });
  const [dynamicSpecFilters, setDynamicSpecFilters] = useState<DynamicSpecFilters>({});
  const [discountPriceBounds, setDiscountPriceBounds] = useState<[number, number]>([0, 0]);

  const {
    data: searchData,
    isLoading: isFetchingFromServer,
    error: serverError,
  } = useSearchResults(
    {
      term: query,
      category: category,
      subcategory: subcategory,
      sortBy: sortBy,
      page: 1,
      pageSize: 1000
    },
    !!query || !!category
  );

  useEffect(() => {
    if (isFetchingFromServer || !searchData?.results) {
      if (!isFetchingFromServer && !searchData?.results) {
        setOriginalResults([]);
        setFilterGroups({ categories: [], subcategories: [], labels: [], conditions: [] });
        setDynamicSpecFilters({});
        setDiscountPriceBounds([0, 0]);
      }
      return;
    }
    const fullResults = searchData.results as ProductSearchResult[];
    setOriginalResults(fullResults);

    const categoryCounts: Record<string, number> = {};
    const subcategoryCounts: Record<string, number> = {};
    const labelCounts: Record<string, number> = {};
    const conditionCounts: Record<string, number> = {};
    const tempDynamicFilters: DynamicSpecFilters = {};

    fullResults.forEach((product) => {
      if (product.category) categoryCounts[product.category] = (categoryCounts[product.category] || 0) + 1;
      if (product.subcategory) subcategoryCounts[product.subcategory] = (subcategoryCounts[product.subcategory] || 0) + 1;
      if (product.label) labelCounts[product.label] = (labelCounts[product.label] || 0) + 1;
      if (product.condition) conditionCounts[product.condition] = (conditionCounts[product.condition] || 0) + 1;

      if (product.label && product.technical_specification) {
        if (!tempDynamicFilters[product.label]) {
          tempDynamicFilters[product.label] = {};
        }

        for (const specKey in product.technical_specification) {
          const value = product.technical_specification[specKey];
          if (value === null || value === undefined) continue;

          if (!tempDynamicFilters[product.label][specKey]) {
            tempDynamicFilters[product.label][specKey] = {
              displayName: formatDisplayName(specKey),
              options: [],
              filterType: 'checkbox', // Default type
            };
          }
          const specDef = tempDynamicFilters[product.label][specKey];
          const optionsSet = new Set(specDef.options);
          
          // --- START OF CORRECTED LOGIC ---
          let processedValue: string | number | boolean | any[] = value;
          if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
              try {
                  const parsed = JSON.parse(value);
                  if (Array.isArray(parsed)) {
                      processedValue = parsed; 
                  }
              } catch (e) {
                  // Not valid JSON, treat as a single string.
              }
          }
          // --- END OF CORRECTED LOGIC ---

          if (Array.isArray(processedValue)) {
              specDef.filterType = 'array-checkbox';
              if (processedValue.length > 0) {
                  const firstElementType = typeof processedValue[0];
                  specDef.elementType = 
                    firstElementType === "string" || firstElementType === "number" || firstElementType === "boolean" 
                    ? firstElementType 
                    : undefined;
                  
                  processedValue.forEach(item => {
                      if (item !== null && item !== undefined) optionsSet.add(item);
                  });
              }
          } else if (typeof processedValue === 'boolean') {
              specDef.filterType = 'boolean';
              optionsSet.add(processedValue);
          } else { 
              optionsSet.add(processedValue);
          }
          
          specDef.options = Array.from(optionsSet);
        }
      }
    });

    const mapAndSort = (counts: Record<string, number>): FilterOption[] => Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    setFilterGroups({ categories: mapAndSort(categoryCounts), subcategories: mapAndSort(subcategoryCounts), labels: mapAndSort(labelCounts), conditions: mapAndSort(conditionCounts) });

    for (const label in tempDynamicFilters) {
      for (const specKey in tempDynamicFilters[label]) {
        const specData = tempDynamicFilters[label][specKey];
        
        if (specData.filterType === 'checkbox' && specData.options.every(o => typeof o === 'number') && specData.options.length > 2) {
            specData.filterType = 'numeric-slider';
        }
        
        if (specData.filterType === 'numeric-slider' || specData.elementType === 'number') {
             specData.options.sort((a, b) => (a as number) - (b as number));
        } else if (specData.filterType !== 'boolean') {
             specData.options.sort((a, b) => String(a).localeCompare(String(b)));
        }
      }
    }
    setDynamicSpecFilters(tempDynamicFilters);

    if (fullResults.length > 0) {
      const prices = fullResults.map(p => p.discount_price).filter(p => typeof p === 'number');
      const min = prices.length > 0 ? Math.floor(Math.min(...prices)) : 0;
      const max = prices.length > 0 ? Math.ceil(Math.max(...prices)) : 0;
      setDiscountPriceBounds(prev => (prev[0] !== min || prev[1] !== max ? [min, max] : prev));
    } else {
      setDiscountPriceBounds([0, 0]);
    }
  }, [searchData, isFetchingFromServer]);

  const filteredResults = useMemo(() => {
    return originalResults.filter(p => {
      if (activeCategories.length > 0 && (!p.category || !activeCategories.includes(p.category))) return false;
      if (activeSubcategories.length > 0 && (!p.subcategory || !activeSubcategories.includes(p.subcategory))) return false;
      if (activeLabels.length > 0 && (!p.label || !activeLabels.includes(p.label))) return false;
      if (activeConditions.length > 0 && (!p.condition || !activeConditions.includes(p.condition))) return false;
      if (isDiscountFilterEnabled) {
        const [min, max] = discountPriceRange;
        if (p.discount_price < min || p.discount_price > max) return false;
      }

      for (const specKey in activeTechSpecs) {
        const activeValues = activeTechSpecs[specKey];
        if (!activeValues || activeValues.length === 0) continue;

        let specDef: DynamicSpecFilterOption | undefined;
        for (const label in dynamicSpecFilters) {
           if (dynamicSpecFilters[label][specKey]) {
               specDef = dynamicSpecFilters[label][specKey];
               break;
           }
        }
        if (!specDef) continue;

        const productValue = p.technical_specification?.[specKey];

        if (specDef.filterType === 'numeric-slider') {
            if (typeof productValue !== 'number') return false;
            const [min, max] = [Number(activeValues[0]), Number(activeValues[1])];
            if (productValue < min || productValue > max) return false;
        } else if (specDef.filterType === 'array-checkbox') {
             let productArray: any[];
             if (Array.isArray(productValue)) { 
                 productArray = productValue;
             } else if (typeof productValue === 'string') { 
                 try {
                     const parsed = JSON.parse(productValue);
                     productArray = Array.isArray(parsed) ? parsed : [];
                 } catch (e) {
                     productArray = [];
                 }
             } else {
                 return false; 
             }
             
             const hasMatch = activeValues.some(selectedValue => productArray.map(String).includes(selectedValue));
             if (!hasMatch) return false;
        } else { 
            if (productValue === undefined || productValue === null) return false;
            const productValueStr = String(productValue);
            if (!activeValues.includes(productValueStr)) return false;
        }
      }
      
      return true;
    });
  }, [originalResults, activeCategories, activeSubcategories, activeLabels, activeConditions, isDiscountFilterEnabled, discountPriceRange, activeTechSpecs, dynamicSpecFilters]);

  const paginatedResults = useMemo(() => {
    return filteredResults.slice((page - 1) * pageSize, page * pageSize);
  }, [filteredResults, page, pageSize]);

  return {
    results: paginatedResults,
    totalResults: filteredResults.length,
    totalPages: pageSize > 0 ? Math.ceil(filteredResults.length / pageSize) : 1,
    isLoading: isFetchingFromServer,
    filterGroups,
    dynamicSpecFilters,
    discountPriceBounds,
    didYouMean: searchData?.didYouMean ?? null,
    serverError: serverError?.message || null,
  };
}