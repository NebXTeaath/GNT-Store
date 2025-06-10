// src/components/global/Mobile/ShopCatalogDrawer.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Gamepad2, Cpu, XIcon, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useLoading } from '@/components/global/Loading/LoadingContext';
import { cn } from '@/lib/utils';
import { useProductCategories, LabelItem, ProductCategoriesStructure } from '@/components/global/hooks/useProductCategories.ts';
import { CachedImage } from '@/components/global/cached-image';

interface ShopCatalogDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SubcategoryAccordionItemProps {
  categoryName: string;
  subcategoryName: string;
  labels: LabelItem[];
  onNavigate: (path: string, message: string) => void;
  // Props for controlling this sub-accordion's open state from parent
  isOpen: boolean;
  onToggle: () => void;
}

const SubcategoryAccordionItem: React.FC<SubcategoryAccordionItemProps> = ({
  categoryName,
  subcategoryName,
  labels,
  onNavigate,
  isOpen,       // Use passed-in isOpen state
  onToggle,     // Use passed-in onToggle function
}) => {
  // const [isOpen, setIsOpen] = useState(true); // Remove local state for open/close

  return (
    <div className="border-b border-[#2a2d36] last:border-b-0 py-2">
      <div
        className="flex items-center justify-between py-3 cursor-pointer"
        onClick={() => {
          if (labels.length > 0) {
            // setIsOpen(!isOpen); // Use onToggle instead
            onToggle();
          } else {
            onNavigate(`/${categoryName}/${subcategoryName}`, `Loading ${subcategoryName}...`);
          }
        }}
      >
        <span 
          className="text-base font-medium text-gray-300 hover:text-[#5865f2]"
          onClick={(e) => {
            e.stopPropagation(); 
            onNavigate(`/${categoryName}/${subcategoryName}`, `Loading ${subcategoryName}...`);
          }}
        >
          {subcategoryName}
        </span>
        {labels.length > 0 && (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400" aria-label={isOpen ? "Collapse" : "Expand"}>
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        )}
      </div>
      {isOpen && labels.length > 0 && ( // Use isOpen prop here
        <div className="pl-4 pt-2 pb-4 grid grid-cols-2 gap-x-3 gap-y-4">
          {labels.map((labelItem, labelIdx) => {
             if (typeof labelItem !== 'object' || labelItem === null || !labelItem.hasOwnProperty('name') || typeof labelItem.name !== 'string') {
                console.error("[ShopCatalogDrawer] Invalid labelItem:", labelItem);
                return <div key={`err-${labelIdx}`} className="text-xs text-red-500">Invalid Label</div>;
            }
            const itemName = String(labelItem.name).trim();
             if (!itemName) {
                console.error("[ShopCatalogDrawer] Empty label name for:", labelItem);
                return <div key={`empty-${labelIdx}`} className="text-xs text-orange-500">Empty Label</div>;
            }
            const uniqueKey = `drawer-${categoryName}-${subcategoryName}-${itemName}-${labelIdx}`;

            return (
              <div
                key={uniqueKey}
                onClick={() => onNavigate(`/${categoryName}/${subcategoryName}?label=${encodeURIComponent(itemName)}`, `Loading ${itemName}...`)}
                className="flex flex-col items-center text-center p-2 rounded-lg hover:bg-[#22252e] transition-all duration-200 ease-in-out cursor-pointer group transform hover:scale-105"
              >
                <CachedImage
                  src={labelItem.display_url}
                  alt={itemName}
                  className="w-20 h-20 mb-2 rounded-md bg-[#2a2d36] border border-transparent group-hover:border-[#5865f2] transition-all duration-200 shadow-md"
                  imgClassName="w-full h-full object-contain"
                  placeholderSrc="https://images.gnt-store.shop/favicon.ico"
                  queryKeySuffix={`drawer-catalog-icon-${itemName}`}
                />
                <span className="text-xs text-gray-300 group-hover:text-white transition-colors">
                  {itemName}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export function ShopCatalogDrawer({ open, onOpenChange }: ShopCatalogDrawerProps) {
  const navigate = useNavigate();
  const { setIsLoading: setGlobalLoading, setLoadingMessage } = useLoading();

  const {
    data: productCategories,
    isLoading: categoriesLoading,
  } = useProductCategories();

  const [openCategoryAccordions, setOpenCategoryAccordions] = useState<string[]>([]);
  const [openSubCategoryAccordions, setOpenSubCategoryAccordions] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (productCategories && Object.keys(productCategories).length > 0) {
      setOpenCategoryAccordions(Object.keys(productCategories));
      
      const initialOpenSubcategories: Record<string, string[]> = {};
      Object.keys(productCategories).forEach(catKey => {
        if (productCategories[catKey]) { // Check if subcategories exist for this category
             initialOpenSubcategories[catKey] = Object.keys(productCategories[catKey]);
        } else {
            initialOpenSubcategories[catKey] = [];
        }
      });
      setOpenSubCategoryAccordions(initialOpenSubcategories);
    }
  }, [productCategories]);

  const handleNavigation = (path: string, message: string) => {
    setLoadingMessage(message);
    setGlobalLoading(true);
    onOpenChange(false); 
    setTimeout(() => {
        navigate(path);
    }, 300);
  };

  // Toggle function for sub-category accordions
  const toggleSubCategoryAccordion = (categoryName: string, subCategoryName: string) => {
    setOpenSubCategoryAccordions(prev => {
      const currentOpenForCat = prev[categoryName] || [];
      const isOpen = currentOpenForCat.includes(subCategoryName);
      return {
        ...prev,
        [categoryName]: isOpen 
          ? currentOpenForCat.filter(sc => sc !== subCategoryName) 
          : [...currentOpenForCat, subCategoryName]
      };
    });
  };


  return (
    <Drawer open={open} onOpenChange={onOpenChange}> 
      <DrawerContent className="bg-[#0f1115] text-white border-t border-[#2a2d36] flex flex-col h-[90vh] outline-none">
        <DrawerHeader className="p-4 border-b border-[#2a2d36] flex-shrink-0 text-left">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-white text-xl">Shop Catalog</DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                <XIcon className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </Button>
            </DrawerClose>
          </div>
          <DrawerDescription className="text-gray-400 text-sm mt-1">
            Browse our product categories
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto dark-theme-scrollbar">
          <div className="p-4">
              {categoriesLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => <Skeleton key={`skel-cat-${i}`} className="h-10 w-full bg-[#2a2d36] mb-3" />)}
                </div>
              ) : productCategories && Object.keys(productCategories).length > 0 ? (
                <Accordion 
                  type="multiple" 
                  className="space-y-4 pb-4"
                  value={openCategoryAccordions} 
                  onValueChange={setOpenCategoryAccordions}
                >
                  {Object.entries(productCategories).map(([category, subcategoriesObj], catIdx) => (
                    <AccordionItem key={`${category}-${catIdx}`} value={category} className="border-[#2a2d36]">
                      <AccordionTrigger className="hover:no-underline p-2 rounded-md hover:bg-[#1e2129] transition-colors">
                        <div className="flex items-center gap-3">
                          {category === "Consoles" ? <Gamepad2 className="h-6 w-6 text-[#5865f2]" /> : category === "Computers" ? <Cpu className="h-6 w-6 text-[#5865f2]" /> : null}
                          <span className="text-lg font-semibold text-white">{category}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="ml-4 pl-4 border-l border-[#2a2d36] pt-2">
                        {typeof subcategoriesObj === 'object' && subcategoriesObj !== null ? 
                            Object.entries(subcategoriesObj).map(([subcategoryName, labelsArray]) => (
                            <SubcategoryAccordionItem
                                key={`${category}-${subcategoryName}-${catIdx}`}
                                categoryName={category}
                                subcategoryName={subcategoryName}
                                labels={Array.isArray(labelsArray) ? labelsArray : []}
                                onNavigate={handleNavigation}
                                isOpen={(openSubCategoryAccordions[category] || []).includes(subcategoryName)}
                                onToggle={() => toggleSubCategoryAccordion(category, subcategoryName)}
                            />
                            )) : <p className="text-sm text-gray-500">No subcategories</p>
                        }
                       </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <div className="text-center py-10 text-gray-400">
                  <p>No categories available at the moment.</p>
                </div>
              )}
            </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}