//src\components\global\Mobile\shop-drawer.tsx
"use client"

import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Gamepad2, Cpu } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

// Define the nested product categories structure type
type ProductCategoriesStructure = {
  [category: string]: {
    [subcategory: string]: string[];
  };
};

interface ShopDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShopDrawer({ open, onOpenChange }: ShopDrawerProps) {
  const navigate = useNavigate()
  const [productCategories, setProductCategories] = useState<ProductCategoriesStructure | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch the product categories structure from Supabase using the RPC function
  useEffect(() => {
    async function fetchCategories() {
      setLoading(true)
      const { data, error } = await supabase.rpc("get_product_categories_structure")
      if (error) {
        console.error("Error fetching product categories structure:", error)
        toast.error("Failed to load categories")
      } else {
        setProductCategories(data as ProductCategoriesStructure)
      }
      setLoading(false)
    }
    
    if (open) {
      fetchCategories()
    }
  }, [open])

  const handleNavigate = (path: string) => {
    navigate(path)
    onOpenChange(false)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-[#0f1115] text-white border-t border-[#2a2d36] flex flex-col h-[80vh]">
        <DrawerHeader className="border-b border-[#2a2d36]">
          <DrawerTitle className="text-white">Shop Catalog</DrawerTitle>
          <DrawerDescription className="text-gray-400">
            Browse our product categories
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full bg-[#2a2d36]" />
              <Skeleton className="h-12 w-full bg-[#2a2d36]" />
              <Skeleton className="h-12 w-full bg-[#2a2d36]" />
            </div>
          ) : (
            <div className="py-2">
              {productCategories ? (
  <Accordion
    type="multiple"
    defaultValue={
      // Compute default open keys from productCategories
      Object.entries(productCategories).reduce<string[]>((acc, [category, subcategories]) => {
        const subKeys = Object.keys(subcategories).map(subcategory => `${category}-${subcategory}`)
        return [...acc, ...subKeys]
      }, [])
    }
    className="w-full"
  >
    {Object.entries(productCategories).map(([category, subcategories],index) => (
      <div key={category}>
        <div 
          className="flex items-center gap-2 mb-2 py-2 text-lg font-semibold text-white hover:text-[#5865f2] cursor-pointer"
          onClick={() => handleNavigate(`/${category}`)}
        >
          {category === "Consoles" ? (
            <Gamepad2 className="h-5 w-5" />
          ) : category === "Computers" ? (
            <Cpu className="h-5 w-5" />
          ) : null}
          <span>{category}</span>
        </div>
        
        <div className="ml-2">
          {Object.entries(subcategories).map(([subcategory, labels]) => (
            <AccordionItem 
              key={subcategory} 
              value={`${category}-${subcategory}`}
              className="border-b-0"
            >
              <div className="flex items-center">
                <div
                  className="flex-1 text-base font-medium text-gray-300 hover:text-[#5865f2] py-2 cursor-pointer"
                  onClick={() => handleNavigate(`/${category}/${subcategory}`)}
                >
                  {subcategory}
                </div>
                {labels.length > 0 && (
                  <AccordionTrigger className="hover:no-underline py-2" onClick={(e) => e.stopPropagation()} />
                )}
              </div>
              
              {labels.length > 0 && (
                <AccordionContent>
                  <div className="ml-4 mt-2 grid grid-cols-2 gap-2">
                    {labels.map((label) => (
                      <Link
                        key={label}
                        to={`/${category}/${subcategory}?label=${encodeURIComponent(label)}`}
                        className="text-sm text-gray-400 hover:text-[#5865f2] py-1"
                        onClick={() => onOpenChange(false)}
                      >
                        {label}
                      </Link>
                    ))}
                  </div>
                </AccordionContent>
              )}
            </AccordionItem>
          ))}
        </div>
        
        {index < Object.entries(productCategories).length - 1 && (
          <Separator className="my-3 bg-[#2a2d36]" />
        )}
      </div>
    ))}
  </Accordion>
) : (
  <div className="px-3 py-2 text-sm text-gray-300">No categories available</div>
)}

            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}