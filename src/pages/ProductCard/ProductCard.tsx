// src/pages/searchPage/search/ProductCard.tsx
import { useNavigate } from "react-router-dom";
import { calculateDiscountPercentage } from "@/pages/searchPage/search/discountUtils";
import { formatCurrencyWithSeparator } from "@/lib/currencyFormat";
import { OptimizedImage } from "./optimized-image";

interface Product {
  product_id: string;
  slug: string;
  primary_image: string | null;
  product_name: string;
  is_bestseller?: boolean;
  label?: string;
  condition?: string;
  price: number;
  discount_price: number;
  average_rating?: number;
}

interface ProductCardProps {
  product: Product;
  isAboveTheFold?: boolean;
  priority?: 'high' | 'low' | 'auto';
}

export function ProductCard({ product, isAboveTheFold = false, priority = 'auto' }: ProductCardProps) {
  const navigate = useNavigate();
  const hasDiscount = product.price > product.discount_price;

  return (
    <div
      onClick={() => navigate(`/product/${product.slug}`)}
      data-href={`/product/${product.slug}`}
      className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg overflow-hidden hover:border-[#5865f2] transition-colors duration-300 cursor-pointer"
    >
      {/* Image container with fixed aspect ratio */}
      <div className="aspect-square relative pb-[100%]"> {/* Enforce 1:1 ratio */}
        <OptimizedImage
          src={product.primary_image}
          alt={product.product_name}
          className="absolute inset-0 w-full h-full object-cover"
          width={400}
          height={400}
          isAboveTheFold={isAboveTheFold}
          fetchPriority={priority}
        />
        
        {/* Reserved space for Popular badge */}
        <div className="absolute top-2 right-2 min-h-[24px] min-w-[60px]">
          {product.is_bestseller && (
            <div className="bg-[#EFBF04] text-[#444444] font-bold text-xs px-2 py-1 rounded border border-[#EFBF04]">
              Popular
            </div>
          )}
        </div>
        
        {/* Reserved space for condition badge */}
        <div className="absolute bottom-2 left-2 min-h-[24px] min-w-[60px]">
          <div className="bg-[#1a1c23] text-white text-xs px-2 py-1 rounded border border-[#2a2d36]">
            {product.condition || "New"}
          </div>
        </div>
        
        {/* Reserved space for discount badge */}
        <div className="absolute bottom-2 right-2 min-h-[24px] min-w-[70px] flex justify-end">
          {hasDiscount && (
            <div className="bg-[#ff4d4d] text-white text-xs px-2 py-1 rounded">
              {calculateDiscountPercentage(product.price, product.discount_price)}% OFF
            </div>
          )}
        </div>
      </div>
      
      {/* Product information container */}
      <div className="p-4">
        {/* Fixed height product name container */}
        <div className="h-12 mb-2">
          <h2 className="font-bold line-clamp-2 overflow-hidden text-ellipsis">
            {product.product_name}
          </h2>
        </div>
        
        {/* Price information with fixed height */}
        <div className="flex justify-between items-center min-h-[3rem]">
          <div className="flex flex-col min-w-[80px]">
            <p className="text-[#5865f2] font-bold text-xl">
              {formatCurrencyWithSeparator(product.discount_price)}
            </p>
            <div className="h-4"> {/* Fixed height for price */}
              {hasDiscount && (
                <p className="text-gray-400 text-xs line-through">
                  {formatCurrencyWithSeparator(product.price)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}