// src/components/global/productsPage/ProductCard/ProductCard.tsx
import { useNavigate } from "react-router-dom";
import { calculateDiscountPercentage } from "@/lib/pages/searchPage/search/discountUtils";
import { formatCurrencyWithSeparator } from "@/lib/currencyFormat";
import { OptimizedImage } from "./optimized-image";
import { Star } from "lucide-react"; // <<<--- 1. Import Star icon
import { cn } from "@/lib/utils";    // <<<--- Import cn for conditional styling

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
  review_count?: number; // <<<--- Add review_count if you want to display it too
}

interface ProductCardProps {
  product: Product;
  isAboveTheFold?: boolean;
  priority?: 'high' | 'low' | 'auto';
}

export function ProductCard({ product, isAboveTheFold = false, priority = 'auto' }: ProductCardProps) {
  console.log("ProductCard received product:", product);
  const navigate = useNavigate();
  const hasDiscount = product.price > product.discount_price;
  const averageRating = product.average_rating ?? 0;
  const reviewCount = product.review_count ?? 0;

  return (
    <div
      onClick={() => navigate(`/product/${product.slug}`)}
      data-href={`/product/${product.slug}`}
      className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg overflow-hidden hover:border-[#5865f2] transition-colors duration-300 cursor-pointer flex flex-col" // Added flex flex-col
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
        
        <div className="absolute top-2 right-2 min-h-[24px] min-w-[60px]">
          {product.is_bestseller && (
            <div className="bg-[#EFBF04] text-[#444444] font-bold text-xs px-2 py-1 rounded border border-[#EFBF04]">
              Popular
            </div>
          )}
        </div>
        
        <div className="absolute bottom-2 left-2 min-h-[24px] min-w-[60px]">
          <div className="bg-[#1a1c23] text-white text-xs px-2 py-1 rounded border border-[#2a2d36]">
            {product.condition || "New"}
          </div>
        </div>
        
        <div className="absolute bottom-2 right-2 min-h-[24px] min-w-[70px] flex justify-end">
          {hasDiscount && (
            <div className="bg-[#ff4d4d] text-white text-xs px-2 py-1 rounded">
              {calculateDiscountPercentage(product.price, product.discount_price)}% OFF
            </div>
          )}
        </div>
      </div>
      
      {/* Product information container */}
      <div className="p-4 flex flex-col flex-grow"> {/* Added flex flex-col flex-grow */}
        <div className="h-12 mb-2">
          <h2 className="font-bold line-clamp-2 overflow-hidden text-ellipsis">
            {product.product_name}
          </h2>
        </div>
        
        {/* Price and Rating container */}
        <div className="flex justify-between items-center mt-auto"> {/* Added mt-auto to push to bottom */}
          {/* Price information */}
          <div className="flex flex-col">
            <p className="text-[#5865f2] font-bold text-xl">
              {formatCurrencyWithSeparator(product.discount_price)}
            </p>
            <div className="h-4">
              {hasDiscount && (
                <p className="text-gray-400 text-xs line-through">
                  {formatCurrencyWithSeparator(product.price)}
                </p>
              )}
            </div>
          </div>

          {/* Rating information - aligned to the right */}
          {averageRating > 0 && ( // <<<--- 2. Conditionally render rating
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
              <span className="text-white font-medium">{averageRating.toFixed(1)}</span>
              {reviewCount > 0 && (
                <span className="text-gray-400 text-xs">({reviewCount})</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}