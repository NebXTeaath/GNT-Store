// src/lib/types/review.ts
    export interface ProductReview {
        review_id: string;
        user_id: string;
        user_name?: string;
        product_id: string;
        product_slug?: string | null;
        order_id?: string | null;
        rating: number;
        title?: string | null;
        comment: string;
        is_verified: boolean;
        created_at: string;
        updated_at: string;
    }

    export interface ReviewAggregate {
        average_rating: number;
        review_count: number;
    }