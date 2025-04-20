// src/components/global/desktop/header.tsx
import { Link as RouterLink, useNavigate } from "react-router-dom"; // Renamed Link to RouterLink
import { ShoppingBag, ChevronDown, Gamepad2, Cpu, Wrench, User, History, LogIn, Heart, MessageSquareDot, Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppLogo from "@/assets/logo.svg"; // Renamed Logo to AppLogo
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { SearchBar } from "@/components/global/desktop/search-bar";
import { useEffect, useState, useRef } from "react";
// REMOVED: import { supabase } from "@/lib/supabase"; // Unused import
import { useQuery } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner"; // Keep toast if used elsewhere, remove if not
import { useWindowSize } from "@/components/global/hooks/useWindowSize";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/components/global/Mobile/use-mobile";
import { useLoading } from "@/components/global/Loading/LoadingContext";
import { ProfileIndex } from "@/pages/Profile/components/ProfileIndex";
import { OffersPopover } from "@/components/global/OffersPopover";
import { supabase } from "@/lib/supabase"; // Keep supabase import if fetchCategoriesStructure uses it

type ProductCategoriesStructure = { [category: string]: { [subcategory: string]: string[]; }; };

// Keep fetch function if used by useQuery below
async function fetchCategoriesStructure(): Promise<ProductCategoriesStructure | null> {
    console.log("[Header] Fetching category structure...");
    const { data, error } = await supabase.rpc("get_product_categories_structure"); // Assuming this RPC exists
    if (error) {
        console.error("Error fetching product categories structure:", error);
        toast.error("Failed to load shop categories"); // Use toast here
        return null; // <-- Added return null on error
    }
    // Add explicit return for success case if needed, or rely on implicit return
    return data as ProductCategoriesStructure; // <-- Added return for success case
}


export default function Header() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { isAuthenticated, user, signOut, isLoadingAuth, openLoginModal } = useAuth();
  const { cartCount } = useCart();
  const { wishlistItems } = useWishlist();
  const windowSize = useWindowSize();
  const { setIsLoading, setIsLoadingProfile, setIsLoadingProducts, setLoadingMessage } = useLoading();

  const [accountSheetOpen, setAccountSheetOpen] = useState(false);
  const [catalogSheetOpen, setCatalogSheetOpen] = useState(false);
  const [ProfileIndexOpen, setProfileIndexOpen] = useState(false);

  // Corrected useQuery call
  const { data: productCategories, isLoading: categoriesLoading } = useQuery<ProductCategoriesStructure | null, Error>({
    queryKey: ['productCategoriesStructure'],
    queryFn: fetchCategoriesStructure, // Pass the function reference
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 120,
    refetchOnWindowFocus: false,
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const [activeStyle, setActiveStyle] = useState({ top: "0px", height: "0px" });
  const tabRefs = useRef<(HTMLDivElement | null)[]>([]);

  const formattedCartCount = cartCount > 9 ? "9+" : cartCount.toString();
  const wishlistCount = wishlistItems.length;

  const handleLogout = async () => {
    try { await signOut(); setAccountSheetOpen(false); }
    catch (error) { console.error("Logout initiation failed in header:", error); }
  };
  const navigateWithLoading = (path: string, message: string, loadingSetter: (loading: boolean) => void) => {
     setLoadingMessage(message); loadingSetter(true); setAccountSheetOpen(false); setCatalogSheetOpen(false); /* REMOVED: setLoginOpen(false); */
     setTimeout(() => { navigate(path); loadingSetter(false); setLoadingMessage(""); }, 300);
  };
  const handleCartNavigation = () => { navigateWithLoading('/checkout/cart-details', 'Loading cart...', setIsLoading); };
  const handleWishlistNavigation = () => { navigateWithLoading('/wishlist', 'Loading wishlist...', setIsLoading); };
  const handleLoginOpen = () => { setLoadingMessage("Preparing login..."); setIsLoading(true); setTimeout(() => { setIsLoading(false); setLoadingMessage(""); openLoginModal(); }, 300); };
  const handleOpenProfile = () => { setLoadingMessage('Loading profile...'); setIsLoadingProfile(true); setAccountSheetOpen(false); setTimeout(() => { setProfileIndexOpen(true); setIsLoadingProfile(false); setLoadingMessage(''); }, 350); };

  const displayName = user?.user_metadata?.name || user?.email || "";
  const truncateUserName = (name: string, maxLength: number = 12): string => { return name && name.length > maxLength ? `${name.substring(0, maxLength)}...` : name; };

  useEffect(() => { if (accountSheetOpen && tabRefs.current[activeIndex]) { const el = tabRefs.current[activeIndex]; if (el) { requestAnimationFrame(() => setActiveStyle({ top: `${el.offsetTop}px`, height: `${el.offsetHeight}px` })); } } }, [activeIndex, accountSheetOpen]);
  useEffect(() => { if (accountSheetOpen) { const check = () => { const el = tabRefs.current[activeIndex]; if (el) setActiveStyle({ top: `${el.offsetTop}px`, height: `${el.offsetHeight}px` }); else requestAnimationFrame(check); }; requestAnimationFrame(check); } }, [accountSheetOpen, activeIndex]);

  const sheetTabs = [ { label: "Profile", action: handleOpenProfile, icon: User }, { label: "Wishlist", action: () => navigateWithLoading('/wishlist', 'Loading wishlist...', setIsLoading), icon: Heart }, { label: "Orders", action: () => navigateWithLoading('/order-history', 'Loading orders...', setIsLoading), icon: History }, { label: "Repairs", action: () => navigateWithLoading('/repair/history', 'Loading repairs...', setIsLoading), icon: Wrench }, ];

  const getSearchBarSize = (): "x-small" | "small" | "medium" | "large" => { // Corrected return type
        if (!windowSize.width) return "medium"; // Default return
        if (windowSize.width < 1280) return "x-small";
        if (windowSize.width < 1300) return "small";
        if (windowSize.width < 1540) return "medium";
        return "large"; // Explicit return for the last case
    };
  const getUsernameMaxLength = (): number => { /* ... */ return 12; };
  const shouldShowUsername = (): boolean => !!windowSize.width && windowSize.width >= 1200;
  const searchBarSize = getSearchBarSize();
  const usernameMaxLength = getUsernameMaxLength();
  const showUsername = shouldShowUsername();

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0f1115]/95 backdrop-blur py-4 border-b border-[#2a2d36]">
      <div className="container mx-auto flex items-center justify-between px-4 md:px-6 lg:px-8 xl:px-11">
        {/* Mobile Left */}
        <div className="md:hidden flex items-center justify-start w-1/4 gap-2"> <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="text-gray-300 hover:text-white hover:bg-[#4752c4]" onClick={() => navigateWithLoading('/support', 'Loading support...', setIsLoading)}> <MessageSquareDot className="h-5 w-5" /> <span className="sr-only">Support</span> </Button></TooltipTrigger><TooltipContent side="bottom"><p>Get Support</p></TooltipContent></Tooltip></TooltipProvider> <OffersPopover /> </div>
        {/* Logo */}
        <div className={cn( "flex items-center", isMobile ? "justify-center flex-1" : "justify-start md:flex-none md:mr-4" )}> <RouterLink to="/" className="flex items-center gap-2" onClick={(e) => { e.preventDefault(); navigateWithLoading("/", "Loading home...", setIsLoading); }}> <div className={cn("relative", isMobile ? "w-12 h-12" : "w-14 h-14")}> <img src={AppLogo || "/placeholder.svg"} alt="GNT Logo" className={cn( "absolute inset-0 w-full h-full object-contain transition-transform duration-300 ease-in-out", isMobile ? "transform scale-[2.5]" : windowSize.width >= 1540 ? "transform scale-[3] origin-left" : "transform scale-[1.8] origin-left" )} width={40} height={40} loading="eager" /> </div> <span className="sr-only">GNT - Games & Tech</span> </RouterLink> </div>
        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-2 lg:gap-4 xl:gap-6 flex-1 justify-center">
           {/* Shop Catalog */}
           <Sheet open={catalogSheetOpen} onOpenChange={setCatalogSheetOpen}> <SheetTrigger asChild> <Button variant="outline" size="sm" className="min-w-[60px] flex items-center gap-1 bg-[#1a1c23] text-gray-300 hover:text-white border-[#2a2d36] hover:bg-[#2a2d36] hover:border-[#5865f2]"> Shop <ChevronDown className="h-4 w-4 ml-1" /> </Button> </SheetTrigger> <SheetContent side="left" className="w-full sm:max-w-md bg-[#1a1c23] border-[#2a2d36] text-white overflow-y-auto"> <SheetHeader> <SheetTitle className="text-white">Shop Catalog</SheetTitle> <SheetDescription className="text-gray-400">Browse categories</SheetDescription> </SheetHeader> <Separator className="my-4 bg-[#2a2d36]" /> {categoriesLoading ? ( <div className="space-y-4 px-6 py-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full bg-[#2a2d36]" />)}</div> ) : ( <div className="px-6 py-4"> {productCategories ? ( Object.entries(productCategories).map(([category, subcategories], index, arr) => ( <div key={category} className="mb-6"> <div onClick={() => navigateWithLoading(`/${category}`, `Loading ${category}...`, setIsLoadingProducts)} className="flex items-center gap-2 mb-3 text-lg font-semibold text-white hover:text-[#5865f2] cursor-pointer p-1"> {category === "Consoles" ? <Gamepad2 className="h-5 w-5" /> : category === "Computers" ? <Cpu className="h-5 w-5" /> : null} {category} </div> <div className="ml-6 space-y-3"> {Object.entries(subcategories).map(([subcategory, labels]) => ( <div key={subcategory} className="mb-3"> <div onClick={() => navigateWithLoading(`/${category}/${subcategory}`, `Loading ${subcategory}...`, setIsLoadingProducts)} className="block text-base font-medium text-gray-300 hover:text-[#5865f2] cursor-pointer p-1">{subcategory}</div> {labels.length > 0 && ( <div className="ml-4 mt-2 grid grid-cols-2 gap-2"> {labels.map((label) => ( <div key={label} onClick={() => navigateWithLoading(`/${category}/${subcategory}?label=${encodeURIComponent(label)}`, `Loading ${label}...`, setIsLoadingProducts)} className="text-sm text-gray-400 hover:text-[#5865f2] cursor-pointer p-1">{label}</div> ))} </div> )} </div> ))} </div> {index < arr.length - 1 && <Separator className="my-4 bg-[#2a2d36]" />} </div> )) ) : ( <div className="px-3 py-2 text-sm text-gray-300">No categories</div> )} </div> )} </SheetContent> </Sheet>
           {/* Search Bar */}
           <SearchBar className="w-full" size={searchBarSize} />
           {/* Repair Button */}
           <Button variant="outline" size="sm" className={cn("flex items-center justify-center gap-1 bg-[#1a1c23] text-sm whitespace-nowrap text-gray-300 hover:text-white border border-[#2a2d36] hover:bg-[#2a2d36] hover:border-[#5865f2]", windowSize.width && windowSize.width < 960 ? "min-w-[75px]" : "min-w-[120px]" )} onClick={() => navigateWithLoading( "/repair-home", "Loading repair...", setIsLoading )}> {windowSize.width && windowSize.width < 960 ? "Repairs" : "Repair Services"} </Button>
        </div>
        {/* Right Actions */}
        <div className="flex items-center gap-2 lg:gap-4 justify-end md:w-auto w-1/4">
            {/* Desktop Offer/Support */}
            <div className="hidden md:block"> <OffersPopover /> </div>
            <div className="hidden md:block"> <TooltipProvider><Tooltip><TooltipTrigger asChild> <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white hover:bg-[#4752c4] p-2" onClick={() => navigateWithLoading('/support', 'Loading support...', setIsLoading)}> <MessageSquareDot className="h-4 w-4" /> <span className="sr-only">Support</span> </Button> </TooltipTrigger><TooltipContent side="bottom"><p>Support</p></TooltipContent></Tooltip></TooltipProvider> </div>
            {/* Wishlist Button */}
            {isAuthenticated && ( <div className="relative"> <TooltipProvider><Tooltip><TooltipTrigger asChild> <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white hover:bg-[#4752c4] p-2" onClick={handleWishlistNavigation}> <Heart className="h-4 w-4" /> <span className="sr-only">Wishlist</span> {wishlistCount > 0 && ( <span className="absolute -top-1 -right-1 flex items-center justify-center bg-[#5865f2] text-white text-xs font-bold rounded-full h-4 w-4 min-w-4"> {wishlistCount > 9 ? '9+' : wishlistCount} </span> )} </Button> </TooltipTrigger><TooltipContent side="bottom"><p>Wishlist {wishlistCount > 0 ? `(${wishlistCount})` : ''}</p></TooltipContent></Tooltip></TooltipProvider> </div> )}
            {/* Cart Button - Desktop */}
            {isAuthenticated && (!isMobile && ( <div className="relative"> <TooltipProvider><Tooltip><TooltipTrigger asChild> <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white hover:bg-[#4752c4] p-2" onClick={handleCartNavigation}> <ShoppingBag className="h-4 w-4" /> <span className="sr-only">Cart</span> {cartCount > 0 && ( <span className="absolute -top-1 -right-1 flex items-center justify-center bg-[#5865f2] text-white text-xs font-bold rounded-full h-4 w-4 min-w-4"> {formattedCartCount} </span> )} </Button> </TooltipTrigger><TooltipContent side="bottom"><p>Cart {cartCount > 0 ? `(${cartCount})` : ""}</p></TooltipContent></Tooltip></TooltipProvider> </div> ))}
            {/* Auth State */}
            {isLoadingAuth ? ( <Skeleton className={cn("rounded-md", isMobile || !showUsername ? "w-10 h-10" : "w-28 h-8")} /> ) : isAuthenticated && user ? (
                 // Logged In: Account Sheet
                 <Sheet open={accountSheetOpen} onOpenChange={setAccountSheetOpen}> <TooltipProvider><Tooltip><TooltipTrigger asChild> <SheetTrigger asChild> {!isMobile && showUsername ? ( <Badge variant="outline" className="px-2 py-1 border-[#2a2d36] hover:border-[#5865f2] cursor-pointer bg-transparent"> <User className="h-4 w-4 text-white" /> <span className="ml-2 text-white max-w-24 overflow-hidden text-ellipsis whitespace-nowrap"> {truncateUserName(displayName, usernameMaxLength)} </span> </Badge> ) : ( <Button variant="ghost" size="icon" className="text-gray-300 hover:bg-[#4752c4] p-3"> <Menu className="h-5 w-5" /> <span className="sr-only">Account</span> </Button> )} </SheetTrigger> </TooltipTrigger><TooltipContent side="bottom"><p>Account Menu</p></TooltipContent></Tooltip></TooltipProvider> <SheetContent side="right" className="bg-[#1a1c23] border-l border-[#2a2d36] text-white flex flex-col h-full p-0"> <SheetHeader className="px-6 pt-6 pb-4 mb-2"> <SheetTitle className="text-white">Welcome {truncateUserName(displayName, usernameMaxLength + 4)}</SheetTitle> <SheetDescription className="text-gray-400">Manage account</SheetDescription> </SheetHeader> <div className="relative flex-grow px-4 py-2 overflow-y-auto"> <div className="absolute left-0 w-[3px] bg-white rounded-r-md transition-all duration-300 ease-out pointer-events-none" style={activeStyle} /> <div className="flex flex-col space-y-1"> {sheetTabs.map((tab, index) => { const TabIcon = tab.icon; return ( <div key={tab.label} ref={(el) => (tabRefs.current[index] = el)} className={cn( "flex items-center w-full px-4 py-4 cursor-pointer transition-all duration-200 rounded-md", "hover:bg-[#ffffff1a]", index === activeIndex ? "text-white bg-[#ffffff14]" : "text-gray-400 hover:text-gray-100" )} onClick={() => { setActiveIndex(index); tab.action(); }}> <TabIcon className="mr-3 h-4 w-4" /> <span className="text-sm font-medium whitespace-nowrap">{tab.label}</span> </div> ); })} </div> </div> <div className="mt-auto p-6 border-t border-[#2a2d36]"> <Button variant="destructive" className="w-full flex items-center justify-center gap-2 py-6" onClick={handleLogout}> <LogOut className="h-4 w-4" /> Logout </Button> </div> </SheetContent> </Sheet>
            ) : (
                 // Logged Out: Login Button
                 <TooltipProvider><Tooltip><TooltipTrigger asChild> <Button variant="ghost" size={isMobile ? "icon" : "sm"} className="text-gray-300 hover:text-white hover:bg-[#4752c4] p-3" onClick={handleLoginOpen}> <LogIn className="h-4 w-4" /> {!isMobile && <span className="ml-2 text-sm">Login</span>} <span className="sr-only">Login</span> </Button> </TooltipTrigger><TooltipContent side="bottom"><p>Login/Sign Up</p></TooltipContent></Tooltip></TooltipProvider>
            )}
        </div>
      </div>
      {/* Modals rendered globally in App.tsx now */}
      <ProfileIndex open={ProfileIndexOpen} onOpenChange={setProfileIndexOpen} />
    </header>
  );
}