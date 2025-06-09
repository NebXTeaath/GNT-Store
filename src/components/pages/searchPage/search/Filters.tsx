// src/components/pages/searchPage/search/Filters.tsx
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { X, Check } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { formatCurrencyWithSeparator } from "@/lib/currencyFormat";
import type { FilterGroups, DynamicSpecFilters } from "@/lib/pages/searchPage/hooks/useClientFilteredSearch";
import { useMemo, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

// --- START: Reusable Filter UI Components ---

const FilterCheckboxSection = ({
  options,
  activeOptions,
  onToggle,
}: {
  options: (string | number)[];
  activeOptions: (string | number)[];
  onToggle: (option: string | number) => void;
}) => {
  return (
    <div className="space-y-2 max-h-64 overflow-y-auto pr-2 dark-theme-scrollbar">
      {options.map((option) => {
        const id = `check-${String(option).replace(/\s+/g, '-')}`;
        return (
          <div key={id} className="flex items-center">
            <Checkbox
              id={id}
              checked={activeOptions.includes(option)}
              onCheckedChange={() => onToggle(option)}
            />
            <label htmlFor={id} className="ml-2 text-sm cursor-pointer text-gray-300">
              {String(option)}
            </label>
          </div>
        );
      })}
    </div>
  );
};

const FilterBooleanCheckbox = ({
  specKey,
  activeOptions,
  onToggle,
}: {
  specKey: string;
  activeOptions: (string | number)[];
  onToggle: (option: boolean) => void;
}) => {
  const isChecked = activeOptions.includes('true');

  return (
    <div className="flex items-center">
      <Checkbox
        id={`bool-${specKey}`}
        checked={isChecked}
        onCheckedChange={() => onToggle(true)}
      />
      <label htmlFor={`bool-${specKey}`} className="ml-2 text-sm cursor-pointer text-gray-300">
        Enabled
      </label>
    </div>
  );
};

const FilterSliderSection = ({
  options,
  activeOptions,
  onRangeChange,
}: {
  options: number[];
  activeOptions: (string | number)[];
  onRangeChange: (range: [number, number]) => void;
}) => {
  const sortedOptions = [...options].sort((a, b) => a - b);
  const min = sortedOptions[0];
  const max = sortedOptions[sortedOptions.length - 1];
  
  const currentRange: [number, number] = useMemo(() => {
    if (activeOptions.length === 2 && !isNaN(Number(activeOptions[0])) && !isNaN(Number(activeOptions[1]))) {
      return [Number(activeOptions[0]), Number(activeOptions[1])];
    }
    return [min, max];
  }, [activeOptions, min, max]);

  const [localRange, setLocalRange] = useState<[number, number]>(currentRange);

  useEffect(() => {
    setLocalRange(currentRange);
  }, [currentRange]);

  const calculateStep = () => {
    if (sortedOptions.length <= 1) return 1;
    
    if (sortedOptions.length <= 10) {
      const gaps = [];
      for (let i = 1; i < sortedOptions.length; i++) {
        gaps.push(sortedOptions[i] - sortedOptions[i - 1]);
      }
      const minGap = Math.min(...gaps);
      return minGap > 0 ? minGap : 1;
    }
    
    const totalRange = max - min;
    const desiredSteps = Math.min(20, sortedOptions.length);
    return Math.max(1, Math.round(totalRange / desiredSteps));
  };

  const step = calculateStep();

  const snapToNearestOption = (value: number): number => {
    return sortedOptions.reduce((closest, option) => {
      return Math.abs(option - value) < Math.abs(closest - value) ? option : closest;
    });
  };

  const handleSliderChange = (value: number[]) => {
    if (value.length === 2) {
      const snappedMin = snapToNearestOption(value[0]);
      const snappedMax = snapToNearestOption(value[1]);
      setLocalRange([snappedMin, snappedMax]);
    }
  };

  const handleSliderCommit = (value: number[]) => {
    if (value.length === 2) {
      const snappedMin = snapToNearestOption(value[0]);
      const snappedMax = snapToNearestOption(value[1]);
      onRangeChange([snappedMin, snappedMax]);
    }
  };

  return (
    <div className="space-y-3">
      <Slider
        min={min}
        max={max}
        step={step}
        value={localRange}
        onValueChange={handleSliderChange}
        onValueCommit={handleSliderCommit}
        className="[&_[data-slot=slider-thumb]]:bg-[#5865f2] [&_[data-slot=slider-track]]:bg-[#2a2d36] [&_[data-slot=slider-range]]:bg-[#5865f2]/50"
      />
      <div className="flex justify-between text-xs text-gray-400">
        <span>{localRange[0]}</span>
        <span>{localRange[1]}</span>
      </div>
      {sortedOptions.length <= 10 && (
        <div className="text-xs text-gray-500 mt-2">
          Available values: {sortedOptions.join(', ')}
        </div>
      )}
    </div>
  );
};

// --- END: Reusable Filter UI Components ---

interface FilterContentProps {
  filterGroups: FilterGroups;
  dynamicSpecFilters: DynamicSpecFilters;
  activeCategories: string[];
  activeSubcategories: string[];
  activeLabels: string[];
  activeConditions: string[];
  activeTechSpecs: Record<string, string[]>;
  toggleFilterOption: (filterType: "category" | "subcategory" | "label" | "condition", option: string) => void;
  toggleTechSpecFilter: (specKey: string, option: string | number | boolean) => void;
  handleTechSpecRangeChange: (specKey: string, range: [number, number]) => void;
  handleClearFilters: () => void;
  isDiscountFilterEnabled: boolean;
  handleDiscountFilterToggle: (checked: boolean) => void;
  discountPriceRange: [number, number];
  handlePriceRangeChange: (value: [number, number] | number, isMin?: boolean) => void;
  discountPriceBounds: [number, number];
  onApplyPriceFilter: (range: [number, number]) => void;
  showCategoryFilter?: boolean;
  showSubcategoryFilter?: boolean;
  showLabelFilter?: boolean;
}


export function FilterContent({
  filterGroups,
  dynamicSpecFilters,
  activeCategories,
  activeSubcategories,
  activeLabels,
  activeConditions,
  activeTechSpecs,
  toggleFilterOption,
  toggleTechSpecFilter,
  handleTechSpecRangeChange,
  isDiscountFilterEnabled,
  handleDiscountFilterToggle,
  discountPriceRange,
  discountPriceBounds,
  onApplyPriceFilter,
  showCategoryFilter = true,
  showSubcategoryFilter = true,
  showLabelFilter = true,
}: FilterContentProps) {
  const isComputerCategorySelected = activeCategories.includes('Computers');
  const showTechSpecs = Object.keys(dynamicSpecFilters).length > 0 && (!activeCategories.length || isComputerCategorySelected);
  
  const [localPriceRange, setLocalPriceRange] = useState<[number, number]>(discountPriceRange);
  const [hasPendingPriceChanges, setHasPendingPriceChanges] = useState(false);

  useEffect(() => { setLocalPriceRange(discountPriceRange); setHasPendingPriceChanges(false); }, [discountPriceRange]);
  useEffect(() => { const hasChanges = localPriceRange[0] !== discountPriceRange[0] || localPriceRange[1] !== discountPriceRange[1]; setHasPendingPriceChanges(hasChanges && isDiscountFilterEnabled); }, [localPriceRange, discountPriceRange, isDiscountFilterEnabled]);
  
  const handleLocalPriceRangeChange = (value: [number, number] | number, isMin?: boolean) => { if (Array.isArray(value)) { setLocalPriceRange(value); } else if (typeof value === 'number' && typeof isMin === 'boolean') { setLocalPriceRange(prev => { const newRange: [number, number] = [...prev]; newRange[isMin ? 0 : 1] = value; return newRange; }); } };
  const handleApplyPrice = () => { onApplyPriceFilter(localPriceRange); setHasPendingPriceChanges(false); };
  const handleResetLocalPrice = () => { setLocalPriceRange(discountPriceRange); setHasPendingPriceChanges(false); };
  
  return (
    <div className="space-y-6">
      <Accordion type="multiple" defaultValue={["categories", "conditions", "price"]} className="w-full border-none">
        
        {showCategoryFilter && (
          <AccordionItem value="categories" className="border-b border-[#2a2d36]">
            <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
              <span className={activeCategories.length > 0 ? "text-[#5865f2]" : "text-white"}>Categories</span>
            </AccordionTrigger>
            <AccordionContent>
              <FilterCheckboxSection
                options={filterGroups.categories.map(c => c.name)}
                activeOptions={activeCategories}
                onToggle={(opt) => toggleFilterOption("category", String(opt))}
              />
            </AccordionContent>
          </AccordionItem>
        )}

        {showSubcategoryFilter && (
          <AccordionItem value="subcategories" className="border-b border-[#2a2d36]">
            <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
              <span className={activeSubcategories.length > 0 ? "text-[#5865f2]" : "text-white"}>Subcategories</span>
            </AccordionTrigger>
            <AccordionContent>
              <FilterCheckboxSection
                options={filterGroups.subcategories.map(s => s.name)}
                activeOptions={activeSubcategories}
                onToggle={(opt) => toggleFilterOption("subcategory", String(opt))}
              />
            </AccordionContent>
          </AccordionItem>
        )}
        
        {showTechSpecs && (
          <AccordionItem value="technical-specifications" className="border-b border-[#2a2d36]">
            <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
              <span className={Object.keys(dynamicSpecFilters)
                .flatMap(label => Object.keys(dynamicSpecFilters[label]))
                .some(specKey => activeTechSpecs[specKey]?.length > 0)
                ? "text-[#5865f2]" : "text-white"}>
                Technical Specifications
              </span>
            </AccordionTrigger>
            <AccordionContent className="pl-2">
              <Accordion type="multiple" className="w-full">
                {Object.entries(dynamicSpecFilters).map(([label, specs]) => (
                  <AccordionItem key={label} value={label} className="border-b border-neutral-800 last:border-b-0">
                    <AccordionTrigger className="py-2 hover:no-underline text-xs">
                      <span className={Object.keys(specs).some(specKey => activeTechSpecs[specKey]?.length > 0)
                        ? "text-[#5865f2] font-semibold"
                        : "text-white"}>
                        {label} Specs
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pl-2">
                      {Object.entries(specs).map(([specKey, specData]) => {
                        // FIX: Use the filterType from specData instead of recalculating it
                        const { options, filterType } = specData;

                        return (
                          <AccordionItem key={specKey} value={specKey} className="border-b border-neutral-800 last:border-b-0">
                            <AccordionTrigger className="py-2 hover:no-underline text-xs">
                              <span className={activeTechSpecs[specKey]?.length > 0 ? "text-[#5865f2] font-semibold" : "text-white"}>
                                {specData.displayName}
                              </span>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pl-2">
                              {filterType === 'boolean' && (
                                <FilterBooleanCheckbox
                                  specKey={specKey}
                                  activeOptions={activeTechSpecs[specKey] || []}
                                  onToggle={() => toggleTechSpecFilter(specKey, true)}
                                />
                              )}
                              {filterType === 'numeric-slider' && (
                                <FilterSliderSection
                                  options={options.filter((o): o is number => typeof o === 'number')}
                                  activeOptions={activeTechSpecs[specKey] || []}
                                  onRangeChange={(range) => handleTechSpecRangeChange(specKey, range)}
                                />
                              )}
                              {(filterType === 'checkbox' || filterType === 'array-checkbox') && (
                                <FilterCheckboxSection
                                  options={options.filter((o): o is string | number => typeof o === 'string' || typeof o === 'number')}
                                  activeOptions={activeTechSpecs[specKey] || []}
                                  onToggle={(opt) => toggleTechSpecFilter(specKey, opt)}
                                />
                              )}
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </AccordionContent>
          </AccordionItem>
        )}

        {showLabelFilter && (
          <AccordionItem value="labels" className="border-b border-[#2a2d36]">
            <AccordionTrigger className="py-2 hover:no-underline text-sm font-medium">
              <div className="flex items-center gap-2">
                <span className={activeLabels.length > 0 ? "text-[#5865f2]" : "text-white"}>Labels</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <FilterCheckboxSection
                options={filterGroups.labels.map(l => l.name)}
                activeOptions={activeLabels}
                onToggle={(opt) => toggleFilterOption("label", String(opt))}
              />
            </AccordionContent>
          </AccordionItem>
        )}

        <AccordionItem value="conditions" className="border-b border-[#2a2d36]">
          <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
            <span className={activeConditions.length > 0 ? "text-[#5865f2]" : "text-white"}>Conditions</span>
          </AccordionTrigger>
          <AccordionContent>
            <FilterCheckboxSection
              options={filterGroups.conditions.map(c => c.name)}
              activeOptions={activeConditions}
              onToggle={(opt) => toggleFilterOption("condition", String(opt))}
            />
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="price" className="border-b-0">
          <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
            <div className="flex items-center gap-2">
              <span className={isDiscountFilterEnabled ? "text-[#5865f2]" : "text-white"}>Price</span>
              {hasPendingPriceChanges && (
                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" title="Pending changes" />
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Checkbox 
                  id="filter-by-discount" 
                  checked={isDiscountFilterEnabled} 
                  onCheckedChange={(checked) => {
                    if (typeof checked === 'boolean') {
                      handleDiscountFilterToggle(checked);
                    }
                  }} 
                />
                <label 
                  htmlFor="filter-by-discount" 
                  className={`text-sm font-medium cursor-pointer ${isDiscountFilterEnabled ? "text-[#5865f2]" : "text-gray-300"}`}
                >
                  Filter by Price
                </label>
              </div>
              <div className={isDiscountFilterEnabled ? "" : "opacity-50 pointer-events-none"}>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-300">
                      Min: {formatCurrencyWithSeparator(localPriceRange[0])}
                    </span>
                    <span className="text-sm text-gray-300">
                      Max: {formatCurrencyWithSeparator(localPriceRange[1])}
                    </span>
                  </div>
                  <Slider 
                    min={discountPriceBounds[0]} 
                    max={discountPriceBounds[1]} 
                    step={100} 
                    value={localPriceRange} 
                    onValueChange={(value) => { 
                      if (Array.isArray(value) && value.length === 2 && isDiscountFilterEnabled) { 
                        handleLocalPriceRangeChange(value as [number, number]); 
                      } 
                    }} 
                    className="mb-2 [&_[data-slot=slider-thumb]]:bg-[#5865f2] [&_[data-slot=slider-track]]:bg-[#2a2d36] [&_[data-slot=slider-range]]:bg-[#5865f2]/50" 
                    disabled={!isDiscountFilterEnabled} 
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <div className="relative w-full">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">₹</span>
                      <Input
                        type="number"
                        placeholder="Min"
                        className="pl-6 h-9"
                        value={localPriceRange[0]}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          handleLocalPriceRangeChange(isNaN(val) ? 0 : val, true);
                        }}
                        disabled={!isDiscountFilterEnabled}
                      />
                    </div>
                    <span className="text-gray-400">-</span>
                    <div className="relative w-full">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">₹</span>
                      <Input
                        type="number"
                        placeholder="Max"
                        className="pl-6 h-9"
                        value={localPriceRange[1]}
                        onChange={(e) => {
                           const val = parseInt(e.target.value, 10);
                           handleLocalPriceRangeChange(isNaN(val) ? discountPriceBounds[1] : val, false);
                        }}
                        disabled={!isDiscountFilterEnabled}
                      />
                    </div>
                  </div>
                  
                  {isDiscountFilterEnabled && (
                    <div className="flex items-center gap-2 mt-3">
                      <Button
                        size="sm"
                        onClick={handleApplyPrice}
                        disabled={!hasPendingPriceChanges}
                        className={`flex items-center gap-1.5 h-8 px-3 text-xs ${
                          hasPendingPriceChanges 
                            ? "bg-[#5865f2] hover:bg-[#4752c4] text-white" 
                            : "bg-[#2a2d36] text-gray-400 cursor-not-allowed"
                        }`}
                      >
                        <Check className="w-3 h-3" />
                        Apply
                      </Button>
                      {hasPendingPriceChanges && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleResetLocalPrice}
                          className="h-8 px-3 text-xs text-gray-400 hover:text-white hover:bg-[#2a2d36]"
                        >
                          Reset
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

interface ActiveFiltersProps {
  activeCategories: string[];
  activeSubcategories: string[];
  activeLabels: string[];
  activeConditions: string[];
  activeTechSpecs: Record<string, string[]>;
  isDiscountFilterEnabled: boolean;
  discountPriceRange: [number, number];
  toggleFilterOption: (filterType: "category" | "subcategory" | "label" | "condition", option: string) => void;
  toggleTechSpecFilter: (specKey: string, option: string | number) => void;
  handleTechSpecRangeChange: (specKey: string, range: [number, number]) => void;
  handleClearFilters: () => void;
  handleDiscountFilterToggle: (checked: boolean) => void;
}

export function ActiveFilters({
  activeCategories, activeSubcategories, activeLabels, activeConditions, activeTechSpecs,
  isDiscountFilterEnabled, discountPriceRange,
  toggleFilterOption, toggleTechSpecFilter, handleClearFilters, handleDiscountFilterToggle, handleTechSpecRangeChange
}: ActiveFiltersProps) {
  const hasActiveFilters = activeCategories.length > 0 || activeSubcategories.length > 0 || activeLabels.length > 0 || activeConditions.length > 0 || isDiscountFilterEnabled || Object.values(activeTechSpecs).some(v => v.length > 0);

  if (!hasActiveFilters) return null;

  const formatDisplayName = (key: string): string => key.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());

  return (
    <div className="flex flex-wrap gap-2 my-4">
      {activeCategories.map((cat) => ( <Badge key={`cat-${cat}`} variant="default" className="bg-[#2a2d36] border-[#3f4354] py-1 px-2"> Category: {cat} <button onClick={() => toggleFilterOption("category", cat)} className="ml-1 text-gray-400 hover:text-white"><X className="h-3 w-3" /></button></Badge> ))}
      {activeSubcategories.map((sub) => ( <Badge key={`sub-${sub}`} variant="default" className="bg-[#2a2d36] border-[#3f4354] py-1 px-2"> Subcategory: {sub} <button onClick={() => toggleFilterOption("subcategory", sub)} className="ml-1 text-gray-400 hover:text-white"><X className="h-3 w-3" /></button></Badge> ))}
      {activeLabels.map((lab) => ( <Badge key={`lab-${lab}`} variant="default" className="bg-[#2a2d36] border-[#3f4354] py-1 px-2"> Label: {lab} <button onClick={() => toggleFilterOption("label", lab)} className="ml-1 text-gray-400 hover:text-white"><X className="h-3 w-3" /></button></Badge> ))}
      {activeConditions.map((cond) => ( <Badge key={`cond-${cond}`} variant="default" className="bg-[#2a2d36] border-[#3f4354] py-1 px-2"> Condition: {cond} <button onClick={() => toggleFilterOption("condition", cond)} className="ml-1 text-gray-400 hover:text-white"><X className="h-3 w-3" /></button></Badge> ))}
      
      {Object.entries(activeTechSpecs).map(([specKey, values]) => {
        if (specKey.endsWith('_min') || specKey.endsWith('_max')) return null;

        const minKey = `${specKey}_min`;
        const maxKey = `${specKey}_max`;
        if (activeTechSpecs[minKey] && activeTechSpecs[maxKey]) {
          return (
            <Badge key={`${specKey}-range`} variant="default" className="bg-[#2a2d36] border-[#3f4354] py-1 px-2">
              {formatDisplayName(specKey)}: {activeTechSpecs[minKey][0]} - {activeTechSpecs[maxKey][0]}
              <button onClick={() => {
                handleTechSpecRangeChange(specKey, [-1, -1]);
              }} className="ml-1 text-gray-400 hover:text-white">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          );
        }

        return values.map(value => (
          <Badge key={`${specKey}-${value}`} variant="default" className="bg-[#2a2d36] border-[#3f4354] py-1 px-2">
            {formatDisplayName(specKey)}: {String(value)}
            <button onClick={() => toggleTechSpecFilter(specKey, value)} className="ml-1 text-gray-400 hover:text-white">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ));
      })}

      {isDiscountFilterEnabled && ( <Badge variant="default" className="bg-[#2a2d36] border-[#3f4354] py-1 px-2"> Price: {formatCurrencyWithSeparator(discountPriceRange[0])} - {formatCurrencyWithSeparator(discountPriceRange[1])} <button onClick={() => handleDiscountFilterToggle(false)} className="ml-1 text-gray-400 hover:text-white"><X className="h-3 w-3" /></button></Badge> )}
      
      <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-xs hover:bg-[#2a2d36] text-gray-300 hover:text-white">Clear all</Button>
    </div>
  );
}