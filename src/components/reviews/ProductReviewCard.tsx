// src/components/reviews/ProductReviewCard.tsx
    import React from 'react';
    import { Star } from 'lucide-react';
    import { ProductReview } from '@/lib/types/review';
    import { cn } from '@/lib/utils';
    import { formatDate } from '@/lib/pages/order/orderHistory/orderService';

    interface ProductReviewCardProps {
      review: ProductReview;
      className?: string;
    }

    const ProductReviewCard: React.FC<ProductReviewCardProps> = ({ review, className }) => {
      const renderStars = () => {
        return Array(5).fill(0).map((_, index) => (
          <Star
            key={index}
            size={16}
            className={cn(
              "inline-block",
              index < review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-600"
            )}
          />
        ));
      };

      return (
        <div className={cn(
          "p-4 border border-[#2a2d36] rounded-lg bg-[#1a1c23]",
          className
        )}>
          <div className="flex items-center mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
              {review.user_name ? review.user_name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="ml-3">
              <h4 className="font-medium text-sm text-white">{review.user_name || 'Anonymous User'}</h4>
              <p className="text-xs text-gray-400">{formatDate(review.created_at)}</p>
            </div>
          </div>
          <div className="flex mb-2">{renderStars()}</div>
          {review.title && <h5 className="font-semibold text-md text-white mb-1">{review.title}</h5>}
          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{review.comment}</p>
        </div>
      );
    };

    export default ProductReviewCard;