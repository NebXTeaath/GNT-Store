// src/components/reviews/WriteReviewModal.tsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { ProductReview } from '@/lib/types/review';
import { useQueryClient } from '@tanstack/react-query';
import { FunctionsHttpError } from '@supabase/supabase-js';
import WriteReviewForm from './WriteReviewForm'; // Import the new form component

interface WriteReviewModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productSlug: string;
  orderId: string;
  productName: string;
  existingReview?: ProductReview | null;
  onReviewSubmitted?: () => void;
}

const WriteReviewModal: React.FC<WriteReviewModalProps> = ({
  isOpen, onOpenChange, productId, productSlug, orderId, productName, existingReview, onReviewSubmitted
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setRating(existingReview?.rating || 0);
      setTitle(existingReview?.title || '');
      setComment(existingReview?.comment || '');
      setError(null);
    }
  }, [existingReview, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("You must be logged in to submit a review.");
      toast.error("Authentication Required", { description: "Please log in." });
      return;
    }
    if (rating === 0) {
      setError("Please select a rating.");
      toast.error("Rating is required.");
      return;
    }
    if (!comment.trim()) {
      setError("Please write a comment.");
      toast.error("Comment is required.");
      return;
    }
    if (comment.trim().length > 5000) {
      setError("Comment cannot exceed 5000 characters.");
      toast.error("Comment Too Long", { description: "Max 5000 characters." });
      return;
    }
    if (title.trim().length > 255) {
      setError("Title cannot exceed 255 characters.");
      toast.error("Title Too Long", { description: "Max 255 characters." });
      return;
    }

    setIsLoading(true);
    setError(null);

    const reviewPayload = {
      productId: productId,
      productSlug: productSlug,
      orderId: orderId,
      rating: rating,
      title: title.trim() || null,
      comment: comment.trim(),
      existingReviewId: existingReview ? existingReview.review_id : null,
    };

    try {
      const { data: functionResponse, error: functionError } = await supabase.functions.invoke(
        'submit-review',
        { body: reviewPayload }
      );

      if (functionError) {
        let errorMessage = functionError.message || "Failed to submit review via function.";
        if (functionError instanceof FunctionsHttpError) {
          const errorBody = await functionError.context.json().catch(() => ({}));
          errorMessage = errorBody.error || errorMessage;
        }
        throw new Error(errorMessage);
      }

      if (functionResponse && functionResponse.success && functionResponse.review) {
        const toastMessage = existingReview?.review_id
          ? "Review updated! It will be visible after verification."
          : "Review submitted! It will be visible after verification.";
        toast.success(toastMessage);

        queryClient.invalidateQueries({ queryKey: ['productReviews', productId] });
        queryClient.invalidateQueries({ queryKey: ['userReview', user.id, productId, orderId] });
        
        // Invalidate by slug if available, otherwise use productId as a fallback
        const fetchedProductSlug = (functionResponse.review as any)?.product_slug || productSlug || productId;
        queryClient.invalidateQueries({ queryKey: ['productDetailsBySlug', fetchedProductSlug] });
        queryClient.invalidateQueries({ queryKey: ['productDetails', productId] });

        if (onReviewSubmitted) {
          onReviewSubmitted();
        }
        onOpenChange(false);
      } else {
        throw new Error(functionResponse?.error || "Review submission failed with an unexpected server response.");
      }
    } catch (err: any) {
      console.error("Error submitting review:", err);
      const displayError = err.message || "Failed to submit review. Please try again.";
      setError(displayError);
      toast.error("Submission Failed", { description: displayError });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!isLoading) onOpenChange(open); }}>
      <DialogContent className="sm:max-w-lg bg-[#1a1c23] border-[#2a2d36] text-white">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {existingReview ? 'Edit Your Review' : 'Write a Review'}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Share your thoughts about {productName}.
          </DialogDescription>
        </DialogHeader>
        <WriteReviewForm
          productName={productName}
          rating={rating}
          setRating={setRating}
          title={title}
          setTitle={setTitle}
          comment={comment}
          setComment={setComment}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
          error={error}
          onCancel={() => onOpenChange(false)}
          submitButtonText={existingReview ? 'Update Review' : 'Submit Review'}
          showCancelButton={true} // Modal has a cancel button
        />
      </DialogContent>
    </Dialog>
  );
};
export default WriteReviewModal;