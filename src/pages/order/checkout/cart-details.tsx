// src/pages/checkout/cart-details.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, ArrowLeft, ArrowRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import LoginModal from "@/pages/Login/LoginModal";
import DiscountCodeInput from "@/pages/order/checkout/Discount/DiscountCodeInput";
import { CartDetailsSkeleton } from "./CartDetailsSkeleton";
import { Pagination } from "@/pages/searchPage/search/Pagination"; // Corrected import path assumption
import { formatCurrencyWithSeparator } from "@/lib/currencyFormat";

const ITEMS_PER_PAGE = 5;

export default function CartDetails() {
    const navigate = useNavigate();
    const { cartItems, updateQuantity, removeItem, cartSubtotal, /* cartDiscountAmount, */ cartTotal, isLoading } = useCart(); // cartDiscountAmount might be unused here, handled by context/DiscountInput
    const { isAuthenticated } = useAuth();
    const [loginModalOpen, setLoginModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    // --- Pagination ---
    const reversedCartItems = [...cartItems].reverse();
    const totalPages = Math.ceil(reversedCartItems.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentCartItems = reversedCartItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    // --- Handlers ---
    const proceedToSummary = () => {
        if (!isAuthenticated) { setLoginModalOpen(true); return; }
        navigate("/checkout/order-summary");
    };
    const continueShopping = () => { navigate("/"); };
    const decreaseQuantity = (e: React.MouseEvent, id: string, currentQuantity: number) => { e.stopPropagation(); if (currentQuantity > 1) { updateQuantity(id, currentQuantity - 1); } };
    const increaseQuantity = (e: React.MouseEvent, id: string, currentQuantity: number) => { e.stopPropagation(); if (currentQuantity < 99) { updateQuantity(id, currentQuantity + 1); } else { toast.error("Maximum quantity is 99", { id: "max-quantity-toast" }); } };
    const handlePageChange = (page: number) => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: "smooth" }); };

    // --- Effects ---
    useEffect(() => { window.scrollTo({ top: 0, behavior: "auto" }); }, []); // Use auto on mount
    useEffect(() => { if (currentPage > totalPages && totalPages > 0) { setCurrentPage(1); } }, [cartItems.length, currentPage, totalPages]); // Depend on length for stability
    useEffect(() => { document.title = "[GNT] Cart Details"; }, []);

    // --- Render ---
    if (isLoading) { return <CartDetailsSkeleton />; }

    return (
        <div className="min-h-screen bg-[#0f1115] text-white">
            <main className="container mx-auto px-4 py-8">
                {/* Checkout Steps */}
                <div className="mb-8"> <div className="flex items-center justify-center"> <div className="flex items-center"><div className="h-8 w-8 rounded-full bg-[#5865f2] flex items-center justify-center"><span className="text-sm font-bold">1</span></div><div className="ml-2 text-sm font-medium">Cart Details</div></div><div className="mx-4 h-1 w-16 bg-[#2a2d36]"><div className="h-1 w-full bg-[#5865f2]"></div>{/* Indicate step 1 complete */}</div><div className="flex items-center"><div className="h-8 w-8 rounded-full bg-[#2a2d36] flex items-center justify-center"><span className="text-sm font-bold">2</span></div><div className="ml-2 text-sm font-medium text-gray-400">Order Summary</div></div> </div> </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Cart Items Section */}
                    <div className="lg:w-2/3">
                        <h1 className="text-2xl font-bold mb-6">Your Cart</h1>
                        <div className="mb-4 text-sm text-gray-400">{`Cart Items: ${cartItems.length}`}</div>

                        {cartItems.length === 0 ? (
                            <div className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg p-8 text-center"> <h2 className="text-xl mb-4">Your cart is empty</h2> <p className="text-gray-400 mb-6">Add items to your cart to proceed with checkout.</p> <Button className="bg-[#5865f2] hover:bg-[#4752c4] text-white" onClick={continueShopping}>Browse Products</Button> </div>
                        ) : (
                            <>
                                <div className="space-y-4">
                                    {currentCartItems.map((item) => (
                                        <div key={item.id} onClick={() => navigate(`/product/${item.id}`)} className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg p-4 flex flex-col sm:flex-row items-center sm:items-start gap-4 cursor-pointer hover:border-[#5865f2] transition-colors duration-200">
                                            <div className="w-24 h-24 bg-[#2a2d36] rounded-md overflow-hidden flex-shrink-0"> <img src={item.image || "/placeholder.svg"} alt={item.title} className="w-full h-full object-cover" /> </div>
                                            <div className="flex-1 flex flex-col sm:flex-row justify-between items-center sm:items-start w-full">
                                                <div className="text-center sm:text-left mb-4 sm:mb-0 flex-grow mr-4"> <h3 className="font-medium text-lg line-clamp-2">{item.title}</h3> </div>
                                                <div className="flex flex-col sm:flex-row items-center gap-4 flex-shrink-0">
                                                    <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}> <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent border border-gray-600 hover:bg-[#2a2d36]" onClick={(e) => decreaseQuantity(e, item.id, item.quantity)} disabled={item.quantity <= 1}><Minus className="h-4 w-4" /></Button> <span className="w-8 text-center">{item.quantity}</span> <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent border border-gray-600 hover:bg-[#2a2d36]" onClick={(e) => increaseQuantity(e, item.id, item.quantity)} disabled={item.quantity >= 99}><Plus className="h-4 w-4" /></Button> </div>
                                                    <div className="font-medium text-right w-24" onClick={(e) => e.stopPropagation()}>{formatCurrencyWithSeparator(item.discount_price * item.quantity)}</div>
                                                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-500 hover:bg-transparent" onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}><Trash2 className="h-5 w-5" /></Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {/* Pagination */}
                                {totalPages > 1 && ( <div className="mt-6 flex justify-center"> <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} /> </div> )}
                            </>
                        )}
                        {/* Continue Shopping */}
                        <div className="mt-6"> <Button variant="link" className="text-gray-400 hover:text-white px-0" onClick={continueShopping}><ArrowLeft className="mr-2 h-4 w-4" /> Continue Shopping</Button> </div>
                    </div>

                    {/* Order Summary Section */}
                    <div className="lg:w-1/3 mt-8 lg:mt-0">
                        {/* --- FIX: Added sticky, top offset, max-height and overflow --- */}
                        {/* Adjust top-20 (5rem) and bottom padding (2rem) if needed */}
                        <div className="sticky top-20 max-h-[calc(100vh-5rem-2rem)] overflow-y-auto bg-[#1a1c23] border border-[#2a2d36] rounded-lg p-6">
                            <h2 className="text-xl font-bold mb-4">Order Summary</h2>
                            <div className="space-y-3 mb-6"> {/* Added mb-6 */}
                                <div className="flex justify-between"> <span className="text-gray-400">Subtotal</span> <span>{formatCurrencyWithSeparator(cartSubtotal)}</span> </div>
                                {/* Use DiscountCodeInput which handles its own display logic */}
                                <DiscountCodeInput subtotal={cartSubtotal} />
                                {/* Total is calculated within DiscountCodeInput context or useCart */}
                                <div className="pt-3 border-t border-[#2a2d36]"> <div className="flex justify-between font-bold text-lg"> {/* Increased size */} <span>Total</span> <span>{formatCurrencyWithSeparator(cartTotal)}</span> </div> </div>
                            </div>
                            <Button
                                className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white py-3 text-base font-semibold transition-colors" // Adjusted padding/size
                                onClick={proceedToSummary}
                                disabled={cartItems.length === 0}
                            >
                                Proceed to Checkout <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Login Modal */}
            <LoginModal
                open={loginModalOpen}
                onOpenChange={setLoginModalOpen}
                onLoginSuccess={proceedToSummary} // Proceed after successful login
            />
        </div>
    );
}