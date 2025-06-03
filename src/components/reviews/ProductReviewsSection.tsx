// src/components/reviews/ProductReviewsSection.tsx
import React, { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query'; // Import keepPreviousData
import { supabase } from '@/lib/supabase';
import { ProductReview } from '@/lib/types/review';
import ProductReviewCard from './ProductReviewCard';
import { Pagination } from '@/components/pages/searchPage/search/Pagination';
import { Loader2, Star, MessageSquare } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface ProductReviewsSectionProps {
  productId: string;
  productName: string;
}

const REVIEWS_PER_PAGE = 5;

const ProductReviewsSection: React.FC<ProductReviewsSectionProps> = ({ productId, productName }) => {
  const [currentPage, setCurrentPage] = useState(1);

  const fetchReviews = async (page: number) => {
    const { data, error } = await supabase.rpc('get_product_reviews', {
      p_product_id: productId,
      p_page_number: page,
      p_page_size: REVIEWS_PER_PAGE,
    });
    if (error) throw error;
    return (data as ProductReview[]) || []; // Ensure it returns an array even if data is null
  };

  const fetchReviewCount = async () => {
    const { data, error } = await supabase.rpc('count_verified_product_reviews', {
      p_product_id: productId,
    });
    if (error) throw error;
    return (data as number) ?? 0; // Default to 0 if data is null
  };

  const fetchAverageRating = async () => {
    const { data, error } = await supabase.rpc('get_average_product_rating', {
      p_product_id: productId,
    });
    if (error) throw error;
    return (data as number) ?? 0; // Default to 0 if data is null
  };

  const { data: reviews, isLoading: isLoadingReviews, error: reviewsError } = useQuery<ProductReview[], Error>({
    queryKey: ['productReviews', productId, currentPage],
    queryFn: () => fetchReviews(currentPage),
    placeholderData: keepPreviousData, // Corrected: Use placeholderData with keepPreviousData
    staleTime: 5 * 60 * 1000
  });

  const { data: totalReviews, isLoading: isLoadingCount } = useQuery<number, Error>({
    queryKey: ['productReviewCount', productId],
    queryFn: fetchReviewCount,
    staleTime: 5 * 60 * 1000
  });

  const { data: averageRating, isLoading: isLoadingRating } = useQuery<number, Error>({
    queryKey: ['productAverageRating', productId],
    queryFn: fetchAverageRating,
    staleTime: 5 * 60 * 1000
  });

  const totalPages = totalReviews != null ? Math.ceil(totalReviews / REVIEWS_PER_PAGE) : 0;

  const renderStars = (ratingInput: number | null | undefined) => {
    const rating = ratingInput ?? 0;
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    return (
      <>
        {Array(fullStars).fill(0).map((_, i) => <Star key={`full-${i}`} className="h-5 w-5 text-yellow-400 fill-yellow-400" />)}
        {halfStar && <Star key="half" className="h-5 w-5 text-yellow-400 fill-yellow-300" />}
        {Array(emptyStars).fill(0).map((_, i) => <Star key={`empty-${i}`} className="h-5 w-5 text-gray-600" />)}
      </>
    );
  };

  if (isLoadingReviews || isLoadingCount || isLoadingRating) {
    return (
      <div className="mt-12 py-8">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#5865f2]" />
        <p className="text-center text-gray-400 mt-2">Loading reviews...</p>
      </div>
    );
  }

  if (reviewsError) {
    return (
      <div className="mt-12 py-8 text-center text-red-400">
        Error loading reviews: {reviewsError.message}
      </div>
    );
  }

  // Use a new variable for mapping to help TypeScript, and ensure reviews is an array.
  const displayReviews = reviews || [];

  if (displayReviews.length === 0 || (totalReviews ?? 0) === 0) {
    return (
      <div className="mt-12 py-8 text-center">
        <MessageSquare className="mx-auto h-12 w-12 text-gray-500 mb-4" />
        <h3 className="text-xl font-semibold text-white">No Reviews Yet</h3>
        <p className="text-gray-400 mt-1">Buy now to be the first to review {productName}!</p>
      </div>
    );
  }

  return (
    <div className="mt-12 py-8">
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Customer Reviews</h2>
      <div className="flex items-center gap-4 mb-6">
        {averageRating != null && averageRating > 0 ? (
          <>
            <div className="flex items-center">{renderStars(averageRating)}</div>
            <span className="text-xl font-semibold text-white">{(averageRating ?? 0).toFixed(1)}</span>
            <span className="text-gray-400">({totalReviews ?? 0} review{totalReviews !== 1 ? 's' : ''})</span>
          </>
        ) : (
          <span className="text-gray-400">No ratings yet.</span>
        )}
      </div>
      <Separator className="my-6 bg-[#2a2d36]" />
      <div className="space-y-6">
        {displayReviews.map((review: ProductReview) => (
          <ProductReviewCard key={review.review_id} review={review} />
        ))}
      </div>
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
      )}
    </div>
  );
};

export default ProductReviewsSection;