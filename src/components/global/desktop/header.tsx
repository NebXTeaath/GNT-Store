// src/components/global/desktop/header.tsx
import { Link, useNavigate } from "react-router-dom";
import {
  ShoppingBag,
  ChevronDown,
  Gamepad2,
  Cpu,
  Wrench,
  User,
  History,
  LogIn,
  Heart,
  MessageSquareDot,
  Menu,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/assets/logo.svg";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { SearchBar } from "@/components/global/desktop/search-bar";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useWindowSize } from "@/components/global/hooks/useWindowSize";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/components/global/Mobile/use-mobile";
import LoginModal from "@/pages/Login/LoginModal";
import { useLoading } from "@/context/LoadingContext";
import { ProfileIndex } from "@/pages/Profile/components/ProfileIndex";
import { OffersPopover } from "@/components/global/OffersPopover";

// Define the nested product categories structure
type ProductCategoriesStructure = {
  [category: string]: {
    [subcategory: string]: string[];
  };
};

export default function Header() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const { cartCount } = useCart();
  const [productCategories, setProductCategories] = useState<ProductCategoriesStructure | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginOpen, setLoginOpen] = useState(false);
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);
  const [catalogSheetOpen, setCatalogSheetOpen] = useState(false);
  const [ProfileIndexOpen, setProfileIndexOpen] = useState(false);
  const windowSize = useWindowSize();
  const { setIsLoadingProfile, setLoadingMessage } = useLoading();

  // --- State and Refs for Vertical Tab Animation ---
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeStyle, setActiveStyle] = useState({ top: "0px", height: "0px" });
  const tabRefs = useRef<(HTMLDivElement | null)[]>([]);

  const formattedCartCount = cartCount > 9 ? "9+" : cartCount.toString();

  // Fetch product categories from Supabase
  useEffect(() => {
    async function fetchCategories() {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_product_categories_structure");
      if (error) {
        console.error("Error fetching product categories structure:", error);
        toast.error("Failed to load categories");
      } else {
        setProductCategories(data as ProductCategoriesStructure);
      }
      setLoading(false);
    }
    fetchCategories();
  }, []);

  const handleLogout = async () => {
    try {
      setLoadingMessage("Logging out...");
      setIsLoadingProfile(true);
      await logout();
      setAccountSheetOpen(false);
      setTimeout(() => {
        window.location.href = '/';
        toast.success("Successfully logged out");
      }, 300);
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to log out");
      setIsLoadingProfile(false);
    } finally {
      setTimeout(() => setIsLoadingProfile(false), 500);
    }
  };

  const displayName = user?.name || user?.email || "";
  const truncateUserName = (name: string, maxLength: number = 12) => {
    if (name && name.length > maxLength) {
      return `${name.substring(0, maxLength)}...`;
    }
    return name;
  };

  const handleOpenProfile = () => {
    setAccountSheetOpen(false);
    setProfileIndexOpen(true);
  };

  // useEffect hooks for Vertical Tab Animation
  useEffect(() => {
    if (accountSheetOpen && tabRefs.current[activeIndex]) {
      const activeElement = tabRefs.current[activeIndex];
      if (activeElement) {
        const { offsetTop, offsetHeight } = activeElement;
        requestAnimationFrame(() => {
          setActiveStyle({
            top: `${offsetTop}px`,
            height: `${offsetHeight}px`,
          });
        });
      }
    }
  }, [activeIndex, accountSheetOpen]);

  useEffect(() => {
    if (accountSheetOpen) {
      const checkRefs = () => {
        const activeElement = tabRefs.current[activeIndex];
        if (activeElement) {
          const { offsetTop, offsetHeight } = activeElement;
          setActiveStyle({
            top: `${offsetTop}px`,
            height: `${offsetHeight}px`,
          });
        } else {
          requestAnimationFrame(checkRefs);
        }
      };
      requestAnimationFrame(checkRefs);
    }
  }, [accountSheetOpen, activeIndex]);

  // Define Sheet Tabs and Actions
  const sheetTabs = [
    { label: "Profile", action: handleOpenProfile, icon: User },
    { label: "Wishlist", action: () => { navigate('/wishlist'); setAccountSheetOpen(false); }, icon: Heart },
    { label: "Orders", action: () => { navigate('/order-history'); setAccountSheetOpen(false); }, icon: History },
    { label: "Repairs", action: () => { navigate('/repair/history'); setAccountSheetOpen(false); }, icon: Wrench },
  ];

  const getSearchBarSize = () => {
    if (!windowSize.width) return "medium";
    if (windowSize.width < 1280) {
      return "x-small";
    } else if (windowSize.width < 1300) {
      return "small";
    } else if (windowSize.width < 1500) {
      return "medium";
    } else {
      return "large";
    }
  };

  const getUsernameMaxLength = () => {
    if (!windowSize.width) return 12;
    if (windowSize.width < 1024) {
      return 8;
    } else if (windowSize.width < 1500) {
      return 10;
    } else {
      return 12;
    }
  };

  const shouldShowUsername = () => {
    return windowSize.width && windowSize.width >= 1200;
  };

  const searchBarSize = getSearchBarSize();
  const usernameMaxLength = getUsernameMaxLength();
  const showUsername = shouldShowUsername();

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0f1115]/95 backdrop-blur py-4 border-b border-[#2a2d36]">
      <div className="container mx-auto flex items-center justify-between px-4 md:px-6 lg:px-8 xl:px-11">
        {/* Left side for mobile - Offer and Support Icons */}
        <div className="md:hidden flex items-center justify-start w-1/4 gap-2">
          {/* Offer Button - Added for Mobile */}
         
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/support" className="text-sm font-medium text-gray-300 hover:text-white flex items-center gap-1" aria-label="Support">
                  <MessageSquareDot className="h-5 w-5" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Get Support</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <OffersPopover />
        </div>
        {/* Logo Section */}
        <div className="flex-1 flex justify-center md:justify-start md:flex-none md:mr-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={Logo || "/placeholder.svg"} alt="GNT Logo" className={`w-10 h-10 transform scale-300 ${isMobile ? 'origin-center' : 'origin-left'}`} />
            <span className="sr-only">GNT - Games & Tech</span>
          </Link>
        </div>
        {/* Desktop Navigation & Search */}
        <div className="hidden md:flex items-center gap-2 lg:gap-4 xl:gap-6 flex-1 justify-center">
          <Sheet open={catalogSheetOpen} onOpenChange={setCatalogSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1 bg-[#1a1c23] text-gray-300 hover:text-white border-[#2a2d36] hover:bg-[#2a2d36] hover:border-[#5865f2] transition-all duration-200 ease-in-out"
              >
                Shop <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-full sm:max-w-md bg-[#1a1c23] border-[#2a2d36] text-white overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="text-white">Shop Catalog</SheetTitle>
                <SheetDescription className="text-gray-400"> Browse our product categories </SheetDescription>
              </SheetHeader>
              <Separator className="my-4 bg-[#2a2d36]" />
              {loading ? (
                <div className="space-y-4 px-6 py-4">
                  <Skeleton className="h-12 w-full bg-[#2a2d36]" />
                  <Skeleton className="h-12 w-full bg-[#2a2d36]" />
                  <Skeleton className="h-12 w-full bg-[#2a2d36]" />
                </div>
              ) : (
                <div className="px-6 py-4">
                  {productCategories ? (
                    Object.entries(productCategories).map(([category, subcategories], index) => (
                      <div key={category} className="mb-6">
                        <Link
                          to={`/${category}`}
                          onClick={() => setCatalogSheetOpen(false)}
                          className="flex items-center gap-2 mb-3 text-lg font-semibold text-white hover:text-[#5865f2]"
                        >
                          {category === "Consoles" ? (
                            <Gamepad2 className="h-5 w-5" />
                          ) : category === "Computers" ? (
                            <Cpu className="h-5 w-5" />
                          ) : null}
                          {category}
                        </Link>
                        <div className="ml-6 space-y-3">
                          {Object.entries(subcategories).map(([subcategory, labels]) => (
                            <div key={subcategory} className="mb-3">
                              <Link
                                to={`/${category}/${subcategory}`}
                                onClick={() => setCatalogSheetOpen(false)}
                                className="block text-base font-medium text-gray-300 hover:text-[#5865f2]"
                              >
                                {subcategory}
                              </Link>
                              {labels.length > 0 && (
                                <div className="ml-4 mt-2 grid grid-cols-2 gap-2">
                                  {labels.map((label) => (
                                    <Link
                                      key={label}
                                      to={`/${category}/${subcategory}?label=${encodeURIComponent(label)}`}
                                      onClick={() => setCatalogSheetOpen(false)}
                                      className="text-sm text-gray-400 hover:text-[#5865f2]"
                                    >
                                      {label}
                                    </Link>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        {index < Object.entries(productCategories).length - 1 && <Separator className="my-4 bg-[#2a2d36]" />}
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-300">No categories available</div>
                  )}
                </div>
              )}
            </SheetContent>
          </Sheet>
          <SearchBar className="w-full" size={searchBarSize} />
          <Link
            to="/repair-home"
            className="flex items-center gap-1 bg-[#1a1c23] text-sm whitespace-nowrap text-gray-300 hover:text-white border border-[#2a2d36] hover:bg-[#2a2d36] hover:border-[#5865f2] transition-all duration-200 ease-in-out px-3 py-1 rounded-md"
          >
            {windowSize.width && windowSize.width < 960 ? "Repairs" : "Repair Services"}
          </Link>
        </div>
        {/* Right-side Links */}
        <div className="flex items-center gap-2 lg:gap-4 justify-end md:w-auto w-1/4">
          {/* Offer Button - Desktop Position (before Support) */}
          <div className="hidden md:block">
            <OffersPopover />
          </div>
          
          <div className="hidden md:block">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white hover:bg-[#4752c4]" onClick={() => navigate('/support')} data-href={'/support'}>
                    <MessageSquareDot className="h-4 w-4" />
                    <span className="sr-only">Support</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Get Support</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="hidden md:block relative">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white hover:bg-[#4752c4]" onClick={() => navigate('/checkout/cart-details')} data-href={'/checkout/cart-details'}>
                    <ShoppingBag className="h-4 w-4" />
                    <span className="sr-only">Cart</span>
                    {isAuthenticated && cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex items-center justify-center bg-[#5865f2] text-white text-xs font-bold rounded-full h-4 w-4 min-w-4">
                        {formattedCartCount}
                      </span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>View Cart {cartCount > 0 ? `(${cartCount} item${cartCount !== 1 ? 's' : ''})` : ''}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {isAuthenticated && user ? (
            <Sheet open={accountSheetOpen} onOpenChange={setAccountSheetOpen}>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SheetTrigger asChild>
                      {!isMobile && showUsername ? (
                        <Badge variant="outline" className="px-2 py-1 border-[#2a2d36] hover:border-[#5865f2] cursor-pointer bg-transparent">
                          <User className="h-4 w-4 text-white" />
                          <span className="ml-2 text-white max-w-24 overflow-hidden text-ellipsis whitespace-nowrap">
                            {truncateUserName(displayName, usernameMaxLength)}
                          </span>
                        </Badge>
                      ) : (
                        <Button variant="ghost" size="icon" className="text-gray-300 hover:bg-[#4752c4]">
                          <Menu className="h-5 w-5" />
                          <span className="sr-only">Account</span>
                        </Button>
                      )}
                    </SheetTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Account Menu</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <SheetContent side="right" className="bg-[#1a1c23] border-l border-[#2a2d36] text-white flex flex-col h-full p-0">
                <SheetHeader className="px-6 pt-6 pb-4 mb-2">
                  <SheetTitle className="text-white">
                    Welcome {truncateUserName(displayName, usernameMaxLength + 4)}
                  </SheetTitle>
                  <SheetDescription className="text-gray-400">
                    Manage your account and preferences
                  </SheetDescription>
                </SheetHeader>

                <div className="relative flex-grow px-4 py-2">
                  <div
                    className="absolute left-0 w-[3px] bg-white rounded-r-md transition-all duration-300 ease-out pointer-events-none"
                    style={activeStyle}
                  />
                  <div className="flex flex-col space-y-1">
                    {sheetTabs.map((tab, index) => {
                      const TabIcon = tab.icon;
                      return (
                        <div
                          key={tab.label}
                          ref={(el) => (tabRefs.current[index] = el)}
                          className={cn(
                            "flex items-center w-full px-4 py-3 cursor-pointer transition-all duration-200 rounded-md",
                            "hover:bg-[#ffffff1a]",
                            index === activeIndex ? "text-white bg-[#ffffff14]" : "text-gray-400 hover:text-gray-100"
                          )}
                          onClick={() => {
                            setActiveIndex(index);
                            tab.action();
                          }}
                        >
                          <TabIcon className="mr-3 h-4 w-4" />
                          <span className="text-sm font-medium whitespace-nowrap">
                            {tab.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-auto p-6 border-t border-[#2a2d36]">
                  <Button variant="destructive" className="w-full flex items-center justify-center gap-2" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" /> Logout
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size={isMobile ? "icon" : "sm"} className="text-gray-300 hover:text-white hover:bg-[#4752c4]" onClick={() => setLoginOpen(true)}>
                    <LogIn className="h-4 w-4" />
                    {!isMobile && <span className="ml-2 text-sm">Login</span>}
                    <span className="sr-only">Login</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Login or Sign Up</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
      {/* Modals */}
      <ProfileIndex open={ProfileIndexOpen} onOpenChange={setProfileIndexOpen} />
      <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />
    </header>
  );
}