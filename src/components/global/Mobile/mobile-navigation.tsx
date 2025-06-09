// src/components/global/Mobile/mobile-navigation.tsx
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Wrench, Search, ShoppingCart, Store, MenuSquare } from "lucide-react"; // Added MenuSquare for catalog
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useLoading } from "@/components/global/Loading/LoadingContext";
import { SearchDrawer } from "@/components/global/Mobile/search-drawer";
// import { ShopDrawer } from "@/components/global/Mobile/shop-drawer"; // Remove ShopDrawer import
import LoginModal from "@/components/pages/Login/LoginModal";
import { MobileAccountSheet } from "@/components/global/Mobile/mobile-account-sheet";
import { ShopCatalogDrawer } from "@/components/global/Mobile/shop-drawer"; // New import

interface NavItemProps {
  href?: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick?: (e?: React.MouseEvent) => void;
  badge?: React.ReactNode;
}

function NavItem({ href, icon, label, isActive, onClick, badge }: NavItemProps) {
  if (href) {
    return (
      <Link
        to={href}
        onClick={onClick}
        className={`flex flex-col items-center justify-center text-xs ${
          isActive ? "text-white" : "text-gray-400"
        } hover:text-white transition-colors relative px-4 py-3`}
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
      } hover:text-white transition-colors relative px-4 py-3`}
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [shopCatalogOpen, setShopCatalogOpen] = useState(false); // Changed state variable
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const [loginOpen, setLoginOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const { cartCount } = useCart();
  
  const { setIsLoading, setLoadingMessage } = useLoading();

  const formattedCartCount = cartCount > 9 ? "9+" : cartCount.toString();
  
  const cartBadge = isAuthenticated && cartCount > 0 ? (
    <span className="absolute -top-1 -right-1 flex items-center justify-center bg-[#5865f2] text-white text-xs font-bold rounded-full h-4 w-4 min-w-4">
      {formattedCartCount}
    </span>
  ) : null;

  const handleNavigationWithLoading = (path: string, message: string) => {
    if (pathname === path) return;
    setLoadingMessage(message);
    setIsLoading(true);
    setTimeout(() => {
      navigate(path);
      setIsLoading(false); // isLoading will be set to false by LoadingRouteListener
    }, 300); // Reduced timeout, listener will handle it
  };

  const handleHomeClick = () => handleNavigationWithLoading("/", "Loading Home...");
  const handleRepairClick = () => handleNavigationWithLoading("/repair-home/", "Loading Repair Services...");
  const handleCartClick = () => handleNavigationWithLoading("/checkout/cart-details", "Loading Cart...");
  const handleCatalogClick = () => { // This now opens the drawer
    setLoadingMessage("Loading Shop Catalog...");
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setShopCatalogOpen(true); // Open the new drawer
    }, 300);
  };


  const handleSearchClick = () => { // Keep search as a drawer for now
    setLoadingMessage("Preparing Search...");
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setSearchOpen(true);
    }, 300);
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-[#1a1c23] border-t border-[#2a2d36] md:hidden z-50">
        <div className="flex justify-around items-center h-16">
          <div className="flex-1 h-full flex items-center justify-center">
            <NavItem
              icon={<Home size={22} />}
              label="Home"
              isActive={pathname === "/"}
              onClick={handleHomeClick}
            />
          </div>
          
          {/* MODIFIED: Shop NavItem now links to /shop-catalog */}
          <div className="flex-1 h-full flex items-center justify-center">
            <NavItem
            icon={<MenuSquare size={22} />}
            label="Catalog"
            isActive={shopCatalogOpen} // Optional: make active when drawer is open
            onClick={handleCatalogClick} 
          />
          </div>
          
          <div className="flex-1 h-full flex items-center justify-center">
            <NavItem
              icon={<Search size={22} />}
              label="Search"
              isActive={false} // Search drawer doesn't make a route active
              onClick={handleSearchClick}
            />
          </div>
          
          <div className="flex-1 h-full flex items-center justify-center">
            <NavItem
              icon={<Wrench size={22} />}
              label="Repair"
              isActive={pathname.startsWith("/repair")} // More robust active check
              onClick={handleRepairClick}
            />
          </div>
          
          <div className="flex-1 h-full flex items-center justify-center">
            <NavItem
              icon={<ShoppingCart size={22} />}
              label="Cart"
              isActive={pathname.startsWith("/checkout")} // More robust active check
              onClick={handleCartClick}
              badge={cartBadge}
            />
          </div>
        </div>
      </nav>

      <SearchDrawer open={searchOpen} onOpenChange={setSearchOpen} />
      <ShopCatalogDrawer open={shopCatalogOpen} onOpenChange={setShopCatalogOpen} /> {/* Use new drawer */}
      <LoginModal open={loginOpen} onOpenChange={setLoginOpen} onLoginSuccess={() => setLoginOpen(false)} />
      {isAuthenticated && (
        <MobileAccountSheet open={accountOpen} onOpenChange={setAccountOpen} />
      )}
    </>
  );
}