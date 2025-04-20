// --- File: /src/components/global/desktop/header.tsx ---
// src/components/global/desktop/New_header.tsx
import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag, ChevronDown, Gamepad2, Cpu, Wrench, User, History, LogIn, Heart, MessageSquareDot, Menu, LogOut, AlertTriangle } from "lucide-react"; // Added AlertTriangle
import { Button } from "@/components/ui/button";
import Logo from "@/assets/logo.svg"; // Ensure path is correct
import { useAuth } from "@/context/AuthContext"; // Keep Session type import if needed
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { SearchBar } from "@/components/global/desktop/search-bar";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useQuery } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useWindowSize } from "@/components/global/hooks/useWindowSize";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/components/global/Mobile/use-mobile";
import LoginModal from "@/pages/Login/LoginModal"; // Keep this for the login button
import { useLoading } from "@/components/global/Loading/LoadingContext";
import { ProfileIndex } from "@/pages/Profile/components/ProfileIndex";
import { OffersPopover } from "@/components/global/OffersPopover";

// Define the nested product categories structure
type ProductCategoriesStructure = { /* ... type definition ... */
  [category: string]: {
    [subcategory: string]: string[];
  };
};

// --- Function to fetch categories (can be moved to a service/api file) ---
async function fetchCategoriesStructure(): Promise<ProductCategoriesStructure | null> { /* ... fetch logic ... */
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
  // Get session from useAuth
  const { isAuthenticated, user, signOut, isLoadingAuth, session, openLoginModal } = useAuth();
  const { cartItems, cartCount, isLoading: isCartLoading } = useCart(); // Get cartItems and loading state
  const { wishlistItems, isLoading: isWishlistLoading } = useWishlist(); // Get wishlist loading state
  const windowSize = useWindowSize();
  const { setIsLoading, setIsLoadingProfile, setIsLoadingProducts, setIsLoadingAuth: setGlobalIsLoadingAuth, setLoadingMessage } = useLoading();

  const [accountSheetOpen, setAccountSheetOpen] = useState(false);
  const [catalogSheetOpen, setCatalogSheetOpen] = useState(false);
  const [ProfileIndexOpen, setProfileIndexOpen] = useState(false);
  // Removed loginOpen state, use context's openLoginModal

  // --- AAL Constants (MUST MATCH AuthGuard/ResetPassword) ---
  const REQUIRED_AAL_FOR_FULL_ACCESS = 'aal1';
  const RECOVERY_AAL_LEVEL = 'aal1'; // Example level during reset

  // --- Calculate Access Level ---
  const currentAal = session?.user ? (session.user as any).aal : null;
  // User has full access if authenticated, session exists, and AAL matches the required level
  // Handle the ambiguous case: if recovery == required, assume full unless proven otherwise (AuthGuard does this)
  const hasFullAccess = isAuthenticated && session && currentAal === REQUIRED_AAL_FOR_FULL_ACCESS;
  // User is potentially in recovery if auth'd, has session, and AAL matches recovery level
  // This is more complex if AAL levels are the same. We rely on hasFullAccess being false in that case.
  const isInRecoveryState = isAuthenticated && session && currentAal === RECOVERY_AAL_LEVEL && REQUIRED_AAL_FOR_FULL_ACCESS !== RECOVERY_AAL_LEVEL;
  const isRestrictedSession = isAuthenticated && !hasFullAccess; // True if logged in but AAL is not sufficient


  // --- Fetch categories using useQuery ---
  const { data: productCategories, isLoading: categoriesLoading, } = useQuery<ProductCategoriesStructure | null, Error>({ /* ... query config ... */
    queryKey: ['productCategoriesStructure'],
    queryFn: fetchCategoriesStructure,
    staleTime: 1000 * 60 * 60, gcTime: 1000 * 60 * 120, refetchOnWindowFocus: false,
   });

  // --- State and Refs for Vertical Tab Animation ---
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeStyle, setActiveStyle] = useState({ top: "0px", height: "0px" });
  const tabRefs = useRef<(HTMLDivElement | null)[]>([]);

  const formattedCartCount = cartCount > 9 ? "9+" : cartCount.toString();
  const wishlistCount = wishlistItems.length; // Get wishlist count

  // --- Event Handlers ---
  const handleLogout = async () => { /* ... logout logic ... */
    try {
      await signOut();
      setAccountSheetOpen(false);
    } catch (error) {
      console.error("Logout initiation failed in header:", error);
    }
   };

  // Wrapper for navigation - NO CHANGE NEEDED HERE
  const navigateWithLoading = (path: string, message: string, loadingSetter: (loading: boolean) => void) => { /* ... */
    setLoadingMessage(message);
    loadingSetter(true);
    setAccountSheetOpen(false);
    setCatalogSheetOpen(false);
    // setLoginOpen(false); // Remove direct login modal control

    setTimeout(() => {
      navigate(path);
      // Loading state is often cleared by LoadingRouteListener, but ensure it happens
      loadingSetter(false);
      setLoadingMessage("");
    }, 300);
   };

   // MODIFIED: Handlers for protected routes
   const handleProtectedNavigation = (path: string, loadingMsg: string, loadingSetter: (loading: boolean) => void = setIsLoading) => {
       if (!hasFullAccess) {
           toast.warning("Action Restricted", { description: "Please complete password reset first." });
           // Optionally navigate to reset page if they are in recovery state
           if (isInRecoveryState) navigate('/reset-password');
           return;
       }
       navigateWithLoading(path, loadingMsg, loadingSetter);
   };

  const handleCartNavigation = () => handleProtectedNavigation('/checkout/cart-details', 'Loading your cart...');
  const handleWishlistNavigation = () => handleProtectedNavigation('/wishlist', 'Loading your wishlist...');
  const handleOrderHistoryNavigation = () => handleProtectedNavigation('/order-history', 'Loading your orders...');
  const handleRepairsNavigation = () => handleProtectedNavigation('/repair/history', 'Loading your repairs...'); // Assuming repairs need full access
  const handleProfileIndexNavigation = () => handleProtectedNavigation('#', 'Loading your profile...', setIsLoadingProfile);


   const handleOpenProfile = () => {
       if (!hasFullAccess) {
            toast.warning("Action Restricted", { description: "Please complete password reset first." });
            // Optionally navigate to reset page if they are in recovery state
            if (isInRecoveryState) navigate('/reset-password');
           return;
       }
        // ProfileIndex itself should handle loading its data via hooks
       // navigateWithLoading('#', 'Loading your profile...', setIsLoadingProfile); // Can remove this specific loading trigger
       setAccountSheetOpen(false); // Close account sheet if open
       // Open the ProfileIndex component/modal/drawer
       // This assumes ProfileIndex is controlled by `ProfileIndexOpen` state
       setTimeout(() => {
            setProfileIndexOpen(true);
       }, 50); // Small delay to allow sheet to close visually
   };

   // Handler to open Login Modal using context
   const handleLoginOpen = () => {
       // setLoadingMessage("Preparing login..."); // Optional message
       // setGlobalIsLoadingAuth(true); // Optional global loading
       // setTimeout(() => {
       //     setGlobalIsLoadingAuth(false);
            openLoginModal('/'); // Open login modal via context, redirect home on success
       // }, 300);
   };


  const displayName = user?.user_metadata?.name || user?.email || "";
  const truncateUserName = (name: string, maxLength: number = 12) => { /* ... */
    if (name && name.length > maxLength) {
      return `${name.substring(0, maxLength)}...`;
    }
    return name;
   };

  // useEffect hooks for Vertical Tab Animation - NO CHANGE NEEDED
  useEffect(() => { /* ... */ }, [activeIndex, accountSheetOpen]);
  useEffect(() => { /* ... */ }, [accountSheetOpen, activeIndex]);

  // Define Sheet Tabs and Actions - Use updated handlers
   const sheetTabs = [
       { label: "Profile", action: handleOpenProfile, icon: User },
       { label: "Wishlist", action: handleWishlistNavigation, icon: Heart },
       { label: "Orders", action: handleOrderHistoryNavigation, icon: History },
       { label: "Repairs", action: handleRepairsNavigation, icon: Wrench }, // Needs updated handler
   ];

  // --- Dynamic UI Logic - NO CHANGE NEEDED ---
  const getSearchBarSize = () => { /* ... */
    if (!windowSize.width) return "medium";
    if (windowSize.width < 1280) return "x-small";
    if (windowSize.width < 1300) return "small";
    if (windowSize.width < 1540) return "medium";
    return "large";
   };
  const getUsernameMaxLength = () => { /* ... */
    if (!windowSize.width) return 12;
    if (windowSize.width < 1024) return 8;
    if (windowSize.width < 1500) return 10;
    return 12;
   };
  const shouldShowUsername = () => windowSize.width && windowSize.width >= 1200;
  const searchBarSize = getSearchBarSize();
  const usernameMaxLength = getUsernameMaxLength();
  const showUsername = shouldShowUsername();

  // --- Render ---
  return (
    <header className="sticky top-0 z-50 w-full bg-[#0f1115]/95 backdrop-blur py-4 border-b border-[#2a2d36]">
      <div className="container mx-auto flex items-center justify-between px-4 md:px-6 lg:px-8 xl:px-11">

        {/* Left side for mobile - Offer and Support Icons */}
        <div className="md:hidden flex items-center justify-start w-1/4 gap-2">
             {/* ... Offer/Support buttons ... */}
             <TooltipProvider> <Tooltip> <TooltipTrigger asChild> <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white hover:bg-[#4752c4]" onClick={() => navigateWithLoading('/support', 'Loading support...', setIsLoading)}> <MessageSquareDot className="h-5 w-5" /> <span className="sr-only">Support</span> </Button> </TooltipTrigger> <TooltipContent side="bottom"><p>Get Support</p></TooltipContent> </Tooltip> </TooltipProvider>
             <OffersPopover />
        </div>

        {/* Logo Section */}
        <div className={cn("flex items-center", isMobile ? "justify-center flex-1" : "justify-start md:flex-none md:mr-4")} >
           {/* ... Logo Link ... */}
           <Link to="/" className="flex items-center gap-2" onClick={(e) => { e.preventDefault(); navigateWithLoading("/", "Loading home page...", setIsLoading); }}> <div className={cn("relative", isMobile ? "w-12 h-12" : "w-14 h-14")}> <img src={Logo || "/placeholder.svg"} alt="GNT Logo" className={cn("absolute inset-0 w-full h-full object-contain transition-transform duration-300 ease-in-out", isMobile ? "transform scale-[2.5] origin-center" : windowSize.width >= 1540 ? "transform scale-[3] origin-left" : "transform scale-[1.8] origin-left")} width={40} height={40} loading="eager" /> </div> <span className="sr-only">GNT - Games & Tech</span> </Link>
        </div>

        {/* Desktop Navigation & Search */}
        <div className="hidden md:flex items-center gap-2 lg:gap-4 xl:gap-6 flex-1 justify-center">
             {/* Shop Catalog Sheet Trigger */}
              <Sheet open={catalogSheetOpen} onOpenChange={setCatalogSheetOpen}> <SheetTrigger asChild> <Button variant="outline" size="sm" className="min-w-[60px] flex items-center gap-1 bg-[#1a1c23] text-gray-300 hover:text-white border-[#2a2d36] hover:bg-[#2a2d36] hover:border-[#5865f2] transition-all duration-200 ease-in-out" > Shop <ChevronDown className="h-4 w-4 ml-1" /> </Button> </SheetTrigger> <SheetContent side="left" className="w-full sm:max-w-md bg-[#1a1c23] border-[#2a2d36] text-white overflow-y-auto"> <SheetHeader> <SheetTitle className="text-white">Shop Catalog</SheetTitle> <SheetDescription className="text-gray-400">Browse our product categories</SheetDescription> </SheetHeader> <Separator className="my-4 bg-[#2a2d36]" /> {categoriesLoading ? ( <div className="space-y-4 px-6 py-4"> {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full bg-[#2a2d36]" />)} </div> ) : ( <div className="px-6 py-4"> {productCategories ? ( Object.entries(productCategories).map(([category, subcategories], index, arr) => ( <div key={category} className="mb-6"> {/* ... Category/Subcategory links ... */} <div onClick={() => navigateWithLoading(`/${category}`, `Loading ${category}...`, setIsLoadingProducts)} className="flex items-center gap-2 mb-3 text-lg font-semibold text-white hover:text-[#5865f2] cursor-pointer p-1"> {category === "Consoles" ? <Gamepad2 className="h-5 w-5" /> : category === "Computers" ? <Cpu className="h-5 w-5" /> : null} {category} </div> <div className="ml-6 space-y-3"> {Object.entries(subcategories).map(([subcategory, labels]) => ( <div key={subcategory} className="mb-3"> <div onClick={() => navigateWithLoading(`/${category}/${subcategory}`, `Loading ${subcategory}...`, setIsLoadingProducts)} className="block text-base font-medium text-gray-300 hover:text-[#5865f2] cursor-pointer p-1"> {subcategory} </div> {labels.length > 0 && ( <div className="ml-4 mt-2 grid grid-cols-2 gap-2"> {labels.map((label) => ( <div key={label} onClick={() => navigateWithLoading(`/${category}/${subcategory}?label=${encodeURIComponent(label)}`, `Loading ${label}...`, setIsLoadingProducts)} className="text-sm text-gray-400 hover:text-[#5865f2] cursor-pointer p-1"> {label} </div> ))} </div> )} </div> ))} </div> {index < arr.length - 1 && <Separator className="my-4 bg-[#2a2d36]" />} </div> )) ) : ( <div className="px-3 py-2 text-sm text-gray-300">No categories available</div> )} </div> )} </SheetContent> </Sheet>

              {/* Search Bar */}
              <SearchBar className="w-full" size={searchBarSize} />

              {/* Repair Services Button - MODIFIED */}
              <Button variant="outline" size="sm" className={cn("flex items-center justify-center gap-1 bg-[#1a1c23] text-sm whitespace-nowrap text-gray-300 hover:text-white border border-[#2a2d36] hover:bg-[#2a2d36] hover:border-[#5865f2] transition-all duration-200 ease-in-out cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed", windowSize.width && windowSize.width < 960 ? "min-w-[75px]" : "min-w-[120px]")} onClick={() => handleProtectedNavigation("/repair-home", "Loading repair services...", setIsLoading)} disabled={!hasFullAccess && isAuthenticated} // Disable if logged in but restricted
              > {windowSize.width && windowSize.width < 960 ? "Repairs" : "Repair Services"} </Button>
        </div>

        {/* Right-side Links & Actions */}
        <div className="flex items-center gap-2 lg:gap-4 justify-end md:w-auto w-1/4">
          {/* Offer Button - Desktop */}
          <div className="hidden md:block"> <OffersPopover /> </div>

          {/* Support Button - Desktop */}
          <div className="hidden md:block"> <TooltipProvider> <Tooltip> <TooltipTrigger asChild> <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white hover:bg-[#4752c4] p-2" onClick={() => navigateWithLoading('/support', 'Loading support...', setIsLoading)}> <MessageSquareDot className="h-4 w-4" /> <span className="sr-only">Support</span> </Button> </TooltipTrigger> <TooltipContent side="bottom"><p>Get Support</p></TooltipContent> </Tooltip> </TooltipProvider> </div>

          {/* Wishlist Button - MODIFIED */}
           {isAuthenticated && ( // Keep showing if authenticated
                <div className="relative"> <TooltipProvider> <Tooltip> <TooltipTrigger asChild> <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white hover:bg-[#4752c4] p-2 disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleWishlistNavigation} disabled={!hasFullAccess || isWishlistLoading} // Disable if restricted or loading
                          > <Heart className="h-4 w-4" /> <span className="sr-only">Wishlist</span> {wishlistCount > 0 && hasFullAccess && ( <span className="absolute -top-1 -right-1 flex items-center justify-center bg-[#5865f2] text-white text-xs font-bold rounded-full h-4 w-4 min-w-4"> {wishlistCount > 9 ? '9+' : wishlistCount} </span> )} </Button> </TooltipTrigger> <TooltipContent side="bottom"><p>View Wishlist {wishlistCount > 0 ? `(${wishlistCount})` : ''}</p></TooltipContent> </Tooltip> </TooltipProvider> </div>
           )}

           {/* Cart Button - MODIFIED */}
           {isAuthenticated && (!isMobile && ( // Keep showing if authenticated & desktop
                <div className="relative"> <TooltipProvider> <Tooltip> <TooltipTrigger asChild> <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white hover:bg-[#4752c4] p-2 disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleCartNavigation} disabled={!hasFullAccess || isCartLoading} // Disable if restricted or loading
                          > <ShoppingBag className="h-4 w-4" /> <span className="sr-only">Cart</span> {cartCount > 0 && hasFullAccess && ( <span className="absolute -top-1 -right-1 flex items-center justify-center bg-[#5865f2] text-white text-xs font-bold rounded-full h-4 w-4 min-w-4"> {formattedCartCount} </span> )} </Button> </TooltipTrigger> <TooltipContent side="bottom"> <p> View Cart {cartCount > 0 ? `(${cartCount} item${cartCount !== 1 ? "s" : ""})` : ""} </p> </TooltipContent> </Tooltip> </TooltipProvider> </div>
            ))}


          {/* Auth State: Loading / Logged In (Full/Restricted) / Logged Out */}
          {isLoadingAuth ? (
            <Skeleton className={cn("rounded-md", isMobile || !showUsername ? "w-10 h-10" : "w-28 h-8")} />
          ) : isAuthenticated && user ? (
            // Logged In: Show Account Sheet Trigger
            <Sheet open={accountSheetOpen} onOpenChange={setAccountSheetOpen}>
              <SheetTrigger asChild>
                {/* Badge/Menu Trigger Logic */}
                 {!isMobile && showUsername ? ( <Badge variant="outline" className="px-2 py-1 border-[#2a2d36] hover:border-[#5865f2] cursor-pointer bg-transparent flex items-center"> {isRestrictedSession && <AlertTriangle className="h-3 w-3 text-yellow-400 mr-1" />} {/* Add warning icon if restricted */} <User className="h-4 w-4 text-white" /> <span className="ml-2 text-white max-w-24 overflow-hidden text-ellipsis whitespace-nowrap"> {truncateUserName(displayName, usernameMaxLength)} </span> </Badge> ) : ( <Button variant="ghost" size="icon" className="text-gray-300 hover:bg-[#4752c4] p-3 relative"> <Menu className="h-5 w-5" /> {isRestrictedSession && <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-yellow-400 ring-2 ring-[#1a1c23]"></span>} {/* Add warning dot if restricted */} <span className="sr-only">Account</span> </Button> )}
              </SheetTrigger>
              <SheetContent side="right" className="bg-[#1a1c23] border-l border-[#2a2d36] text-white flex flex-col h-full p-0">
                <SheetHeader className="px-6 pt-6 pb-4 mb-2">
                    <SheetTitle className="text-white flex items-center gap-2"> Welcome {truncateUserName(displayName, usernameMaxLength + 4)} {isRestrictedSession && <TooltipProvider><Tooltip><TooltipTrigger><AlertTriangle className="h-4 w-4 text-yellow-400"/></TooltipTrigger><TooltipContent><p>Password reset pending</p></TooltipContent></Tooltip></TooltipProvider>} </SheetTitle>
                    <SheetDescription className="text-gray-400">{isRestrictedSession ? "Update password for full access." : "Manage your account and preferences"}</SheetDescription>
                </SheetHeader>
                {/* Conditionally render sheet content based on access */}
                 {hasFullAccess ? (
                      <>
                          <div className="relative flex-grow px-4 py-2 overflow-y-auto">
                              <div className="absolute left-0 w-[3px] bg-white rounded-r-md transition-all duration-300 ease-out pointer-events-none" style={activeStyle} />
                              <div className="flex flex-col space-y-1">
                                {sheetTabs.map((tab, index) => {
                                  const TabIcon = tab.icon;
                                  return ( <div key={tab.label} ref={(el) => (tabRefs.current[index] = el)} className={cn("flex items-center w-full px-4 py-4 cursor-pointer transition-all duration-200 rounded-md", "hover:bg-[#ffffff1a]", index === activeIndex ? "text-white bg-[#ffffff14]" : "text-gray-400 hover:text-gray-100" )} onClick={() => { setActiveIndex(index); tab.action(); }} > <TabIcon className="mr-3 h-4 w-4" /> <span className="text-sm font-medium whitespace-nowrap">{tab.label}</span> </div> );
                                })}
                              </div>
                          </div>
                           <div className="mt-auto p-6 border-t border-[#2a2d36]">
                               <Button variant="destructive" className="w-full flex items-center justify-center gap-2 py-6" onClick={handleLogout}> <LogOut className="h-4 w-4" /> Logout </Button>
                           </div>
                      </>
                 ) : (
                     // Show restricted view if logged in but not full access
                      <div className="p-6 text-center text-yellow-400 flex-grow flex flex-col justify-center items-center">
                         <AlertTriangle className="h-10 w-10 mb-4"/>
                          <p className="mb-4 text-lg font-medium">Account Access Restricted</p>
                          <p className="text-sm mb-6">Please complete the password reset process to use features like Wishlist, Cart, Orders, and Repairs.</p>
                           <Button variant="outline" className="w-full border-yellow-500 text-yellow-300 hover:bg-yellow-600/20" onClick={() => { setAccountSheetOpen(false); navigate('/reset-password'); }}>Go to Reset Password</Button>
                           <div className="mt-auto p-6 border-t border-[#2a2d36] w-full">
                                <Button variant="destructive" className="w-full flex items-center justify-center gap-2 py-6" onClick={handleLogout}> <LogOut className="h-4 w-4" /> Logout </Button>
                           </div>
                      </div>
                 )}
              </SheetContent>
            </Sheet>
          ) : (
            // Logged Out: Show Login Button
             <TooltipProvider> <Tooltip> <TooltipTrigger asChild> <Button variant="ghost" size={isMobile ? "icon" : "sm"} className="text-gray-300 hover:text-white hover:bg-[#4752c4] p-3" onClick={handleLoginOpen} > <LogIn className="h-4 w-4" /> {!isMobile && <span className="ml-2 text-sm">Login</span>} <span className="sr-only">Login</span> </Button> </TooltipTrigger> <TooltipContent side="bottom"><p>Login or Sign Up</p></TooltipContent> </Tooltip> </TooltipProvider>
          )}
        </div>
      </div>

      {/* Modals */}
       {/* ProfileIndex modal/drawer is opened via state */}
      <ProfileIndex open={ProfileIndexOpen} onOpenChange={setProfileIndexOpen} />
       {/* LoginModal is now controlled by AuthContext */}
       {/* <LoginModal open={loginOpen} onOpenChange={setLoginOpen} ... /> */}
    </header>
  );
}