// src/lib/types/ProductDiscountRequestTypes.ts
import { z } from 'zod';

// Zod schema for the new request form validation
export const productDiscountRequestSchema = z.object({
  product_type: z.enum(['PC Parts', 'Laptops', 'Computer Accessories'], {
    required_error: 'Please select a product type.',
  }),
  ecom_site: z.enum(['Amazon.in', 'Flipkart.in'], {
    required_error: 'Please select the E-commerce site.',
  }),
  product_url: z.string().url({ message: "Please enter a valid product URL." })
    .min(15, { message: "URL seems too short." }),
  current_price: z.coerce
    .number({ required_error: 'Current price is required.', invalid_type_error: 'Price must be a number.' })
    .positive({ message: "Price must be a positive number." })
    .min(100, { message: "Price must be at least Rs. 100." }),
});

export type ProductDiscountRequestFormData = z.infer<typeof productDiscountRequestSchema>;

// Interface for the data fetched from the database for the history page
export interface FetchedProductDiscountRequest {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  product_type: string;
  ecom_site: string;
  product_url: string;
  current_price: number;
  status: string;
  remarks: string | null;
  our_price: number | null;
  user_profile_snapshot: any;
}