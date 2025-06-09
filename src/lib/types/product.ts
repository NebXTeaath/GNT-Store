// src/lib/types/product.ts

/**
 * Defines the structure for the technical_specification object.
 * Using a generic key-value pair structure makes it scalable,
 * allowing any spec to be added to the JSON without frontend code changes.
 */
interface TechnicalSpecification {
  [key: string]: string | number | boolean;
}

export interface Product {
  product_id: string;
  slug: string;
  product_name: string;
  product_description: string;
  price: number;
  discount_price: number;
  primary_image: string;
  category: string;
  subcategory: string;
  label: string;
  condition?: string;
  stock_units?: number;
  is_featured?: boolean;
  is_bestseller?: boolean;
  is_active?: boolean;
  average_rating?: number;
  review_count?: number;
  relevance_score?: number;
  // The technical_specification field now uses the flexible interface.
  // It is optional because only 'Computers' will have it.
  technical_specification?: TechnicalSpecification | null;
}

// Make sure the search result type also has the new field
export interface ProductSearchResult extends Product {}