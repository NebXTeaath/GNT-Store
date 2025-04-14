// src/components/global/desktop/header.tsx
import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag, ChevronDown, Gamepad2, Cpu, Wrench, User, History, LogIn, Heart, MessageSquareDot, Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/assets/logo.svg"; // Ensure path is correct
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext"; // Import useWishlist
import { SearchBar } from "@/components/global/desktop/search-bar";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useQuery } from '@tanstack/react-query'; // Import useQuery
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useWindowSize } from "@/components/global/hooks/useWindowSize";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/components/global/Mobile/use-mobile";
import LoginModal from "@/pages/Login/LoginModal";
import { useLoading } from "@/components/global/Loading/LoadingContext";
import { ProfileIndex } from "@/pages/Profile/components/ProfileIndex";
import { OffersPopover } from "@/components/global/OffersPopover";

// Define the nested product categories structure
type ProductCategoriesStructure = {
  [category: string]: {
    [subcategory: string]: string[];
  };
};

// --- Function to fetch categories (can be moved to a service/api file) ---
async function fetchCategoriesStructure(): Promise<ProductCategoriesStructure | null> {
  console.log("[Header] Fetching category structure...");
  const { data, error } = await supabase.rpc("get_product_categories_structure");
  if (error) {
    console.error("Error fetching product categories structure:", error);
    toast.error("Failed to load shop categories");
    return null;
  }
  return data as ProductCategoriesStructure;
}

