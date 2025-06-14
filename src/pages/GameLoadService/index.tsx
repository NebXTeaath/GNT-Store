// src/pages/GameLoadService/index.tsx
import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import SEO from '@/components/seo/SEO';
import { Button } from "@/components/ui/button";
import { PlusCircle, History } from "lucide-react";
import GameLoadProcessVisual from "@/pages/GameLoadService/GameLoadProcessVisual.tsx";
import GameLoadTestimonials from "@/components/global/Testimonials/GameLoadTestimonials"; // Re-using testimonials, can be swapped later

export default function GameLoadServiceIndex() {
  const location = useLocation();
  const siteUrl = window.location.origin;

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, []);

  const pageTitle = "PS4 & PS5 Game Loading Service | GNT Store";
  const pageDescription = "Expand your game library effortlessly. Submit a request to have your favorite games loaded onto your PS4 or PS5 console by our experts.";
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
               <h1 className="text-3xl font-bold mb-2">Game Loading Service</h1>
               <p className="text-gray-400"> Get your favorite games loaded onto your console, hassle-free. </p>
           </div>
        </div>
        
        <GameLoadProcessVisual />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
           <Link to="/game-load-service/new" className="block">
             <Button variant="outline" className="w-full h-24 text-lg bg-[#1a1b1e] border-gray-700 hover:bg-[#2f3555] hover:text-white text-gray-200 flex items-center justify-center space-x-2">
               <PlusCircle size={24} />
               <span>Create New Request</span>
             </Button>
           </Link>

           <Link to="/game-load/history" className="block">
                <Button variant="outline" className="w-full h-24 text-lg bg-[#1a1b1e] border-gray-700 hover:bg-[#2f3555] hover:text-white text-gray-200 flex items-center justify-center space-x-2">
                    <History size={24} />
                    <span>View Request History</span>
                </Button>
            </Link>
        </div>
        
        {/* --- REPLACE THE TESTIMONIAL COMPONENT --- */}
        <GameLoadTestimonials />
        
      </main>
    </div>
  );
}