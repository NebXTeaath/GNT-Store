// src/pages/ProductDiscountRequest/index.tsx
import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import SEO from '@/components/seo/SEO';
import { Button } from "@/components/ui/button";
import { PlusCircle, History } from "lucide-react";
import ProductDiscountProcessVisual from "@/pages/ProductDiscountRequest/ProductDiscountProcessVisual";
import { productDiscountTestimonials } from "@/components/global/Testimonials/testimonialData";
import TestimonialCarousel from "@/components/global/Testimonials/Components/TestimonialCarousel";

export default function ProductDiscountRequestIndex() {
  const location = useLocation();
  const siteUrl = window.location.origin;

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, []);

  const pageTitle = "Product Discount Request | GNT Store";
  const pageDescription = "Found a product cheaper elsewhere? Request a personalized discount from GNT Store and get the best deals on PC Parts, Laptops, and more.";
  const canonicalUrl = `${siteUrl}${location.pathname}`;

  return (
    <div className="min-h-screen bg-[#0f1115] text-white">
        <SEO
            title={pageTitle}
            description={pageDescription}
            canonicalUrl={canonicalUrl}
            ogData={{
                title: pageTitle,
                description: pageDescription,
                url: canonicalUrl,
                type: 'website',
                image: `${siteUrl}/favicon/og-image.png`
            }}
        />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-8">
           <div className="mb-4 md:mb-0">
               <h1 className="text-3xl font-bold mb-2">Product Discount Request</h1>
               <p className="text-gray-400"> Found a product on Amazon or Flipkart? Request a lower price from us. </p>
           </div>
        </div>

        <ProductDiscountProcessVisual />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
           <Link to="/product-discount-request/new" className="block">
             <Button variant="outline" className="w-full h-24 text-lg bg-[#1a1b1e] border-gray-700 hover:bg-[#2f3555] hover:text-white text-gray-200 flex items-center justify-center space-x-2">
               <PlusCircle size={24} />
               <span>Create New Request</span>
             </Button>
           </Link>

           <Link to="/product-discount-request/history" className="block">
                <Button variant="outline" className="w-full h-24 text-lg bg-[#1a1b1e] border-gray-700 hover:bg-[#2f3555] hover:text-white text-gray-200 flex items-center justify-center space-x-2">
                    <History size={24} />
                    <span>View Request History</span>
                </Button>
            </Link>
        </div>

        <div className="mt-12">
            <TestimonialCarousel
                testimonials={productDiscountTestimonials}
                title="What Our Customers Say"
                subtitle="Real experiences from shoppers who saved with us"
                autoplayDelay={5500}
            />
        </div>
      </main>
    </div>
  );
}