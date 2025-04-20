// src/pages/order/checkout/cart-details.tsx
import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom"; // Added Link
import { Minus, Plus, ArrowLeft, ArrowRight, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import DiscountCodeInput from "@/pages/order/checkout/Discount/DiscountCodeInput";
import { CartDetailsSkeleton } from "./CartDetailsSkeleton";
import { Pagination } from "@/pages/searchPage/search/Pagination";
import { formatCurrencyWithSeparator } from "@/lib/currencyFormat";
import SEO from '@/components/seo/SEO';

const ITEMS_PER_PAGE = 5;

export default function CartDetails() {
    const navigate = useNavigate();
    const location = useLocation();
    const siteUrl = window.location.origin;

    const { cartItems, updateQuantity, removeItem, cartSubtotal, cartTotal, isLoading: isCartLoading, refetchCart } = useCart();
    const { isAuthenticated, isLoadingAuth, openLoginModal } = useAuth();

    const [currentPage, setCurrentPage] = useState(1);

    // Authentication Check Effect
    useEffect(() => {
        if (isLoadingAuth) return;
        if (!isAuthenticated) {
            console.log('[CartDetails] Not authenticated, opening login modal.');
            openLoginModal(location.pathname + location.search);
        } else {
            refetchCart();
        }
    }, [isLoadingAuth, isAuthenticated, openLoginModal, location.pathname, location.search, refetchCart]);

    // Pagination
    const reversedCartItems = [...cartItems].reverse();
    const totalPages = Math.ceil(reversedCartItems.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentCartItems = reversedCartItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    // Handlers
    const proceedToSummary = () => {
        if (!isAuthenticated) { openLoginModal(location.pathname + location.search); return; }
        if (cartItems.length === 0) { toast.error("Cart is empty."); return; }
        navigate("/checkout/order-summary");
    };
    const continueShopping = () => { navigate("/"); };
    const decreaseQuantity = (e: React.MouseEvent, id: string, qty: number) => { e.stopPropagation(); if (qty > 1) updateQuantity(id, qty - 1); };
    const increaseQuantity = (e: React.MouseEvent, id: string, qty: number) => { e.stopPropagation(); if (qty < 99) updateQuantity(id, qty + 1); else toast.error("Max quantity 99"); };
    const handlePageChange = (page: number) => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: "smooth" }); };
    const navigateToProduct = (item: any) => { const path = item.slug ? `/product/${item.slug}` : `/product/${item.id}`; navigate(path); };

    // Effects
    useEffect(() => { window.scrollTo({ top: 0, behavior: "auto" }); }, []);
    useEffect(() => { if (currentPage > totalPages && totalPages > 0) setCurrentPage(1); }, [cartItems.length, currentPage, totalPages]);

    // SEO
    const pageTitle = "Shopping Cart | GNT Store";
    const pageDescription = "Review items in your shopping cart.";
    const canonicalUrl = `${siteUrl}${location.pathname}`;

    // Loading State
    if (isLoadingAuth || (isAuthenticated && isCartLoading)) {
        return <CartDetailsSkeleton />;
    }
    // Render null if modal/redirect is happening
    if (!isAuthenticated) {
        return null;
    }

    // Authenticated Render
    return (
        <div className="min-h-screen bg-[#0f1115] text-white">
             <SEO title={pageTitle} description={pageDescription} canonicalUrl={canonicalUrl} noIndex={true} ogData={{ title: pageTitle, description: pageDescription, url: canonicalUrl }} />
            <main className="container mx-auto px-4 py-8">
                {/* Steps */}
                <div className="mb-8"> <div className="flex items-center justify-center"> <div className="flex items-center"><div className="h-8 w-8 rounded-full bg-[#5865f2] flex items-center justify-center">1</div><div className="ml-2 text-sm">Cart</div></div><div className="mx-4 h-1 w-16 bg-[#2a2d36]"><div className="h-1 w-full bg-[#5865f2]"></div></div><div className="flex items-center"><div className="h-8 w-8 rounded-full bg-[#2a2d36] flex items-center justify-center">2</div><div className="ml-2 text-sm text-gray-400">Summary</div></div> </div> </div>
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Items */}
                    <div className="lg:w-2/3">
                        <h1 className="text-2xl font-bold mb-6">Your Cart</h1>
                        <div className="mb-4 text-sm text-gray-400">{`Items: ${cartItems.length}`}</div>
                        {cartItems.length === 0 ? ( <div className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg p-8 text-center"> <h2 className="text-xl mb-4">Cart is empty</h2> <Button className="bg-[#5865f2] hover:bg-[#4752c4]" onClick={continueShopping}>Browse</Button> </div> ) : (
                            <>
                                <div className="space-y-4">
                                    {currentCartItems.map((item) => (
                                         <div key={item.id} onClick={() => navigateToProduct(item)} className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg p-4 flex flex-col sm:flex-row items-center sm:items-start gap-4 cursor-pointer hover:border-[#5865f2]">
                                             <div className="w-24 h-24 bg-[#2a2d36] rounded-md overflow-hidden shrink-0"> <img src={item.image || "/placeholder.svg"} alt={item.title} className="w-full h-full object-cover" /> </div>
                                             <div className="flex-1 flex flex-col sm:flex-row justify-between items-center sm:items-start w-full">
                                                 <div className="text-center sm:text-left mb-4 sm:mb-0 grow mr-4"> <h3 className="font-medium text-lg line-clamp-2">{item.title}</h3> </div>
                                                 <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0">
                                                     <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}> <Button variant="outline" size="icon" className="h-8 w-8 border-gray-600 hover:bg-[#2a2d36]" onClick={(e) => decreaseQuantity(e, item.id, item.quantity)} disabled={item.quantity <= 1}><Minus className="h-4 w-4" /></Button> <span className="w-8 text-center">{item.quantity}</span> <Button variant="outline" size="icon" className="h-8 w-8 border-gray-600 hover:bg-[#2a2d36]" onClick={(e) => increaseQuantity(e, item.id, item.quantity)} disabled={item.quantity >= 99}><Plus className="h-4 w-4" /></Button> </div>
                                                     <div className="font-medium text-right w-24">{formatCurrencyWithSeparator(item.discount_price * item.quantity)}</div>
                                                     <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-500" onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}><Trash2 className="h-5 w-5" /></Button>
                                                 </div>
                                             </div>
                                         </div>
                                    ))}
                                </div>
                                {totalPages > 1 && ( <div className="mt-6 flex justify-center"> <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} /> </div> )}
                            </>
                        )}
                        <div className="mt-6"> <Button variant="link" className="text-gray-400 hover:text-white px-0" onClick={continueShopping}><ArrowLeft className="mr-2 h-4 w-4" /> Continue Shopping</Button> </div>
                    </div>
                    {/* Summary */}
                    <div className="lg:w-1/3 mt-8 lg:mt-0">
                        <div className="sticky top-20 max-h-[calc(100vh-5rem)] overflow-y-auto bg-[#1a1c23] border border-[#2a2d36] rounded-lg p-6">
                            <h2 className="text-xl font-bold mb-4">Order Summary</h2>
                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between"> <span className="text-gray-400">Subtotal</span> <span>{formatCurrencyWithSeparator(cartSubtotal)}</span> </div>
                                <DiscountCodeInput subtotal={cartSubtotal} />
                                <div className="pt-3 border-t border-[#2a2d36]"> <div className="flex justify-between font-bold text-lg"> <span>Total</span> <span>{formatCurrencyWithSeparator(cartTotal)}</span> </div> </div>
                            </div>
                            <Button className="w-full bg-[#5865f2] hover:bg-[#4752c4] py-3 text-base font-semibold" onClick={proceedToSummary} disabled={cartItems.length === 0}> Proceed to Checkout <ArrowRight className="ml-2 h-4 w-4" /> </Button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}