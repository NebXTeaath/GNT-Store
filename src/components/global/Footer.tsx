// src/components/global/Footer.tsx
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUp } from 'lucide-react';
import Logo from '@/assets/logo.svg';
import { CopyableEmail } from '@/pages/support/CopyableEmail'; // <-- IMPORT NEW COMPONENT

const supportEmail = "support@gnt-store.shop";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const navigate = useNavigate();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="w-full bg-[#1a1c23] border-t border-[#2a2d36] text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center text-center md:text-left gap-8">

          {/* Left Side: Logo and Description */}
          <div className="space-y-4">
            <Link to="/" className="inline-block mx-auto md:mx-0">
              <img src={Logo || "/placeholder.svg"} alt="GNT Logo" className="h-10" />
            </Link>
            <p className="text-gray-400 text-sm max-w-xs mx-auto md:mx-0">
              Your direct source for discounted PC parts and gaming laptops.
            </p>
          </div>

          {/* Middle: Quick Links */}
          <div className="flex flex-col items-center md:items-start">
              <h3 className="font-semibold text-white mb-2">Quick Links</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-left">
                <div className="flex flex-col gap-3">
                  <Link to="/" className="text-sm text-gray-300 hover:text-white">Home</Link>
                  <Link to="/product-discount-request/new" className="text-sm text-gray-300 hover:text-white">Make a Discount Request</Link>
                  <Link to="/repair-home" className="text-sm text-gray-300 hover:text-white">Repair Services</Link>
                  <Link to="/game-load-service" className="text-sm text-gray-300 hover:text-white">Game Load Service</Link>
                  <Link to="/wishlist" className="text-sm text-gray-300 hover:text-white">Wishlist</Link>
                  <Link to="/order-history" className="text-sm text-gray-300 hover:text-white">Order History</Link>
                </div>
                <div className="flex flex-col gap-3">
                  <Link to="/cart" className="text-sm text-gray-300 hover:text-white">Cart</Link>
                  <Link to="/profile" className="text-sm text-gray-300 hover:text-white">Profile</Link>
                  <Link to="/repair-history" className="text-sm text-gray-300 hover:text-white">Repair History</Link>
                  <Link to="/product-discount-request/history" className="text-sm text-gray-300 hover:text-white">Discount Request History</Link>
                  <Link to="/game-load-history" className="text-sm text-gray-300 hover:text-white">Game Load History</Link>
                  <Link to="/support" className="text-sm text-gray-300 hover:text-white">Support Page</Link>
                </div>
              </div>
          </div>
          
          {/* Right Side: Contact and Copyright */}
          <div className="flex flex-col items-center md:items-end gap-4">
             {/* --- MODIFIED SECTION --- */}
            <div>
              <h3 className="font-semibold text-white mb-2 text-center md:text-right">Contact Us</h3>
              <CopyableEmail email={supportEmail} />
            </div>
             {/* --- END MODIFIED SECTION --- */}
            <p className="text-gray-400 text-sm mt-2">
              © {currentYear} GNT - Games & Tech. All rights reserved.
            </p>
            <button
              onClick={scrollToTop}
              className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white bg-[#2a2d36] hover:bg-[#3a3d46] px-3 py-1.5 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-[#5865f2] focus:ring-offset-2 focus:ring-offset-[#1a1c23]"
              aria-label="Scroll back to top"
            >
              <ArrowUp className="h-4 w-4" />
              <span>Back to Top</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;