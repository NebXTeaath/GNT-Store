//src/pages/searchPage/search/ProductCard.tsx
import { useNavigate } from "react-router-dom";
import { calculateDiscountPercentage } from "@/pages/searchPage/search/discountUtils";
import { formatCurrencyWithSeparator } from "@/lib/currencyFormat";

interface Product {
  product_id: string;
  slug: string;
  primary_image: string | null;
  product_name: string;
  is_bestseller?: boolean;
  label?: string;
  condition?: string
  price: number;
  discount_price: number;
  average_rating?: number;
}

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/product/${product.slug}`)}
      data-href={`/product/${product.slug}`}
      className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg overflow-hidden hover:border-[#5865f2] transition-colors duration-300 cursor-pointer"
    >
      <div className="aspect-square relative">
        <img src={product.primary_image || "/placeholder.svg"} alt={product.product_name} className="w-full h-full object-cover" />
        {product.is_bestseller && (
          <div className="absolute top-2 right-2 bg-[#EFBF04] text-[#444444] font-bold text-xs px-2 py-1 rounded border border-[#EFBF04]">
            Popular
          </div>
        )}
        <div className="absolute bottom-2 left-2 bg-[#1a1c23] text-white text-xs px-2 py-1 rounded border border-[#2a2d36]">
          {product.condition}
        </div>
        {product.price > product.discount_price && (
          <div className="absolute bottom-2 right-2 bg-[#ff4d4d] text-white text-xs px-2 py-1 rounded">
            {calculateDiscountPercentage(product.price, product.discount_price)}% OFF
          </div>
        )}
      </div>
      <div className="p-4">
        <h2 className="font-bold mb-2 line-clamp-2 h-12 overflow-hidden text-ellipsis">
          {product.product_name}
        </h2>
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
          <p className="text-[#5865f2] font-bold text-xl">
            {formatCurrencyWithSeparator(product.discount_price)}
        </p>
            {product.price > product.discount_price && (
              <p className="text-gray-400 text-xs line-through">
              {formatCurrencyWithSeparator(product.price)}
            </p>            
            )}
          </div>
          {/*
            {product.average_rating && (
              <div className="flex items-center">
                <span className="text-yellow-400 mr-1">★</span>
                <span className="text-sm">{formatCurrencyWithSeparator(product.average_rating)}</span>
              </div>
            )}
          */}
        </div>
      </div>
    </div>
  );
}
