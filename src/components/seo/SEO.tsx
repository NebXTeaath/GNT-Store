// src/components/seo/SEO.tsx
import React from 'react';
import { Helmet } from 'react-helmet-async';

interface OgData {
  title?: string;
  description?: string;
  image?: string;
  type?: string;
  url?: string;
}

interface SEOProps {
  title: string;
  description: string;
  canonicalUrl?: string;
  ogData?: OgData;
  noIndex?: boolean; // Added prop to control indexing
}

const SEO: React.FC<SEOProps> = ({
  title,
  description,
  canonicalUrl,
  ogData,
  noIndex = false, // Default to allowing indexing
}) => {
  const siteUrl = window.location.origin;
  const defaultOgImage = `${siteUrl}/favicon/og-image.png`; // Ensure you have this image

  // Use specific OG data if provided, otherwise fallback to main title/description
  const effectiveOgTitle = ogData?.title || title;
  const effectiveOgDescription = ogData?.description || description;
  const effectiveOgImage = ogData?.image || defaultOgImage;
  const effectiveOgType = ogData?.type || 'website';
  // Use canonical URL for OG URL if available, otherwise use current URL (less ideal but fallback)
  const effectiveOgUrl = ogData?.url || canonicalUrl || window.location.href;

  return (
    <Helmet>
      {/* --- Primary Meta Tags --- */}
      <title>{title}</title>
      <meta name="description" content={description} />

      {/* --- Canonical URL --- */}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* --- Robots Meta Tag --- */}
      {noIndex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" /> // Default behavior
      )}


      {/* --- Open Graph / Facebook --- */}
      <meta property="og:title" content={effectiveOgTitle} />
      <meta property="og:description" content={effectiveOgDescription} />
      <meta property="og:type" content={effectiveOgType} />
      <meta property="og:image" content={effectiveOgImage} />
      <meta property="og:url" content={effectiveOgUrl} />
      {/* Optional: Add og:site_name if needed */}
      <meta property="og:site_name" content="GNT Store" />

      {/* --- Twitter --- */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={effectiveOgTitle} />
      <meta name="twitter:description" content={effectiveOgDescription} />
      <meta name="twitter:image" content={effectiveOgImage} />
      {/* Optional: Add twitter:site or twitter:creator if needed */}
    </Helmet>
  );
};

export default SEO;