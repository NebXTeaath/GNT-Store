// src/components/reviews/WriteReviewModal.tsx
    import React, { useState, useEffect } from 'react';
    import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
    import { Button } from "@/components/ui/button";
    import { Label } from "@/components/ui/label";
    import { Input } from "@/components/ui/input";
    import { Textarea } from "@/components/ui/textarea";
    import { Star, Loader2, AlertCircle } from 'lucide-react';
    import { supabase } from '@/lib/supabase';
    import { useAuth } from '@/context/AuthContext';
    import { toast } from 'sonner';
    import { ProductReview } from '@/lib/types/review';
    import { useQueryClient } from '@tanstack/react-query';
    import { FunctionsHttpError } from '@supabase/supabase-js';
import { cn } from '@/lib/utils';


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
      const [rating, setRating] = useState(existingReview?.rating || 0);
      const [hoverRating, setHoverRating] = useState(0);
      const [title, setTitle] = useState(existingReview?.title || '');
      const [comment, setComment] = useState(existingReview?.comment || '');
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
          existingReviewId: existingReview ? 
          existingReview.review_id : null,
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
            
            // Attempt to get slug for more specific invalidation, otherwise broader
            const productSlug = (functionResponse.review as any)?.slug || productId; // Fallback to productId if slug not directly in review
            queryClient.invalidateQueries({ queryKey: ['productDetailsBySlug', productSlug] });
            queryClient.invalidateQueries({ queryKey: ['productDetails', productId] }); // Invalidate by ID too


            if (onReviewSubmitted) {
          onReviewSubmitted(); // Call the callback
        }
        onOpenChange(false); // Close the modal
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
            {existingReview ? 'Edit Your Review' : 'Write a Review'} for {productName}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Share your thoughts about this product.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Rating Stars */}
          <div>
            <Label htmlFor="rating" className="text-gray-300 mb-1 block">Rating <span className="text-red-400">*</span></Label>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    "h-7 w-7 cursor-pointer transition-colors",
                    (hoverRating || rating) >= star ? "text-yellow-400 fill-yellow-400" : "text-gray-600"
                  )}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                />
              ))}
            </div>
          </div>
           {/* Title Input */}
          <div>
            <Label htmlFor="title" className="text-gray-300">Title (Optional)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Summarize your experience"
              className="bg-[#2a2d36] border-[#3f4354]"
              maxLength={255}
              disabled={isLoading}
            />
          </div>
           {/* Comment Textarea */}
          <div>
            <Label htmlFor="comment" className="text-gray-300">Comment <span className="text-red-400">*</span></Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What did you like or dislike?"
              className="bg-[#2a2d36] border-[#3f4354] min-h-[100px]"
              rows={4}
              maxLength={5000}
              required
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1 text-right">{comment.length}/5000</p>
          </div>
            {/* Error Display */}
          {error && (
            <p className="text-sm text-red-400 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" />{error}
            </p>
          )}
           {/* Footer Buttons */}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="bg-[#2a2d36] hover:bg-[#3f4354] border-[#3f4354] text-white" disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" className="bg-[#5865f2] hover:bg-[#4752c4]" disabled={isLoading}>
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
              ) : (
                existingReview ? 'Update Review' : 'Submit Review'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
    export default WriteReviewModal;