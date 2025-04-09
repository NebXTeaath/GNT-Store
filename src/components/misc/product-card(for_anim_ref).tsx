
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import type { ProductSearchResult } from "@/lib/types/product";

interface ProductCardProps {
  product: ProductSearchResult;
  index: number;
}

export function ProductCard({ product, index }: ProductCardProps) {
  const navigate = useNavigate();

  // Calculate animation delay based on index
  const delay = index * 0.05;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.5, 
        delay,
        ease: [0.22, 1, 0.36, 1]
      }}
      className="product-card"
      onClick={() => navigate(`/product/${product.product_id}`)}
    >
      <div className="aspect-square relative bg-[#1a1c23] overflow-hidden">
        <img
          src={product.primary_image || "/placeholder.svg"}
          alt={product.product_name}
          className="w-full h-full object-contain p-4"
        />
        
        {product.is_featured && (
          <div className="absolute top-2 right-2 bg-[#5865f2] text-white text-xs px-2 py-1 rounded">
            Featured
          </div>
        )}
        
        {product.category && (
          <div className="absolute top-2 left-2 bg-[#1a1c23] text-white text-xs px-2 py-1 rounded border border-[#2a2d36]">
            {product.category}
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="font-medium line-clamp-2 mb-1 min-h-[2.5rem]">{product.product_name}</h3>
        
        {product.product_description && (
          <p className="text-xs text-gray-400 mb-2 line-clamp-2">{product.product_description}</p>
        )}
        
        <div className="flex items-center justify-between mt-2">
          <div>
            {product.discount_price ? (
              <div className="flex items-center gap-2">
                <span className="text-[#5865f2] font-bold">${product.discount_price.toFixed(2)}</span>
                <span className="text-sm text-gray-400 line-through">${product.price.toFixed(2)}</span>
              </div>
            ) : (
              <span className="font-bold text-white">${product.price.toFixed(2)}</span>
            )}
          </div>
          
          {product.average_rating && (
            <div className="flex items-center text-sm">
              <span className="text-yellow-400">★</span>
              <span className="ml-1 text-gray-300">{product.average_rating.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
