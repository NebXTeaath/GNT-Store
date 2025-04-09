// src/components/app/search/Filters.tsx
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { Slider } from "@/components/ui/slider"; // Import the slider component

interface FilterOption {
  name: string;
  count: number;
}

export interface FilterGroups {
  categories: FilterOption[];
  subcategories: FilterOption[];
  labels: FilterOption[];
}

interface FilterContentProps {
  filterGroups: FilterGroups;
  activeCategories: string[];
  activeSubcategories: string[];
  activeLabels: string[];
  toggleFilterOption: (filterType: "category" | "subcategory" | "label", option: string) => void;
  updateFilters: (updates: Record<string, string | null>) => void;
  handleClearFilters: () => void;
  isDiscountFilterEnabled: boolean;
  handleDiscountFilterToggle: (checked: boolean) => void;
  discountPriceRange: [number, number];
  handlePriceRangeChange: (value: [number, number] | number, isMin?: boolean) => void;
  discountPriceBounds: [number, number];
}

export function FilterContent({
  filterGroups,
  activeCategories,
  activeSubcategories,
  activeLabels,
  toggleFilterOption,
  updateFilters,
  handleClearFilters,
  isDiscountFilterEnabled,
  handleDiscountFilterToggle,
  discountPriceRange,
  handlePriceRangeChange,
  discountPriceBounds,
}: FilterContentProps) {
  return (
    <div className="space-y-6">
      <Accordion type="single" collapsible defaultValue="categories" className="border-none">
        {/* Categories Section */}
        <AccordionItem value="categories" className="border-b border-[#2a2d36]">
          <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
            <span className={activeCategories.length > 0 ? "text-[#5865f2]" : "text-white"}>Categories</span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
              {filterGroups.categories.length > 0 ? (
                filterGroups.categories.map((cat) => (
                  <div key={cat.name} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Checkbox
                        id={`category-${cat.name}`}
                        checked={activeCategories.includes(cat.name)}
                        onCheckedChange={() => toggleFilterOption("category", cat.name)}
                      />
                      <label
                        htmlFor={`category-${cat.name}`}
                        className={`ml-2 text-sm cursor-pointer ${
                          activeCategories.includes(cat.name) ? "text-[#5865f2]" : "text-gray-300"
                        }`}
                      >
                        {cat.name}
                      </label>
                    </div>
                    <span className="text-xs text-gray-400">({cat.count})</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400">No categories available</p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Subcategories Section */}
        <AccordionItem value="subcategories" className="border-b border-[#2a2d36]">
          <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
            <span className={activeSubcategories.length > 0 ? "text-[#5865f2]" : "text-white"}>Subcategories</span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
              {filterGroups.subcategories.length > 0 ? (
                filterGroups.subcategories.map((subcat) => (
                  <div key={subcat.name} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Checkbox
                        id={`subcategory-${subcat.name}`}
                        checked={activeSubcategories.includes(subcat.name)}
                        onCheckedChange={() => toggleFilterOption("subcategory", subcat.name)}
                      />
                      <label
                        htmlFor={`subcategory-${subcat.name}`}
                        className={`ml-2 text-sm cursor-pointer ${
                          activeSubcategories.includes(subcat.name) ? "text-[#5865f2]" : "text-gray-300"
                        }`}
                      >
                        {subcat.name}
                      </label>
                    </div>
                    <span className="text-xs text-gray-400">({subcat.count})</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400">No subcategories available</p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Labels Section */}
        <AccordionItem value="labels" className="border-b border-[#2a2d36]">
          <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
            <span className={activeLabels.length > 0 ? "text-[#5865f2]" : "text-white"}>Labels</span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
              {filterGroups.labels.length > 0 ? (
                filterGroups.labels.map((lab) => (
                  <div key={lab.name} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Checkbox
                        id={`label-${lab.name}`}
                        checked={activeLabels.includes(lab.name)}
                        onCheckedChange={() => toggleFilterOption("label", lab.name)}
                      />
                      <label
                        htmlFor={`label-${lab.name}`}
                        className={`ml-2 text-sm cursor-pointer ${
                          activeLabels.includes(lab.name) ? "text-[#5865f2]" : "text-gray-300"
                        }`}
                      >
                        {lab.name}
                      </label>
                    </div>
                    <span className="text-xs text-gray-400">({lab.count})</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400">No labels available</p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Discount Filter Section */}
        <AccordionItem value="discount" className="border-b border-[#2a2d36]">
          <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
            <span className={isDiscountFilterEnabled ? "text-[#5865f2]" : "text-white"}>Price Filter</span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Checkbox
                  id="filter-by-discount"
                  checked={isDiscountFilterEnabled}
                  onCheckedChange={handleDiscountFilterToggle}
                />
                <label
                  htmlFor="filter-by-discount"
                  className={`text-sm font-medium cursor-pointer ${
                    isDiscountFilterEnabled ? "text-[#5865f2]" : "text-gray-300"
                  }`}
                >
                  Filter by Price
                </label>
              </div>
              <div className={isDiscountFilterEnabled ? "" : "opacity-50 pointer-events-none"}>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-300">Min: ${discountPriceRange[0]}</span>
                    <span className="text-sm text-gray-300">Max: ${discountPriceRange[1]}</span>
                  </div>
                  {/* Discount Slider added here */}
                  <Slider
                    min={discountPriceBounds[0]}
                    max={discountPriceBounds[1]}
                    step={1}
                    value={discountPriceRange}
                    onValueChange={(value) => {
                      if (Array.isArray(value) && value.length === 2) {
                        handlePriceRangeChange(value as [number, number]);
                      }
                    }}
                    className="mb-2 
                      [&_[data-slot=slider-thumb]]:bg-[#5865f2] 
                      [&_[data-slot=slider-thumb]]:border-[#5865f2] 
                      [&_[data-slot=slider-thumb]]:focus:ring-[#5865f2] 
                      [&_[data-slot=slider-track]]:bg-[#2a2d36] 
                      [&_[data-slot=slider-range]]:bg-[#5865f27e]"
                    disabled={!isDiscountFilterEnabled}
                  />
                  <div className="flex gap-2 mt-2">
                    <input
                      type="number"
                      value={discountPriceRange[0]}
                      onChange={(e) => handlePriceRangeChange(Number(e.target.value), true)}
                      className="w-full bg-[#0f1115] border border-[#2a2d36] rounded p-1 text-sm text-white"
                      disabled={!isDiscountFilterEnabled}
                    />
                    <input
                      type="number"
                      value={discountPriceRange[1]}
                      onChange={(e) => handlePriceRangeChange(Number(e.target.value), false)}
                      className="w-full bg-[#0f1115] border border-[#2a2d36] rounded p-1 text-sm text-white"
                      disabled={!isDiscountFilterEnabled}
                    />
                  </div>
                </div>
                <div className="bg-[#2a2d36] text-gray-400 text-xs p-2 rounded">
                  Filters will apply automatically after you stop making changes.
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

// Active Filters component with badges and a clear-all option
interface ActiveFiltersProps {
  activeCategories: string[];
  activeSubcategories: string[];
  activeLabels: string[];
  isDiscountFilterEnabled: boolean;
  discountPriceRange: [number, number];
  toggleFilterOption: (filterType: "category" | "subcategory" | "label", option: string) => void;
  handleClearFilters: () => void;
  handleDiscountFilterToggle: (checked: boolean) => void;
}

export function ActiveFilters({
  activeCategories,
  activeSubcategories,
  activeLabels,
  isDiscountFilterEnabled,
  discountPriceRange,
  toggleFilterOption,
  handleClearFilters,
  handleDiscountFilterToggle,
}: ActiveFiltersProps) {
  const hasActiveFilters =
    activeCategories.length > 0 || activeSubcategories.length > 0 || activeLabels.length > 0 || isDiscountFilterEnabled;

  if (!hasActiveFilters) return null;

  return (
    <div className="flex flex-wrap gap-2 my-4">
      {activeCategories.map((cat) => (
        <Badge key={`cat-${cat}`} className="bg-[#5865f2] text-white py-1 px-2 flex items-center gap-1">
          Category: {cat}
          <button onClick={() => toggleFilterOption("category", cat)} className="ml-1">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      {activeSubcategories.map((sub) => (
        <Badge key={`sub-${sub}`} className="bg-[#5865f2] text-white py-1 px-2 flex items-center gap-1">
          Subcategory: {sub}
          <button onClick={() => toggleFilterOption("subcategory", sub)} className="ml-1">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      {activeLabels.map((lab) => (
        <Badge key={`lab-${lab}`} className="bg-[#5865f2] text-white py-1 px-2 flex items-center gap-1">
          Label: {lab}
          <button onClick={() => toggleFilterOption("label", lab)} className="ml-1">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      {isDiscountFilterEnabled && (
        <Badge className="bg-[#5865f2] text-white py-1 px-2 flex items-center gap-1">
          Price: ${discountPriceRange[0]} - ${discountPriceRange[1]}
          <button onClick={() => handleDiscountFilterToggle(false)} className="ml-1">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-xs hover:bg-[#2a2d36]">
          Clear all
        </Button>
      )}
    </div>
  );
}
