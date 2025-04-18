// src/components/seo/StructuredData.tsx
import React from 'react';
import { Helmet } from 'react-helmet-async';
// Ensure the type import reflects the CORRECTED single array structure
import type { ProductDetailsData } from '@/pages/ProductDetails/useProductDetails';

interface StructuredDataProps {
  productData: ProductDetailsData | null;
}

const StructuredData: React.FC<StructuredDataProps> = ({ productData }) => {
  if (!productData) {
    return null;
  }

  const siteUrl = window.location.origin;

  // Helper to safely get the first image URL or a default
  const getPrimaryImageUrl = (): string | undefined => {
    // FIX: Access the first element's URL directly from the o_images array
    const firstImage = productData.o_images?.[0]?.url; // Get URL of the first image object
    // Return the URL only if it's valid and not a placeholder
    return firstImage && !firstImage.includes('placeholder') ? firstImage : undefined;
  };

  // Helper to build category string (remains the same)
  const buildCategoryString = (): string => {
      const parts = [
          "Electronics", // Top level category
          productData.o_category_name,
          productData.o_subcategory_name,
          productData.o_label
      ].filter(Boolean); // Filter out empty/null values
      return parts.join(' > ');
  };

  const schema = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": productData.o_product_name,
    "description": productData.o_product_description,
    "sku": productData.o_product_id, // Using product_id as SKU
    "image": getPrimaryImageUrl(), // Correctly gets the first image URL now
    "category": buildCategoryString(),
    "brand": {
      "@type": "Brand",
      "name": "GNT Store" // Replace when brand info is available in productData
    },
    "offers": {
      "@type": "Offer",
      "url": `${siteUrl}/product/${productData.o_slug}`, // Canonical product URL
      "priceCurrency": "INR",
       // Convert string price to number for schema
      "price": parseFloat(productData.o_discount_price).toFixed(2),
      "priceValidUntil": new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(), // Example: Valid for 1 year
      "itemCondition": productData.o_condition?.toLowerCase() === 'pre-owned' ? 'https://schema.org/UsedCondition' : 'https://schema.org/NewCondition',
       // Make sure stock reflects reality, or use LimitedAvailability/OutOfStock etc.
      "availability": productData.o_stock_units && productData.o_stock_units > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "seller": { // Good practice to include seller
        "@type": "Organization",
        "name": "GNT Store"
      }
    },
    // Add aggregateRating and reviews if available from productData
    // Example:
    // "aggregateRating": productData.o_review_count > 0 ? {
    //   "@type": "AggregateRating",
    //   "ratingValue": productData.o_average_rating?.toString() ?? "0",
    //   "reviewCount": productData.o_review_count?.toString() ?? "0"
    // } : undefined,
  };

   // Only include image property if a valid URL was found
   if (!schema.image) {
      delete schema.image;
   }
   // Remove aggregateRating if not applicable
   // if (!schema.aggregateRating) {
   //    delete schema.aggregateRating;
   // }


  return (
    <Helmet>
      <script type="application/ld+json">
        {/* Use null, 2 for pretty printing during development if needed */}
        {/* JSON.stringify(schema, null, 2) */}
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
};

export default StructuredData;