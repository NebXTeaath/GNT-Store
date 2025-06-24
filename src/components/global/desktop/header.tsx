// src/components/global/desktop/header.tsx
import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag, ChevronDown, Gamepad2, Cpu, Wrench, User, History, LogIn, Heart, MessageSquareDot, Menu, LogOut, DownloadCloud, MonitorCog, Package, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/assets/logo.svg"; // Ensure path is correct
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { SearchBar } from "./search-bar";
import { useEffect, useState, useRef } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
// import { toast } from "sonner"; // Removed as it's not used in this file after recent changes
import { useWindowSize } from "@/components/global/hooks/useWindowSize";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/components/global/Mobile/use-mobile";
import LoginModal from "@/components/pages/Login/LoginModal";
import { useLoading } from "@/components/global/Loading/LoadingContext";
import { ProfileIndex } from "@/components/global/Profile/components/ProfileIndex";
import { OffersPopover } from "@/components/global/OffersPopover";
import { useProductCategories, ProductCategoriesStructure } from '@/components/global/hooks/useProductCategories'; // Corrected import path
import { CachedImage } from '@/components/global/cached-image'; // Corrected import path

export default function Header() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { isAuthenticated, user, signOut, isLoadingAuth } = useAuth();
  const { cartCount } = useCart();
  const { wishlistItems } = useWishlist();
  const windowSize = useWindowSize();
  const { setIsLoading, setIsLoadingProfile, setIsLoadingProducts, setIsLoadingAuth: setGlobalIsLoadingAuth, setLoadingMessage } = useLoading();

  const [loginOpen, setLoginOpen] = useState(false);
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);
  const [catalogSheetOpen, setCatalogSheetOpen] = useState(false);
  const [ProfileIndexOpen, setProfileIndexOpen] = useState(false);

  const {
    data: productCategories,
    isLoading: categoriesLoading,
    isError: categoriesError,
  } = useProductCategories();

  const [openDesktopCategoryAccordions, setOpenDesktopCategoryAccordions] = useState<string[]>([]);
  const [openDesktopSubCategoryAccordions, setOpenDesktopSubCategoryAccordions] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (productCategories && productCategories.categories) {
      console.log("[Header] productCategories loaded:", productCategories);
      // MODIFICATION: Map over the array to get category names
      const categoryNames = productCategories.categories.map(cat => cat.name);
      setOpenDesktopCategoryAccordions(categoryNames);
      
      // Keep sub-category accordions closed by default. They open on user click.
      setOpenDesktopSubCategoryAccordions({});
     }
    if (categoriesError) {
      console.error("[Header] Error state from useQuery for categories:", categoriesError);
    }
  }, [productCategories, categoriesError]);


  const [activeIndex, setActiveIndex] = useState(0);
  const [activeStyle, setActiveStyle] = useState({ top: "0px", height: "0px" });
  const tabRefs = useRef<(HTMLDivElement | HTMLButtonElement | null)[]>([]);

  const formattedCartCount = cartCount > 9 ? "9+" : cartCount.toString();
  const wishlistCount = wishlistItems.length;

  const handleLogout = async () => {
    try {
      await signOut();
      setAccountSheetOpen(false);
    } catch (error) {
      console.error("Logout initiation failed in header:", error);
    }
  };

  const navigateWithLoading = (path: string, message: string, loadingSetter: (loading: boolean) => void) => {
    setLoadingMessage(message);
    loadingSetter(true);
    setAccountSheetOpen(false);
    setCatalogSheetOpen(false);
    setLoginOpen(false);

    setTimeout(() => {
      navigate(path);
      loadingSetter(false);
      setLoadingMessage("");
    }, 300);
  };

  const handleCartNavigation = () => {
    navigateWithLoading('/checkout/cart-details', 'Loading your cart...', setIsLoading);
  };

  const handleWishlistNavigation = () => {
    navigateWithLoading('/wishlist', 'Loading your wishlist...', setIsLoading);
  };

  const handleLoginOpen = () => {
    setLoadingMessage("Preparing login...");
    setGlobalIsLoadingAuth(true);
    setTimeout(() => {
      setGlobalIsLoadingAuth(false);
      setLoginOpen(true);
    }, 300);
  };

  const handleOpenProfile = () => {
    navigateWithLoading('#', 'Loading your profile...', setIsLoadingProfile);
    setAccountSheetOpen(false);
    setTimeout(() => {
      setProfileIndexOpen(true);
    }, 350);
  };

  const displayName = user?.user_metadata?.name || user?.email || "";

  const truncateUserName = (name: string, maxLength: number = 12) => {
    if (name && name.length > maxLength) {
      return `${name.substring(0, maxLength)}...`;
    }
    return name;
  };

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
          requestAnimationFrame(checkRefs);
        }
      };
      requestAnimationFrame(checkRefs);
    }
  }, [accountSheetOpen, activeIndex]);

  const sheetTabs = [
    { label: "Profile", action: handleOpenProfile, icon: User },
    { label: "Wishlist", action: () => navigateWithLoading('/wishlist', 'Loading your wishlist...', setIsLoading), icon: Heart },
    { label: "Orders", action: () => navigateWithLoading('/order-history', 'Loading your orders...', setIsLoading), icon: History },
    { label: "Repairs", action: () => navigateWithLoading('/repair/history', 'Loading your repairs...', setIsLoading), icon: Wrench },
  ];

  const getSearchBarSize = () => {
    if (!windowSize.width) return "medium";
    if (windowSize.width < 1280) return "x-small";
    if (windowSize.width < 1300) return "small";
    if (windowSize.width < 1540) return "medium";
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

        <div
          className={cn("flex items-center", isMobile ? "justify-center flex-1" : "justify-start md:flex-none md:mr-4")}
        >
          <Link
            to="/"
            className="flex items-center gap-2"
            onClick={(e) => { e.preventDefault(); navigateWithLoading("/", "Loading home page...", setIsLoading); }}
          >
            <div className={cn("relative", isMobile ? "w-12 h-12" : "w-14 h-14")}>
              <img
                src={Logo || "/placeholder.svg"}
                alt="GNT Logo"
                className={cn("absolute inset-0 w-full h-full object-contain transition-transform duration-300 ease-in-out", isMobile ? "transform scale-[2.5] origin-center" : windowSize.width >= 1540 ? "transform scale-[3] origin-left" : "transform scale-[1.8] origin-left")}
                width={40}
                height={40}
                loading="eager"
              />
            </div>
            <span className="sr-only">GNT - Games & Tech</span>
          </Link>
        </div>

        <div className="hidden md:flex items-center gap-2 lg:gap-4 xl:gap-6 flex-1 justify-center">
          <Sheet open={catalogSheetOpen} onOpenChange={setCatalogSheetOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="min-w-[60px] flex items-center gap-1 bg-[#1a1c23] text-gray-300 hover:text-white border-[#2a2d36] hover:bg-[#2a2d36] hover:border-[#5865f2] transition-all duration-200 ease-in-out"
              >
                Shop <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-full sm:max-w-md bg-[#1a1c23] border-[#2a2d36] text-white flex flex-col">
              <div className="flex-1 overflow-y-auto dark-theme-scrollbar">
              <SheetHeader>
                <SheetTitle className="text-white">Shop Catalog</SheetTitle>
                <SheetDescription className="text-gray-400">Browse our product categories</SheetDescription>
              </SheetHeader>
              <Separator className="my-4 bg-[#2a2d36]" />
              {categoriesLoading ? (
                <div className="space-y-4 px-6 py-4">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full bg-[#2a2d36]" />)}
                </div>
              ) : (
                <div className="px-6 py-4">
                  {productCategories && productCategories.categories.length > 0 ? (
                    <Accordion 
                      type="multiple" 
                      className="space-y-4"
                      value={openDesktopCategoryAccordions}
                      onValueChange={setOpenDesktopCategoryAccordions}
                    >
                      {/* MODIFICATION: Loop through the new array structure */}
                      {productCategories.categories.map((categoryItem, index) => (
                        <AccordionItem key={categoryItem.name} value={categoryItem.name} className="border-[#2a2d36]">
                          <AccordionTrigger className="hover:no-underline p-1 text-lg font-semibold text-white hover:text-[#5865f2]">
                            <div className="flex items-center gap-2">
                              {categoryItem.name === "Consoles" ? <Gamepad2 className="h-5 w-5" /> : categoryItem.name === "Computers" ? <Cpu className="h-5 w-5" /> : null}
                              {categoryItem.name}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="ml-6 space-y-3 pt-2"> 
                            <Accordion 
                              type="multiple" 
                              className="space-y-2"
                              value={openDesktopSubCategoryAccordions[categoryItem.name] || []}
                              onValueChange={(values) => {
                                setOpenDesktopSubCategoryAccordions(prev => ({ ...prev, [categoryItem.name]: values }));
                              }}
                            >
                              {/* MODIFICATION: Loop through the subcategories array */}
                              {categoryItem.subcategories.map((subcategoryItem) => (
                                <AccordionItem key={subcategoryItem.name} value={subcategoryItem.name} className="border-[#2a2d36]">
                                  <AccordionTrigger className="hover:no-underline p-1 text-base font-medium text-gray-300 hover:text-[#5865f2]">
                                    {subcategoryItem.name}
                                  </AccordionTrigger>
                                  <AccordionContent className="pt-2">
                                    {/* MODIFICATION: Access labels from subcategoryItem.data */}
                                    {subcategoryItem.data.labels.length > 0 && (
                                      <div className="ml-4 mt-2 grid grid-cols-2 gap-4">
                                        {subcategoryItem.data.labels.map((labelItem) => (
                                          <div
                                            key={labelItem.name}
                                            onClick={() => navigateWithLoading(`/${categoryItem.name}/${subcategoryItem.name}?label=${encodeURIComponent(labelItem.name)}`, `Loading ${labelItem.name}...`, setIsLoadingProducts)}
                                            className="flex flex-col items-center text-center p-2 rounded-md hover:bg-[#2a2f3a] transition-colors cursor-pointer group"
                                          >
                                            <CachedImage
                                              src={labelItem.display_url}
                                              alt={labelItem.name}
                                              className="w-16 h-16 mb-2 rounded-md bg-[#2a2d36] border border-transparent group-hover:border-[#5865f2] transition-all duration-200"
                                              imgClassName="w-full h-full object-contain"
                                              placeholderSrc="https://images.gnt-store.shop/favicon.ico"
                                              queryKeySuffix={`header-catalog-icon-${labelItem.name}`}
                                            />
                                            <span className="text-xs text-gray-300 group-hover:text-white transition-colors">
                                              {labelItem.name}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </AccordionContent>
                                </AccordionItem>
                              ))}
                            </Accordion>
                            {index < productCategories.categories.length - 1 && <Separator className="my-4 bg-[#2a2d36]" />}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-300">No categories available</div>
                  )}
                </div> 
              )}
              </div>
            </SheetContent>
          </Sheet>

          <SearchBar className="w-full" size={searchBarSize} />

                    <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn("flex items-center justify-center gap-1 bg-[#1a1c23] text-sm whitespace-nowrap text-gray-300 hover:text-white border border-[#2a2d36] hover:bg-[#2a2d36] hover:border-[#5865f2] transition-all duration-200 ease-in-out cursor-pointer", windowSize.width && windowSize.width < 960 ? "min-w-[75px]" : "min-w-[75px]")}
              >
                
                Services
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#1a1c23] border-[#2a2d36] text-white">
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => navigateWithLoading('/repair-home', 'Loading Repair Services...', setIsLoading)}
              >
                <Wrench className="mr-2 h-4 w-4" />
                <span>Repair Services</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => navigateWithLoading('/game-load-service', 'Loading Game Load Service...', setIsLoading)}
              >
                <DownloadCloud className="mr-2 h-4 w-4" />
                <span>Game Load Service</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => navigateWithLoading('/product-discount-request', 'Loading Discount Request Service...', setIsLoading)}
                    >
                        <Tag className="mr-2 h-4 w-4" />
                        <span>Product Discount Request</span>
                    </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2 lg:gap-4 justify-end md:w-auto w-1/4">
          <div className="hidden md:block">
            <OffersPopover />
          </div>
          
          <div className="hidden md:block">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-gray-300 hover:text-white hover:bg-[#4752c4] p-2" 
                    onClick={() => navigateWithLoading('/support', 'Loading support...', setIsLoading)}
                  >
                    <MessageSquareDot className="h-4 w-4" />
                    <span className="sr-only">Support</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Get Support</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {isAuthenticated && (
            <div className="relative">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-gray-300 hover:text-white hover:bg-[#4752c4] p-2" 
                      onClick={handleWishlistNavigation}
                    >
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
                </Tooltip>
              </TooltipProvider>
            </div>
          )}

          {isAuthenticated && (!isMobile && (
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
          ))}

          {isLoadingAuth ? (
            <Skeleton className={cn("rounded-md", isMobile || !showUsername ? "w-10 h-10" : "w-28 h-8")} />
          ) : isAuthenticated && user ? (
            <Sheet open={accountSheetOpen} onOpenChange={setAccountSheetOpen}>
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
              <SheetContent side="right" className="bg-[#1a1c23] border-l border-[#2a2d36] text-white flex flex-col h-full p-0">
                <SheetHeader className="px-6 pt-6 pb-4 mb-2">
                  <SheetTitle className="text-white">Welcome {truncateUserName(displayName, usernameMaxLength + 4)}</SheetTitle>
                  <SheetDescription className="text-gray-400">Manage your account and preferences</SheetDescription>
                </SheetHeader>
                <div className="relative flex-grow px-4 py-2 overflow-y-auto">
                  <div className="absolute left-0 w-[3px] bg-white rounded-r-md transition-all duration-300 ease-out pointer-events-none" style={activeStyle} />
                  <div className="flex flex-col space-y-1">
                      {/* Profile Section */}
                      <div
                        ref={(el) => (tabRefs.current[0] = el)}
                        className="flex items-center w-full px-4 py-4 cursor-pointer transition-all duration-200 rounded-md hover:bg-[#ffffff1a] text-gray-400 hover:text-gray-100"
                        onClick={() => { setActiveIndex(0); handleOpenProfile(); }}
                      >
                        <User className="mr-3 h-4 w-4" />
                        <span className="text-sm font-medium whitespace-nowrap">Profile</span>
                      </div>

                      {/* Wishlist Section */}
                      <div
                        ref={(el) => (tabRefs.current[1] = el)}
                        className="flex items-center w-full px-4 py-4 cursor-pointer transition-all duration-200 rounded-md hover:bg-[#ffffff1a] text-gray-400 hover:text-gray-100"
                        onClick={() => { setActiveIndex(1); navigateWithLoading('/wishlist', 'Loading your wishlist...', setIsLoading); }}
                      >
                        <Heart className="mr-3 h-4 w-4" />
                        <span className="text-sm font-medium whitespace-nowrap">Wishlist</span>
                      </div>

                      {/* Consolidated History Section */}
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="order-service-history" className="border-b-0">
                          <AccordionTrigger
                            ref={(el) => (tabRefs.current[2] = el)}
                            className="flex items-center w-full px-4 py-4 cursor-pointer transition-all duration-200 rounded-md hover:bg-[#ffffff1a] text-gray-400 hover:text-gray-100 hover:no-underline"
                            onClick={() => setActiveIndex(2)}
                          >
                            <div className="flex items-center">
                                <History className="mr-3 h-4 w-4" />
                                <span className="text-sm font-medium whitespace-nowrap">Order & Service History</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pl-10 pr-2 pb-2 space-y-2">
                            {/* Product Orders */}
                            <Button
                              variant="ghost"
                              className="w-full justify-start text-gray-300 hover:text-gray-100 hover:bg-[#ffffff1a]"
                              onClick={() => navigateWithLoading('/order-history', 'Loading your orders...', setIsLoading)}
                            >
                              <Package className="mr-2 h-4 w-4" />
                              Product Orders
                            </Button>
                            
                            {/* Repair Services */}
                            <Button
                              variant="ghost"
                              className="w-full justify-start text-gray-300 hover:text-gray-100 hover:bg-[#ffffff1a]"
                              onClick={() => navigateWithLoading('/repair/history', 'Loading your repairs...', setIsLoading)}
                            >
                              <Wrench className="mr-2 h-4 w-4" />
                              Repair History
                            </Button>
                            
                            {/* Game Load Services */}
                            <Button
                              variant="ghost"
                              className="w-full justify-start text-gray-300 hover:text-gray-100 hover:bg-[#ffffff1a]"
                              onClick={() => navigateWithLoading('/game-load/history', 'Loading game load history...', setIsLoading)}
                            >
                              <DownloadCloud className="mr-2 h-4 w-4" />
                              Game(s) Load History
                            </Button>
                            {/* Game Load Services */}
                            <Button
                              variant="ghost"
                              className="w-full justify-start text-gray-300 hover:text-gray-100 hover:bg-[#ffffff1a]"
                              onClick={() => navigateWithLoading('/product-discount-request/history', 'Loading product discount history...', setIsLoading)}
                            >
                              <Tag className="mr-2 h-4 w-4" />
                              Product Discount History
                            </Button>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size={isMobile ? "icon" : "sm"} 
                    className="text-gray-300 hover:text-white hover:bg-[#4752c4] p-3" 
                    onClick={handleLoginOpen}
                  >
                    <LogIn className="h-4 w-4" />
                    {!isMobile && <span className="ml-2 text-sm">Login</span>}
                    <span className="sr-only">Login</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Login or Sign Up</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      <ProfileIndex open={ProfileIndexOpen} onOpenChange={setProfileIndexOpen} />
      <LoginModal 
        open={loginOpen} 
        onOpenChange={setLoginOpen} 
        onLoginSuccess={() => {
          setLoginOpen(false);
        }} 
      />
    </header>
  );
}