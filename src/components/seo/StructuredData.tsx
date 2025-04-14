// src/components/seo/StructuredData.tsx
import React from 'react';
import { Helmet } from 'react-helmet-async';
import type { ProductDetailsData } from '@/pages/ProductDetails/useProductDetails'; // Adjust path if necessary

interface StructuredDataProps {
  productData: ProductDetailsData | null;
}

const StructuredData: React.FC<StructuredDataProps> = ({ productData }) => {
  if (!productData) {
    return null; // Don't render anything if no product data
  }

  const siteUrl = window.location.origin;

  // Helper to safely get the first image URL or a default
  const getPrimaryImageUrl = (): string | undefined => {
    const firstImageSet = productData.o_images?.[0];
    const firstImage = firstImageSet?.[0]?.url;
    return firstImage && !firstImage.includes('placeholder') ? firstImage : undefined;
  };

  // Helper to build category string
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
    "image": getPrimaryImageUrl(), // Primary image URL
    "category": buildCategoryString(),
    "brand": {
      "@type": "Brand",
      "name": "GNT Store" // Replace when brand info is available in productData
    },
    "offers": {
      "@type": "Offer",
      "url": `${siteUrl}/product/${productData.o_slug}`, // Canonical product URL
      "priceCurrency": "INR",
      "price": productData.o_discount_price, // Use the current selling price
      "priceValidUntil": new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(), // Example: Valid for 1 year
      "itemCondition": productData.o_condition?.toLowerCase() === 'pre-owned' ? 'https://schema.org/UsedCondition' : 'https://schema.org/NewCondition',
      "availability": "https://schema.org/InStock", // Adjust if you have stock levels
      // Consider adding seller information if relevant
      // "seller": {
      //   "@type": "Organization",
      //   "name": "GNT Store"
      // }
    },
    // Add aggregateRating and reviews if available
    // "aggregateRating": {
    //   "@type": "AggregateRating",
    //   "ratingValue": "4.5", // Example data
    //   "reviewCount": "89" // Example data
    // },
    // "review": [
    //   {
    //     "@type": "Review",
    //     "reviewRating": { "@type": "Rating", "ratingValue": "5" },
    //     "author": { "@type": "Person", "name": "Reviewer Name" },
    //     "reviewBody": "Excellent product!"
    //   }
    // ]
  };

   // Only include image property if a valid URL was found
   if (!schema.image) {
      delete schema.image;
   }

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
};

export default StructuredData;