export default function Header() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout, isLoadingAuth } = useAuth(); // Get loading state too
  const { cartCount, isLoading: isCartLoading } = useCart(); // Get loading state
  const { wishlistItems, isLoading: isWishlistLoading } = useWishlist(); // Get wishlist data and loading state
  const windowSize = useWindowSize();
  const { setIsLoading, setIsLoadingProfile, setIsLoadingProducts, setIsLoadingAuth: setGlobalIsLoadingAuth, setLoadingMessage } = useLoading();

  const [loginOpen, setLoginOpen] = useState(false);
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);
  const [catalogSheetOpen, setCatalogSheetOpen] = useState(false);
  const [ProfileIndexOpen, setProfileIndexOpen] = useState(false);

  // --- Fetch categories using useQuery ---
  const {
    data: productCategories,
    isLoading: categoriesLoading,
    // isError: categoriesError // Optionally handle error display
  } = useQuery<ProductCategoriesStructure | null, Error>({
    queryKey: ['productCategoriesStructure'],
    queryFn: fetchCategoriesStructure,
    staleTime: 1000 * 60 * 60, // Cache categories for 1 hour
    gcTime: 1000 * 60 * 120, // Keep in cache for 2 hours
    refetchOnWindowFocus: false,
  });

  // --- State and Refs for Vertical Tab Animation ---
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeStyle, setActiveStyle] = useState({ top: "0px", height: "0px" });
  const tabRefs = useRef<(HTMLDivElement | null)[]>([]);

  const formattedCartCount = cartCount > 9 ? "9+" : cartCount.toString();
  const wishlistCount = wishlistItems.length; // Get wishlist count

  // --- Event Handlers ---

  const handleLogout = async () => {
    // Loading state is handled within the logout function in AuthContext now
    // including the redirect.
    try {
        // No need to set loading message here, logout function does it
        await logout();
        setAccountSheetOpen(false); // Close sheet on successful trigger
         // The redirect is handled inside the logout() function
    } catch (error) {
      // Error toast is handled within logout()
      console.error("Logout initiation failed in header:", error);
      // Potentially add a fallback error message if needed
    }
  };

  // Wrapper for navigation to handle global loading state
  const navigateWithLoading = (path: string, message: string, loadingSetter: (loading: boolean) => void) => {
    setLoadingMessage(message);
    loadingSetter(true);
    // Close any open sheets/modals immediately
    setAccountSheetOpen(false);
    setCatalogSheetOpen(false);
    setLoginOpen(false);

    setTimeout(() => {
        navigate(path);
        // Turn off specific loading after navigation timeout allows transition/render
        // Global loading might still be active if destination page loads data
        loadingSetter(false);
        setLoadingMessage(""); // Clear message
    }, 300); // Adjust timeout as needed
  };


  const handleCartNavigation = () => {
     navigateWithLoading('/checkout/cart-details', 'Loading your cart...', setIsLoading);
  };

    const handleWishlistNavigation = () => {
     navigateWithLoading('/wishlist', 'Loading your wishlist...', setIsLoading);
    };


  const handleLoginOpen = () => {
    setLoadingMessage("Preparing login...");
    setGlobalIsLoadingAuth(true); // Use the specific auth loading setter from context
    setTimeout(() => {
      setGlobalIsLoadingAuth(false);
      setLoginOpen(true);
    }, 300);
  };

   const handleOpenProfile = () => {
     navigateWithLoading('#', 'Loading your profile...', setIsLoadingProfile); // Use # or actual profile route if direct nav needed
     // Close account sheet immediately
     setAccountSheetOpen(false);
     // Open profile modal after a short delay
     setTimeout(() => {
        setProfileIndexOpen(true);
        // Loading state turned off inside navigateWithLoading or could be turned off here
     }, 350); // Slightly longer delay for modal
  };

  const displayName = user?.name || user?.email || "";
  const truncateUserName = (name: string, maxLength: number = 12) => {
    if (name && name.length > maxLength) {
      return `${name.substring(0, maxLength)}...`;
    }
    return name;
  };

  // useEffect hooks for Vertical Tab Animation (remain the same)
  useEffect(() => {
    if (accountSheetOpen && tabRefs.current[activeIndex]) {
      const activeElement = tabRefs.current[activeIndex];
      if (activeElement) {
        const { offsetTop, offsetHeight } = activeElement;
        requestAnimationFrame(() => {
          setActiveStyle({ top: `${offsetTop}px`, height: `${offsetHeight}px` });
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
          setActiveStyle({ top: `${offsetTop}px`, height: `${offsetHeight}px` });
        } else {
          // If ref not ready yet, retry on next frame
          requestAnimationFrame(checkRefs);
        }
      };
      requestAnimationFrame(checkRefs);
    }
  }, [accountSheetOpen, activeIndex]);


  // Define Sheet Tabs and Actions (Use navigateWithLoading)
  const sheetTabs = [
    { label: "Profile", action: handleOpenProfile, icon: User },
    { label: "Wishlist", action: () => navigateWithLoading('/wishlist', 'Loading your wishlist...', setIsLoading), icon: Heart },
    { label: "Orders", action: () => navigateWithLoading('/order-history', 'Loading your orders...', setIsLoading), icon: History },
    { label: "Repairs", action: () => navigateWithLoading('/repair/history', 'Loading your repairs...', setIsLoading), icon: Wrench },
  ];

    // --- Dynamic UI Logic ---
    const getSearchBarSize = () => {
        if (!windowSize.width) return "medium";
        if (windowSize.width < 1280) return "x-small";
        if (windowSize.width < 1300) return "small";
        if (windowSize.width < 1500) return "medium";
        return "large";
    };
    const getUsernameMaxLength = () => {
        if (!windowSize.width) return 12;
        if (windowSize.width < 1024) return 8;
        if (windowSize.width < 1500) return 10;
        return 12;
    };

  const shouldShowUsername = () => windowSize.width && windowSize.width >= 1200;
  const searchBarSize = getSearchBarSize();
  const usernameMaxLength = getUsernameMaxLength();
  const showUsername = shouldShowUsername();


  return (
    <header className="sticky top-0 z-50 w-full bg-[#0f1115]/95 backdrop-blur py-4 border-b border-[#2a2d36]">
      <div className="container mx-auto flex items-center justify-between px-4 md:px-6 lg:px-8 xl:px-11">

        {/* Left side for mobile - Offer and Support Icons */}
        <div className="md:hidden flex items-center justify-start w-1/4 gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-gray-300 hover:text-white hover:bg-[#4752c4]"
                    onClick={() => navigateWithLoading('/support', 'Loading support...', setIsLoading)}
                >
                    <MessageSquareDot className="h-5 w-5" />
                    <span className="sr-only">Support</span>
                 </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>Get Support</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <OffersPopover />
        </div>

        {/* Logo Section */}
<div className="flex-1 flex justify-center md:justify-start md:flex-none md:mr-4">
  <Link
    to="/"
    className="flex items-center gap-2"
    onClick={(e) => {
      e.preventDefault();
      navigateWithLoading("/", "Loading home page...", setIsLoading);
    }}
  >
    <div className="w-12 h-12 md:w-14 md:h-14 relative">
      <img
        src={Logo || "/placeholder.svg"}
        alt="GNT Logo"
        className="absolute inset-0 w-full h-full object-contain transform scale-[3] md:scale-[1.8] lg:scale-[2] transition-transform duration-300 ease-in-out origin-center"
        width={40}
        height={40}
        loading="eager"
      />
    </div>
    <span className="sr-only">GNT - Games & Tech</span>
  </Link>
</div>

        {/* Desktop Navigation & Search */}
        <div className="hidden md:flex items-center gap-2 lg:gap-4 xl:gap-6 flex-1 justify-center">
           {/* Shop Catalog Sheet Trigger */}
          <Sheet open={catalogSheetOpen} onOpenChange={setCatalogSheetOpen}>
             <SheetTrigger asChild>
                 <Button variant="outline" size="sm" className="min-w-[60px] flex items-center gap-1 bg-[#1a1c23] text-gray-300 hover:text-white border-[#2a2d36] hover:bg-[#2a2d36] hover:border-[#5865f2] transition-all duration-200 ease-in-out">
                     Shop <ChevronDown className="h-4 w-4 ml-1" />
                 </Button>
             </SheetTrigger>
             <SheetContent side="left" className="w-full sm:max-w-md bg-[#1a1c23] border-[#2a2d36] text-white overflow-y-auto">
                 <SheetHeader>
                     <SheetTitle className="text-white">Shop Catalog</SheetTitle>
                     <SheetDescription className="text-gray-400">Browse our product categories</SheetDescription>
                 </SheetHeader>
                 <Separator className="my-4 bg-[#2a2d36]" />
                 {/* Use categoriesLoading from useQuery */}
                 {categoriesLoading ? (
                     <div className="space-y-4 px-6 py-4">
                         {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full bg-[#2a2d36]" />)}
                     </div>
                 ) : (
                     <div className="px-6 py-4">
                         {productCategories ? (
                             Object.entries(productCategories).map(([category, subcategories], index, arr) => (
                                 <div key={category} className="mb-6">
                                     <div onClick={() => navigateWithLoading(`/${category}`, `Loading ${category}...`, setIsLoadingProducts)} className="flex items-center gap-2 mb-3 text-lg font-semibold text-white hover:text-[#5865f2] cursor-pointer p-1">
                                         {category === "Consoles" ? <Gamepad2 className="h-5 w-5" /> : category === "Computers" ? <Cpu className="h-5 w-5" /> : null}
                                         {category}
                                     </div>
                                     <div className="ml-6 space-y-3">
                                        {Object.entries(subcategories).map(([subcategory, labels]) => (
                                            <div key={subcategory} className="mb-3">
                                                <div onClick={() => navigateWithLoading(`/${category}/${subcategory}`, `Loading ${subcategory}...`, setIsLoadingProducts)} className="block text-base font-medium text-gray-300 hover:text-[#5865f2] cursor-pointer p-1">
                                                    {subcategory}
                                                </div>
                                                {labels.length > 0 && (
                                                    <div className="ml-4 mt-2 grid grid-cols-2 gap-2">
                                                        {labels.map((label) => (
                                                            <div key={label} onClick={() => navigateWithLoading(`/${category}/${subcategory}?label=${encodeURIComponent(label)}`, `Loading ${label}...`, setIsLoadingProducts)} className="text-sm text-gray-400 hover:text-[#5865f2] cursor-pointer p-1">
                                                                {label}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                     </div>
                                     {index < arr.length - 1 && <Separator className="my-4 bg-[#2a2d36]" />}
                                 </div>
                             ))
                         ) : (
                             <div className="px-3 py-2 text-sm text-gray-300">No categories available</div>
                         )}
                     </div>
                 )}
             </SheetContent>
           </Sheet>

           {/* Search Bar */}
           <SearchBar className="w-full" size={searchBarSize} />

           {/* Repair Services Button */}
           <Button
                variant="outline" size="sm"
                className="min-w-[120px] flex items-center justify-center gap-1 bg-[#1a1c23] text-sm whitespace-nowrap text-gray-300 hover:text-white border border-[#2a2d36] hover:bg-[#2a2d36] hover:border-[#5865f2] transition-all duration-200 ease-in-out cursor-pointer"
                onClick={() => navigateWithLoading('/repair-home', 'Loading repair services...', setIsLoading)}
            >
                {windowSize.width && windowSize.width < 960 ? "Repairs" : "Repair Services"}
            </Button>
        </div>

        {/* Right-side Links & Actions */}
        <div className="flex items-center gap-2 lg:gap-4 justify-end md:w-auto w-1/4">
            {/* Offer Button - Desktop */}
            <div className="hidden md:block"> <OffersPopover /> </div>
            {/* Support Button - Desktop */}
            <div className="hidden md:block">
                 <TooltipProvider> <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white hover:bg-[#4752c4] p-2" onClick={() => navigateWithLoading('/support', 'Loading support...', setIsLoading)}>
                             <MessageSquareDot className="h-4 w-4" /> <span className="sr-only">Support</span>
                         </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom"><p>Get Support</p></TooltipContent>
                 </Tooltip> </TooltipProvider>
            </div>

             {/* Wishlist Button - Desktop/Mobile (conditionally shown) */}
             {isAuthenticated && (
                <div className="relative">
                    <TooltipProvider> <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white hover:bg-[#4752c4] p-2" onClick={handleWishlistNavigation}>
                                <Heart className="h-4 w-4" />
                                <span className="sr-only">Wishlist</span>
                                {wishlistCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex items-center justify-center bg-[#5865f2] text-white text-xs font-bold rounded-full h-4 w-4 min-w-4">
                                        {wishlistCount > 9 ? '9+' : wishlistCount}
                                    </span>
                                )}
                             </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom"><p>View Wishlist {wishlistCount > 0 ? `(${wishlistCount})` : ''}</p></TooltipContent>
                     </Tooltip> </TooltipProvider>
                </div>
            )}

            {/* Cart Button - Desktop Only */}
              {!isMobile && (
                <div className="relative">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-gray-300 hover:text-white hover:bg-[#4752c4] p-2"
                          onClick={handleCartNavigation}
                        >
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
                        <p>
                          View Cart {cartCount > 0 ? `(${cartCount} item${cartCount !== 1 ? "s" : ""})` : ""}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}

            {/* Auth State: Loading / Logged In / Logged Out */}
            {isLoadingAuth ? (
                // Show skeleton while initially checking auth state
                 <Skeleton className={cn("rounded-md", isMobile || !showUsername ? "w-10 h-10" : "w-28 h-8")} />
            ) : isAuthenticated && user ? (
                 // Logged In: Show Account Sheet Trigger
                 <Sheet open={accountSheetOpen} onOpenChange={setAccountSheetOpen}>
                     <TooltipProvider> <Tooltip>
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
                                     <Button variant="ghost" size="icon" className="text-gray-300 hover:bg-[#4752c4] p-3">
                                         <Menu className="h-5 w-5" />
                                         <span className="sr-only">Account</span>
                                     </Button>
                                 )}
                             </SheetTrigger>
                         </TooltipTrigger>
                         <TooltipContent side="bottom"><p>Account Menu</p></TooltipContent>
                     </Tooltip> </TooltipProvider>
                     <SheetContent side="right" className="bg-[#1a1c23] border-l border-[#2a2d36] text-white flex flex-col h-full p-0">
                         <SheetHeader className="px-6 pt-6 pb-4 mb-2">
                             <SheetTitle className="text-white">Welcome {truncateUserName(displayName, usernameMaxLength + 4)}</SheetTitle>
                             <SheetDescription className="text-gray-400">Manage your account and preferences</SheetDescription>
                         </SheetHeader>
                         <div className="relative flex-grow px-4 py-2 overflow-y-auto"> {/* Added overflow */}
                             <div className="absolute left-0 w-[3px] bg-white rounded-r-md transition-all duration-300 ease-out pointer-events-none" style={activeStyle} />
                             <div className="flex flex-col space-y-1">
                                 {sheetTabs.map((tab, index) => {
                                     const TabIcon = tab.icon;
                                     return (
                                         <div
                                             key={tab.label}
                                             ref={(el) => (tabRefs.current[index] = el)}
                                             className={cn(
                                                 "flex items-center w-full px-4 py-4 cursor-pointer transition-all duration-200 rounded-md",
                                                 "hover:bg-[#ffffff1a]",
                                                 index === activeIndex ? "text-white bg-[#ffffff14]" : "text-gray-400 hover:text-gray-100"
                                             )}
                                             onClick={() => { setActiveIndex(index); tab.action(); }} // Action already closes sheet via navigateWithLoading
                                         >
                                             <TabIcon className="mr-3 h-4 w-4" />
                                             <span className="text-sm font-medium whitespace-nowrap">{tab.label}</span>
                                         </div>
                                     );
                                 })}
                             </div>
                         </div>
                         <div className="mt-auto p-6 border-t border-[#2a2d36]">
                             <Button variant="destructive" className="w-full flex items-center justify-center gap-2 py-6" onClick={handleLogout}>
                                 <LogOut className="h-4 w-4" /> Logout
                             </Button>
                         </div>
                     </SheetContent>
                 </Sheet>
            ) : (
                 // Logged Out: Show Login Button
                 <TooltipProvider> <Tooltip>
                     <TooltipTrigger asChild>
                         <Button variant="ghost" size={isMobile ? "icon" : "sm"} className="text-gray-300 hover:text-white hover:bg-[#4752c4] p-3" onClick={handleLoginOpen}>
                             <LogIn className="h-4 w-4" />
                             {!isMobile && <span className="ml-2 text-sm">Login</span>}
                             <span className="sr-only">Login</span>
                         </Button>
                     </TooltipTrigger>
                     <TooltipContent side="bottom"><p>Login or Sign Up</p></TooltipContent>
                 </Tooltip> </TooltipProvider>
            )}
        </div>
      </div>

      {/* Modals */}
      <ProfileIndex open={ProfileIndexOpen} onOpenChange={setProfileIndexOpen} />
      <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />
    </header>
  );
}