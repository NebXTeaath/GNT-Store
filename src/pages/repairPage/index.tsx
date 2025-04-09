// src/pages/repairPage/index.tsx
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { PlusCircle, History } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import RepairProcessVisual from "./repairProcessVisual";
// Import the *redesigned* service availability check component
import CheckServiceAvailability from "./CheckServiceAvailability"; // Make sure this path is correct

export default function RepairServices() {

// ----- Scroll to Top on Mount -----
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);


  useEffect(() => {
    document.title = "[GNT] Repair Services";
  }, []);

  return (
    <div className="min-h-screen bg-[#0f1115] text-white">
      <main className="container mx-auto px-4 py-8">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-8">
           {/* Left side: Title and Description */}
           <div className="mb-4 md:mb-0">
             <h1 className="text-3xl font-bold mb-2">Repair Services</h1>
             <p className="text-gray-400">
               Expert repair services for your gaming consoles, PCs, and laptops.
             </p>
           </div>

           {/* Right side: Service Availability Check Trigger */}
           {/* The CheckServiceAvailability component now renders the DialogTrigger button here */}
           <div className="mt-4 md:mt-0 md:ml-4 flex-shrink-0">
             <CheckServiceAvailability />
           </div>
        </div>

        {/* Visual Representation of the Repair Process */}
        <RepairProcessVisual />

        {/* Navigation Links/Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            {/* ... Navigation Links remain the same ... */}
           <Link to="/repair/new-request" className="block">
              <Button variant="outline" className="w-full h-24 text-lg bg-[#1a1b1e] border-gray-700 hover:bg-[#2f3555] hover:text-white text-gray-200 flex items-center justify-center space-x-2">
                 <PlusCircle size={24} />
                 <span>Create New Repair Request</span>
              </Button>
           </Link>
           <Link to="/repair/history" className="block">
              <Button variant="outline" className="w-full h-24 text-lg bg-[#1a1b1e] border-gray-700 hover:bg-[#2f3555] hover:text-white text-gray-200 flex items-center justify-center space-x-2">
                 <History size={24} />
                 <span>View Repair History</span>
              </Button>
           </Link>
        </div>

        <Toaster position="top-center" />
      </main>
    </div>
  );
}