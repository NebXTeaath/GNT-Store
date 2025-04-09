// src/components/global/Footer.tsx
import React from 'react';
import { Link } from 'react-router-dom'; // Re-added for Logo link
import { ArrowUp } from 'lucide-react'; // Kept for Back to Top button
import Logo from '@/assets/logo.svg'; // Re-added Logo import

export function Footer() {
  const currentYear = new Date().getFullYear();

  // Function to smoothly scroll to the top of the page
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <footer className="w-full bg-[#1a1c23] border-t border-[#2a2d36] text-white">
      <div className="container mx-auto px-4 py-8"> {/* Adjusted padding */}
        {/* Flex container for layout */}
        <div className="flex flex-col md:flex-row justify-between items-center md:items-start text-center md:text-left gap-6 md:gap-8">

          {/* Left Side: Logo and Description */}
          <div className="space-y-4">
             {/* Logo linked to home, centered on mobile, left-aligned on larger screens */}
            <Link to="/" className="inline-block mx-auto md:mx-0">
               {/* Assuming w-10 h-10 is the desired size, removed scaling */}
              <img src={Logo || "/placeholder.svg"} alt="GNT Logo" className="w- h-10" />
            </Link>
             {/* Description text, centered/max-width on mobile, left-aligned on larger */}
            <p className="text-gray-400 text-sm max-w-xs mx-auto md:mx-0">
              Your one-stop shop for gaming consoles, computers, and tech repair services.
            </p>
          </div>

          {/* Right Side: Back to Top and Copyright */}
           {/* Aligns content to center (mobile) or end (right, desktop) */}
          <div className="flex flex-col items-center md:items-end gap-4">
            {/* Back to Top Button */}
            <button
              onClick={scrollToTop}
              className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white bg-[#2a2d36] hover:bg-[#3a3d46] px-3 py-1.5 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-[#5865f2] focus:ring-offset-2 focus:ring-offset-[#1a1c23]"
              aria-label="Scroll back to top"
            >
              <ArrowUp className="h-4 w-4" />
              <span>Back to Top</span>
            </button>

            {/* Copyright Notice - Placed below the button */}
            <p className="text-gray-400 text-sm">
              © {currentYear} GNT - Games & Tech. All rights reserved.
            </p>
          </div>

        </div>
      </div>
    </footer>
  );
}

export default Footer;