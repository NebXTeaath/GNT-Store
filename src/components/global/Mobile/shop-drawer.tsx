// src/components/global/Mobile/ShopCatalogDrawer.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLoading } from '@/components/global/Loading/LoadingContext';
import { cn } from '@/lib/utils';

// Types (same as before)
type LabelItem = {
  name: string;
  display_url: string | null;
};

type ProductCategoriesStructure = {
  [category: string]: {
    [subcategory: string]: LabelItem[];
  };
};

async function fetchDrawerCategoriesStructure(): Promise<ProductCategoriesStructure | null> {
  console.log("[ShopCatalogDrawer] Fetching category structure...");
  const { data, error } = await supabase.rpc("get_product_categories_structure");
  if (error) {
    console.error("[ShopCatalogDrawer] Error fetching categories:", error);
    toast.error("Failed to load shop categories");
    return null;
  }
  if (data === null || typeof data !== 'object') return null;
  if (Array.isArray(data) && data.length > 0 && data[0] && typeof data[0] === 'object' && 'get_product_categories_structure' in data[0]) {
     return (data[0] as any).get_product_categories_structure as ProductCategoriesStructure | null;
  }
  return data as ProductCategoriesStructure | null;
}

interface ShopCatalogDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SubcategoryAccordionItemProps {
  categoryName: string;
  subcategoryName: string;
  labels: LabelItem[];
  onNavigate: (path: string, message: string) => void;
}

const SubcategoryAccordionItem: React.FC<SubcategoryAccordionItemProps> = ({
  categoryName,
  subcategoryName,
  labels,
  onNavigate,
}) => {
  const [isOpen, setIsOpen] = useState(true); 

  return (
    <div className="border-b border-[#2a2d36] last:border-b-0 py-2">
      <div
        className="flex items-center justify-between py-3 cursor-pointer"
        onClick={() => {
          if (labels.length > 0) {
            setIsOpen(!isOpen);
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
      {isOpen && labels.length > 0 && (
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
            const uniqueKey = `${categoryName}-${subcategoryName}-${itemName}-${labelIdx}`;

            return (
              <div
                key={uniqueKey}
                onClick={() => onNavigate(`/${categoryName}/${subcategoryName}?label=${encodeURIComponent(itemName)}`, `Loading ${itemName}...`)}
                className="flex flex-col items-center text-center p-2 rounded-lg hover:bg-[#22252e] transition-all duration-200 ease-in-out cursor-pointer group transform hover:scale-105"
              >
                <img
                  src={labelItem.display_url || 'https://images.gnt-store.shop/favicon.ico'}
                  alt={itemName}
                  className="w-20 h-20 object-contain mb-2 rounded-md bg-[#2a2d36] border border-transparent group-hover:border-[#5865f2] transition-all duration-200 shadow-md"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
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
  } = useQuery<ProductCategoriesStructure | null, Error>({
    queryKey: ['drawerProductCategoriesStructure'],
    queryFn: fetchDrawerCategoriesStructure,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 120,
    refetchOnWindowFocus: false,
    enabled: open,
  });

  const handleNavigation = (path: string, message: string) => {
    setLoadingMessage(message);
    setGlobalLoading(true);
    onOpenChange(false); 
    setTimeout(() => {
        navigate(path);
    }, 300);
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

        {/* Key changes: Explicit height and min-height for ScrollArea */}
        <div className="flex-1 overflow-y-auto dark-theme-scrollbar">
          <div className="p-4">
              {categoriesLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => <Skeleton key={`skel-cat-${i}`} className="h-10 w-full bg-[#2a2d36] mb-3" />)}
                </div>
              ) : productCategories && Object.keys(productCategories).length > 0 ? (
                <div className="space-y-6 pb-4">
                  {Object.entries(productCategories).map(([category, subcategoriesObj], catIdx) => (
                    <div key={`${category}-${catIdx}`}>
                      <div
                        onClick={() => handleNavigation(`/${category}`, `Loading ${category}...`)}
                        className="flex items-center gap-3 mb-3 p-2 rounded-md hover:bg-[#1e2129] cursor-pointer transition-colors"
                      >
                        {category === "Consoles" ? <Gamepad2 className="h-6 w-6 text-[#5865f2]" /> : category === "Computers" ? <Cpu className="h-6 w-6 text-[#5865f2]" /> : null}
                        <span className="text-lg font-semibold text-white">{category}</span>
                      </div>
                      <div className="ml-4 pl-4 border-l border-[#2a2d36]">
                        {typeof subcategoriesObj === 'object' && subcategoriesObj !== null ? 
                            Object.entries(subcategoriesObj).map(([subcategoryName, labelsArray]) => (
                            <SubcategoryAccordionItem
                                key={`${category}-${subcategoryName}-${catIdx}`}
                                categoryName={category}
                                subcategoryName={subcategoryName}
                                labels={Array.isArray(labelsArray) ? labelsArray : []}
                                onNavigate={handleNavigation}
                            />
                            )) : <p className="text-sm text-gray-500">No subcategories</p>
                        }
                      </div>
                      {catIdx < Object.keys(productCategories).length - 1 && <Separator className="my-6 bg-[#2a2d36]" />}
                    </div>
                  ))}
                </div>
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