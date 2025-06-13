// src/components/global/Mobile/shop-drawer.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
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
// MODIFICATION: Import the new types
import { useProductCategories, LabelItem, SubcategoryDataItem } from '@/components/global/hooks/useProductCategories';
import { CachedImage } from '@/components/global/cached-image';

interface ShopCatalogDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SubcategoryAccordionItemProps {
  categoryName: string;
  // MODIFICATION: Pass the whole subcategory item object
  subcategoryItem: SubcategoryDataItem;
  onNavigate: (path: string, message: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const SubcategoryAccordionItem: React.FC<SubcategoryAccordionItemProps> = ({
  categoryName,
  subcategoryItem, // Use the whole item
  onNavigate,
  isOpen,
  onToggle,
}) => {
  // MODIFICATION: Destructure from the item object
  const { name: subcategoryName, data: subcategoryData } = subcategoryItem;
  const labels = subcategoryData.labels;

  return (
    <div className="border-b border-[#2a2d36] last:border-b-0 py-2">
      <div
        className="flex items-center justify-between py-3 cursor-pointer"
        onClick={() => {
          if (labels.length > 0) {
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
    // MODIFICATION: Check for the new structure
    if (productCategories && productCategories.categories) {
      // Map over the array to get category names
      const categoryNames = productCategories.categories.map(cat => cat.name);
      setOpenCategoryAccordions(categoryNames);
      
      // Keep sub-category accordions closed by default. They open on user click.
      setOpenSubCategoryAccordions({});
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
              ) : productCategories && productCategories.categories.length > 0 ? (
                <Accordion 
                  type="multiple" 
                  className="space-y-4 pb-4"
                  value={openCategoryAccordions} 
                  onValueChange={setOpenCategoryAccordions}
                >
                  {/* MODIFICATION: Loop through the categories array */}
                  {productCategories.categories.map((categoryItem, catIdx) => (
                    <AccordionItem key={`${categoryItem.name}-${catIdx}`} value={categoryItem.name} className="border-[#2a2d36]">
                      <AccordionTrigger className="hover:no-underline p-2 rounded-md hover:bg-[#1e2129] transition-colors">
                        <div className="flex items-center gap-3">
                          {categoryItem.name === "Consoles" ? <Gamepad2 className="h-6 w-6 text-[#5865f2]" /> : categoryItem.name === "Computers" ? <Cpu className="h-6 w-6 text-[#5865f2]" /> : null}
                          <span className="text-lg font-semibold text-white">{categoryItem.name}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="ml-4 pl-4 border-l border-[#2a2d36] pt-2">
                        {/* MODIFICATION: Check and loop through the subcategories array */}
                        {Array.isArray(categoryItem.subcategories) ? 
                            categoryItem.subcategories.map((subcategoryItem) => (
                            <SubcategoryAccordionItem
                                key={`${categoryItem.name}-${subcategoryItem.name}-${catIdx}`}
                                categoryName={categoryItem.name}
                                subcategoryItem={subcategoryItem}
                                onNavigate={handleNavigation}
                                isOpen={(openSubCategoryAccordions[categoryItem.name] || []).includes(subcategoryItem.name)}
                                onToggle={() => toggleSubCategoryAccordion(categoryItem.name, subcategoryItem.name)}
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