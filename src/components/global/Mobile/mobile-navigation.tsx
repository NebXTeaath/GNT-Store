// src/components/global/Mobile/mobile-navigation.tsx
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Wrench, Search, ShoppingCart, Store } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useLoading } from "@/components/global/Loading/LoadingContext";
import { SearchDrawer } from "@/components/global/Mobile/search-drawer";
import { ShopDrawer } from "@/components/global/Mobile/shop-drawer";
import LoginModal from "@/pages/Login/LoginModal";
import { MobileAccountSheet } from "@/components/global/Mobile/mobile-account-sheet";

interface NavItemProps {
  href?: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick?: (e?: React.MouseEvent) => void; // Updated to make the event parameter optional
  badge?: React.ReactNode;
}

function NavItem({ href, icon, label, isActive, onClick, badge }: NavItemProps) {
  // Enhanced component with larger clickable area
  if (href) {
    return (
      <Link
        to={href}
        onClick={onClick}
        className={`flex flex-col items-center justify-center text-xs ${
          isActive ? "text-white" : "text-gray-400"
        } hover:text-white transition-colors relative px-4 py-3`} // Added padding for larger touch target
      >
        <div className="relative">
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
      } hover:text-white transition-colors relative px-4 py-3`} // Added padding for larger touch target
    >
      <div className="relative">
        {icon}
        {badge}
      </div>
      <span className="mt-1">{label}</span>
    </button>
  );
}

export function MobileNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const [searchOpen, setSearchOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const { cartCount } = useCart();
  
  // Import loading context to control loading states
  const { setIsLoading, setLoadingMessage } = useLoading();

  // Format cart count for display
  const formattedCartCount = cartCount > 9 ? "9+" : cartCount.toString();
  
  // Cart badge component
  const cartBadge = isAuthenticated && cartCount > 0 ? (
    <span className="absolute -top-1 -right-1 flex items-center justify-center bg-[#5865f2] text-white text-xs font-bold rounded-full h-4 w-4 min-w-4">
      {formattedCartCount}
    </span>
  ) : null;

  // Navigation handlers with loading states
  const handleHomeClick = (e?: React.MouseEvent) => {
    if (pathname === "/") return; // Don't trigger if already on home page
    
    if (e) e.preventDefault();
    setLoadingMessage("Loading Home...");
    setIsLoading(true);
    
    // Short timeout to ensure loading screen shows before navigation
    setTimeout(() => {
      navigate("/");
      setIsLoading(false);
    }, 500);
  };

  const handleRepairClick = (e?: React.MouseEvent) => {
    if (pathname.includes("/repair")) return; // Don't trigger if already on repair page
    
    if (e) e.preventDefault();
    setLoadingMessage("Loading Repair Services...");
    setIsLoading(true);
    
    setTimeout(() => {
      navigate("/repair-home/");
      setIsLoading(false);
    }, 500);
  };

  const handleCartClick = (e?: React.MouseEvent) => {
    if (pathname.includes("/checkout")) return; // Don't trigger if already on checkout page
    
    if (e) e.preventDefault();
    setLoadingMessage("Loading Cart...");
    setIsLoading(true);
    
    setTimeout(() => {
      navigate("/checkout/cart-details");
      setIsLoading(false);
    }, 500);
  };

  const handleShopClick = () => {
    setLoadingMessage("Loading Shop...");
    setIsLoading(true);
    
    setTimeout(() => {
      setIsLoading(false);
      setShopOpen(true);
    }, 500);
  };

  const handleSearchClick = () => {
    setLoadingMessage("Preparing Search...");
    setIsLoading(true);
    
    setTimeout(() => {
      setIsLoading(false);
      setSearchOpen(true);
    }, 500);
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-[#1a1c23] border-t border-[#2a2d36] md:hidden z-50">
        <div className="flex justify-around items-center h-16">
          {/* Each nav item container now has full height to expand clickable area */}
          <div className="flex-1 h-full flex items-center justify-center">
            <NavItem
              href="/"
              icon={<Home size={22} />}
              label="Home"
              isActive={pathname === "/"}
              onClick={handleHomeClick}
            />
          </div>
          
          <div className="flex-1 h-100 flex items-center justify-center">
            <NavItem
              icon={<Store size={22} />}
              label="Shop"
              isActive={false}
              onClick={handleShopClick}
            />
          </div>
          
          <div className="flex-1 h-full flex items-center justify-center">
            <NavItem
              icon={<Search size={22} />}
              label="Search"
              isActive={false}
              onClick={handleSearchClick}
            />
          </div>
          
          <div className="flex-1 h-full flex items-center justify-center">
            <NavItem
              href="/repair-home/"
              icon={<Wrench size={22} />}
              label="Repair"
              isActive={pathname.includes("/repair")}
              onClick={handleRepairClick}
            />
          </div>
          
          <div className="flex-1 h-full flex items-center justify-center">
            <NavItem
              href="/checkout/cart-details"
              icon={<ShoppingCart size={22} />}
              label="Cart"
              isActive={pathname.includes("/checkout")}
              onClick={handleCartClick}
              badge={cartBadge}
            />
          </div>
        </div>
      </nav>

      <SearchDrawer open={searchOpen} onOpenChange={setSearchOpen} />
      <ShopDrawer open={shopOpen} onOpenChange={setShopOpen} />
      <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />
      {isAuthenticated && (
        <MobileAccountSheet open={accountOpen} onOpenChange={setAccountOpen} />
      )}
    </>
  );
}