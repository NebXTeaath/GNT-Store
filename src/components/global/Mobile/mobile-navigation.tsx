// src\components\global\Mobile\mobile-navigation.tsx
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Wrench, Search, ShoppingCart, Store } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext"; // Import useCart
import { SearchDrawer } from "@/components/global/Mobile/search-drawer";
import { ShopDrawer } from "@/components/global/Mobile/shop-drawer";
import LoginModal from "@/pages/Login/LoginModal";
import { MobileAccountSheet } from "@/components/global/Mobile/mobile-account-sheet";

interface NavItemProps {
  href?: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick?: () => void;
  badge?: React.ReactNode; // Add badge prop to support cart count
}

function NavItem({ href, icon, label, isActive, onClick, badge }: NavItemProps) {
  if (href) {
    return (
      <Link
        to={href}
        onClick={onClick}
        className={`flex flex-col items-center justify-center text-xs ${
          isActive ? "text-white" : "text-gray-400"
        } hover:text-white transition-colors relative`} // Added relative positioning for badge
      >
        <div className="relative"> {/* Container for icon and badge */}
          {icon}
          {badge}
        </div>
        <span className="mt-1">{label}</span>
      </Link>
    );
  }
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center text-xs ${
        isActive ? "text-white" : "text-gray-400"
      } hover:text-white transition-colors relative`} // Added relative positioning for badge
    >
      <div className="relative"> {/* Container for icon and badge */}
        {icon}
        {badge}
      </div>
      <span className="mt-1">{label}</span>
    </button>
  );
}

export function MobileNavigation() {
  const location = useLocation();
  const pathname = location.pathname;
  const [searchOpen, setSearchOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const { cartCount } = useCart(); // Get cart count from context
  
  // Format cart count for display (convert to "9+" if > 9)
  const formattedCartCount = cartCount > 9 ? "9+" : cartCount.toString();

  // Create cart badge component (only shown for authenticated users with items in cart)
  const cartBadge = isAuthenticated && cartCount > 0 ? (
    <span className="absolute -top-1 -right-1 flex items-center justify-center bg-[#5865f2] text-white text-xs font-bold rounded-full h-4 w-4 min-w-4">
      {formattedCartCount}
    </span>
  ) : null;
  
  // For authenticated users, account button opens account sheet; otherwise, trigger login modal.

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-[#1a1c23] border-t border-[#2a2d36] md:hidden z-50">
        <div className="flex justify-around items-center h-16 px-2">
          {/* New Home button positioned to the left of Shop */}
          <NavItem 
            href="/" 
            icon={<Home size={20} />} 
            label="Home" 
            isActive={pathname === "/"} 
          />
          <NavItem 
            icon={<Store size={20} />} 
            label="Shop" 
            isActive={false}
            onClick={() => setShopOpen(true)}
          />
          <NavItem 
            icon={<Search size={20} />} 
            label="Search" 
            isActive={false}
            onClick={() => setSearchOpen(true)} 
          />
          <NavItem 
            href="/repair-home/" 
            icon={<Wrench size={20} />} 
            label="Repair" 
            isActive={pathname.includes("/repair")} 
          />
          <NavItem 
            href="/checkout/cart-details" 
            icon={<ShoppingCart size={20} />} 
            label="Cart" 
            isActive={pathname.includes("/checkout")}
            badge={cartBadge} // Add the cart badge
          />
          {/* Removed Login/Account button as it's now in the header */}
        </div>
      </nav>
      
      <SearchDrawer 
        open={searchOpen} 
        onOpenChange={setSearchOpen} 
      />
      
      <ShopDrawer
        open={shopOpen}
        onOpenChange={setShopOpen}
      />
      
      <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />
      
      {isAuthenticated && (
        <MobileAccountSheet
          open={accountOpen}
          onOpenChange={setAccountOpen}
        />
      )}
    </>
  );
}