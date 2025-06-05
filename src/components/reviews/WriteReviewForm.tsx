// src/components/reviews/WriteReviewForm.tsx
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WriteReviewFormProps {
    productName: string;
    rating: number;
    setRating: (rating: number) => void;
    title: string;
    setTitle: (title: string) => void;
    comment: string;
    setComment: (comment: string) => void;
    handleSubmit: (e: React.FormEvent) => Promise<void>;
    isLoading: boolean;
    error: string | null;
    onCancel?: () => void;
    submitButtonText?: string;
    cancelButtonText?: string;
    showCancelButton?: boolean; // Added this prop
}

const WriteReviewForm: React.FC<WriteReviewFormProps> = ({
    productName,
    rating,
    setRating,
    title,
    setTitle,
    comment,
    setComment,
    handleSubmit,
    isLoading,
    error,
    onCancel,
    submitButtonText = "Submit Review",
    cancelButtonText = "Cancel",
    showCancelButton = true, // Default to true
}) => {
    const [hoverRating, setHoverRating] = useState(0);

    return (
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div>
                <Label htmlFor="rating" className="text-gray-300 mb-1 block">
                    Your Rating for {productName} <span className="text-red-400">*</span>
                </Label>
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
                            aria-label={`Rate ${star} out of 5 stars`}
                        />
                    ))}
                </div>
            </div>

            <div>
                <Label htmlFor="title" className="text-gray-300">Title (Optional)</Label>
                <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Summarize your experience"
                    className="bg-[#2a2d36] border-[#3f4354] text-white"
                    maxLength={255}
                    disabled={isLoading}
                />
            </div>

            <div>
                <Label htmlFor="comment" className="text-gray-300">
                    Your Review <span className="text-red-400">*</span>
                </Label>
                <Textarea
                    id="comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="What did you like or dislike? Share your experience..."
                    className="bg-[#2a2d36] border-[#3f4354] text-white min-h-[100px]"
                    rows={4}
                    maxLength={5000}
                    required
                    disabled={isLoading}
                />
                <p className="text-xs text-gray-500 mt-1 text-right">{comment.length}/5000</p>
            </div>

            {error && (
                <p className="text-sm text-red-400 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" />{error}
                </p>
            )}

            <div className={cn("flex gap-2 pt-2", onCancel && showCancelButton ? "justify-end" : "justify-center")}>
                {onCancel && showCancelButton && (
                    <Button type="button" variant="outline" onClick={onCancel} className="bg-[#2a2d36] hover:bg-[#3f4354] border-[#3f4354] text-white" disabled={isLoading}>
                        {cancelButtonText}
                    </Button>
                )}
                <Button type="submit" className="bg-[#5865f2] hover:bg-[#4752c4]" disabled={isLoading}>
                    {isLoading ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
                    ) : (
                        submitButtonText
                    )}
                </Button>
            </div>
        </form>
    );
};

export default WriteReviewForm;