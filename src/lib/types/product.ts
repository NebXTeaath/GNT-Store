//src/types/product.ts
export interface Product {
  product_id: string
  slug: string
  product_name: string
  product_description: string
  price: number
  discount_price: number 
  primary_image: string
  category: string
  subcategory: string
  label: string
  condition?: string
  stock_units?: number
  is_featured?: boolean
  is_bestseller?: boolean
  is_active?: boolean
  average_rating?: number
  review_count?: number
  relevance_score?: number
}

export interface ProductSearchResult {
  product_id: string
  slug: string
  product_name: string
  product_description: string
  price: number
  discount_price: number 
  primary_image: string
  category: string
  subcategory: string
  label: string
  condition?: string
  stock_units?: number
  is_featured?: boolean
  is_bestseller?: boolean
  is_active?: boolean
  average_rating?: number
  review_count?: number
  relevance_score?: number
}