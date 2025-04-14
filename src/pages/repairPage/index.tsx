// src/pages/repairPage/index.tsx
import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom"; // Import useLocation
import { Helmet } from 'react-helmet-async'; // Import Helmet
import { PlusCircle, History } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import RepairProcessVisual from "./repairProcessVisual";
import CheckServiceAvailability from "./CheckServiceAvailability";

export default function RepairServices() {
  const location = useLocation(); // For canonical URL
  const siteUrl = window.location.origin; // Get base URL

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, []);
  // Removed title setting useEffect

  // SEO Data
  const pageTitle = "Repair Services | GNT Store";
  const pageDescription = "Get expert repair services for your gaming consoles, PCs, and laptops at GNT Store. Check service availability and submit a request.";
  const canonicalUrl = `${siteUrl}${location.pathname}`;

  return (
    <div className="min-h-screen bg-[#0f1115] text-white">
       <Helmet>
          <title>{pageTitle}</title>
          <meta name="description" content={pageDescription} />
          <link rel="canonical" href={canonicalUrl} />
          <meta property="og:title" content={pageTitle} />
          <meta property="og:description" content={pageDescription} />
          <meta property="og:url" content={canonicalUrl} />
          <meta property="og:type" content="website" />
          <meta property="og:image" content={`${siteUrl}/favicon/og-image.png`} />
          <meta name="twitter:card" content="summary" />
          <meta name="twitter:title" content={pageTitle} />
          <meta name="twitter:description" content={pageDescription} />
          <meta name="twitter:image" content={`${siteUrl}/favicon/og-image.png`} />
      </Helmet>
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-8">
           <div className="mb-4 md:mb-0"> <h1 className="text-3xl font-bold mb-2">Repair Services</h1> <p className="text-gray-400"> Expert repair services for your gaming consoles, PCs, and laptops. </p> </div>
           <div className="mt-4 md:mt-0 md:ml-4 flex-shrink-0"> <CheckServiceAvailability /> </div>
        </div>
        <RepairProcessVisual />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
           <Link to="/repair/new-request" className="block"> <Button variant="outline" className="w-full h-24 text-lg bg-[#1a1b1e] border-gray-700 hover:bg-[#2f3555] hover:text-white text-gray-200 flex items-center justify-center space-x-2"> <PlusCircle size={24} /> <span>Create New Repair Request</span> </Button> </Link>
           <Link to="/repair/history" className="block"> <Button variant="outline" className="w-full h-24 text-lg bg-[#1a1b1e] border-gray-700 hover:bg-[#2f3555] hover:text-white text-gray-200 flex items-center justify-center space-x-2"> <History size={24} /> <span>View Repair History</span> </Button> </Link>
        </div>
        <Toaster position="top-center" />
      </main>
    </div>
  );
}