// src/pages/order/checkout/order-summary.tsx
import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, AlertCircle, Loader2 } from "lucide-react"; // Removed Check
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ProfilePreviewButton from "@/pages/Profile/ProfilePreviewButton";
import { useCart } from "@/context/CartContext";
import OrderSuccessConfirmation from "@/pages/order/checkout/OrderSuccessConfirmation";
import { createServerOrder, UserProfile as OrderUtilsUserProfile } from "@/pages/order/checkout/orderUtils";
import { useAuth } from "@/context/AuthContext";
import { useDiscount } from "@/context/DiscountContext";
import DiscountCodeInput from "@/pages/order/checkout/Discount/DiscountCodeInput";
import { useLoading } from "@/context/LoadingContext";
import LoadingScreen from "@/components/global/LoadingScreen";
import { formatDiscountInfo } from '@/pages/order/formatDiscountInfo';
import { useUserProfileQuery, useUpdateProfileMutation } from '@/components/global/hooks/useUserProfileData';
import { formatCurrencyWithSeparator } from "@/lib/currencyFormat";

export default function OrderSummary() {
    const navigate = useNavigate();
    const location = useLocation();
    const { data: userProfileData, isLoading: isProfileLoading, isFetching: isProfileFetching /*, isError: isProfileError */ } = useUserProfileQuery(); // isError might be unused
    const { mutate: updateProfileMutation } = useUpdateProfileMutation();
    const { user } = useAuth();
    const { cartItems, cartSubtotal, cartTotal, clearCart } = useCart();
    const { discountCode, discountRate, discountType, calculatedDiscountAmount, removeDiscount } = useDiscount();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [orderId, setOrderId] = useState("");
    const { loadingMessage, isLoading: isGlobalLoading, setIsLoading: setIsGlobalLoading, setLoadingMessage } = useLoading();
    const profileSectionRef = useRef<HTMLDivElement>(null);

    // --- Effects ---
    useEffect(() => { window.scrollTo({ top: 0, behavior: "auto" }); }, []); // Use auto on mount
    useEffect(() => { /* ... unchanged auto-populate email logic ... */
        if (user && userProfileData && !userProfileData.email && user.email && userProfileData.profileDocId) {
            console.log("[OrderSummary] Profile email missing, attempting to update from auth email.");
            toast.info("Updating profile with your login email...");
            updateProfileMutation({ documentId: userProfileData.profileDocId, data: { email: user.email } },
                { onSuccess: () => { toast.success("Profile email updated from login email."); }, onError: (error) => { console.error("[OrderSummary] Failed to auto-update profile email:", error); toast.error("Failed to auto-update profile email."); } }
            );
        }
     }, [user, userProfileData, updateProfileMutation]);
    useEffect(() => { document.title = "[GNT] Order Summary"; }, []);
    useEffect(() => { /* ... unchanged sessionStorage check logic ... */
        const shouldShowConfirmation = sessionStorage.getItem("showOrderConfirmation") === "true"; const refreshedOrderId = sessionStorage.getItem("lastOrderId"); const shouldClearCart = sessionStorage.getItem("clearCartAfterOrder") === "true";
        if (shouldClearCart) { console.log("[OrderSummary] clearCartAfterOrder flag found, clearing cart."); clearCart(); sessionStorage.removeItem("clearCartAfterOrder"); }
        if (shouldShowConfirmation && refreshedOrderId) { setOrderId(refreshedOrderId); setShowConfirmation(true); setIsGlobalLoading(false); }
    }, [clearCart, setIsGlobalLoading]); // Removed location dependency if not needed

    // --- Computed Values ---
    const isProfileFetchComplete = !isProfileLoading && !isProfileFetching;
    const isProfileCompleteForSubmit = Boolean(userProfileData?.name && userProfileData?.email && userProfileData?.phone && userProfileData?.address?.line1 && userProfileData?.address?.city && userProfileData?.address?.state && userProfileData?.address?.zip && userProfileData?.address?.country);


    // --- Handlers ---
    const handlePlaceOrder = async () => {
        if (!user) { toast.error("Authentication required"); navigate("/login", { state: { from: location.pathname } }); return; }
        if (isProfileFetchComplete && !isProfileCompleteForSubmit) { toast.error("Profile information incomplete", { description: "Please complete your profile before placing the order." }); profileSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
        if (!isProfileFetchComplete && !userProfileData) { toast.info("Please wait, loading profile information..."); return; }
        if (isProfileFetchComplete && !userProfileData?.profileDocId) { toast.error("Profile Error", { description: "Could not find profile ID. Please refresh or contact support." }); return; }
        if (cartItems.length === 0) { toast.error("Your cart is empty"); return; }

        setIsSubmitting(true); setLoadingMessage("Processing your order..."); setIsGlobalLoading(true);

        try {
            const profileForOrder: OrderUtilsUserProfile = {
                id: userProfileData?.profileDocId!, name: userProfileData?.name!, email: userProfileData?.email!, phone: userProfileData?.phone!,
                address: { line1: userProfileData?.address?.line1!, line2: userProfileData?.address?.line2 || "", city: userProfileData?.address?.city!, state: userProfileData?.address?.state!, zip: userProfileData?.address?.zip!, country: userProfileData?.address?.country!, },
            };
            const newOrderId = await createServerOrder(user.$id, cartItems, profileForOrder, discountCode);
            sessionStorage.setItem("lastOrderId", newOrderId); sessionStorage.setItem("showOrderConfirmation", "true"); sessionStorage.setItem("cartBeforeOrder", JSON.stringify(cartItems)); sessionStorage.setItem("clearCartAfterOrder", "true");
            removeDiscount(); // Reset discount state
            await clearCart(); // Clear cart state
            setOrderId(newOrderId); setShowConfirmation(true);
        } catch (error) {
            console.error("Error placing order:", error); setIsSubmitting(false); setIsGlobalLoading(false);
            // ... more detailed error handling ...
            let errorMessage = "An unknown error occurred."; if (error instanceof Error) { errorMessage = error.message; } else if (typeof error === 'string') { errorMessage = error; }
            const discountLimitPatterns = [ "User has reached usage limit for this discount code", "reached usage limit", "discount code limit", "usage limit"]; const isDiscountLimitError = discountLimitPatterns.some(pattern => errorMessage.toLowerCase().includes(pattern.toLowerCase()));
            if (isDiscountLimitError) { toast.error("Discount code limit reached"); } else { toast.error("Failed to place order", { description: errorMessage }); }
        } finally {
            if (!showConfirmation) { setIsSubmitting(false); setIsGlobalLoading(false); } // Ensure loading stops if confirmation not shown
        }
    };

    const handleConfirmationClose = () => { /* ... unchanged ... */
        sessionStorage.removeItem("showOrderConfirmation"); sessionStorage.removeItem("lastOrderId"); sessionStorage.removeItem("cartBeforeOrder"); sessionStorage.removeItem("clearCartAfterOrder");
        removeDiscount(); clearCart(); setShowConfirmation(false); navigate("/order-history");
    };

    const reversedCartItems = [...cartItems].reverse();

    // --- Render ---
    return (
        <div className="min-h-screen bg-[#0f1115] text-white">
            {/* Modals / Overlays */}
            {showConfirmation && ( <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"><OrderSuccessConfirmation orderId={orderId} onClose={handleConfirmationClose} isModal={true} /></div> )}
            {isGlobalLoading && !showConfirmation && <LoadingScreen message={loadingMessage || "Processing..."} />} {/* Show global loading only if not showing confirmation */}

            <main className={`container mx-auto px-4 py-8 ${showConfirmation || isGlobalLoading ? 'blur-sm pointer-events-none' : ''}`}>
                {/* Checkout Steps */}
                <div className="mb-8"> <div className="flex items-center justify-center"> <div className="flex items-center"><div className="h-8 w-8 rounded-full bg-[#5865f2] flex items-center justify-center"><span className="text-sm font-bold">1</span></div><div className="ml-2 text-sm font-medium">Cart Details</div></div><div className="mx-4 h-1 w-16 bg-[#5865f2]"></div><div className="flex items-center"><div className="h-8 w-8 rounded-full bg-[#5865f2] flex items-center justify-center"><span className="text-sm font-bold">2</span></div><div className="ml-2 text-sm font-medium">Order Summary</div></div> </div> </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Left Column: Items & Profile */}
                    <div className="lg:w-2/3">
                        <h1 className="text-2xl font-bold mb-6 text-white">Order Summary</h1>
                        <div className="mb-4 text-sm text-gray-400">{`Cart Items: ${cartItems.length}`}</div>

                        {/* Items Summary Card */}
                        <div className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg p-4 sm:p-6 mb-6">
                            <h2 className="text-lg sm:text-xl font-semibold mb-4 text-white">Items</h2>
                            <div className="space-y-3 max-h-60 overflow-y-auto pr-2 mb-4"> {/* Added max-height & scroll */}
                                {reversedCartItems.map((item) => (
                                    <div key={item.id} className="flex justify-between items-center text-sm sm:text-base">
                                        <div className="flex-1 min-w-0 mr-4"> <span className="font-medium line-clamp-2 block text-gray-200">{item.title}</span> <span className="text-gray-400 text-xs sm:text-sm">x{item.quantity}</span> </div>
                                        <span className="font-medium whitespace-nowrap text-gray-200">{formatCurrencyWithSeparator(item.discount_price * item.quantity)}</span>
                                    </div>
                                ))}
                            </div>
                            {/* Totals Section */}
                            <div className="border-t border-[#2a2d36] pt-4 space-y-2 text-sm sm:text-base">
                                <div className="flex justify-between"><span className="text-gray-400">Subtotal</span><span className="text-gray-200">{formatCurrencyWithSeparator(cartSubtotal)}</span></div>
                                {discountCode ? ( <div className="flex justify-between items-center"><div className="flex items-center flex-wrap gap-x-1"><span className="text-gray-400">Discount</span><span className="text-emerald-400 text-xs sm:text-sm bg-emerald-900/50 px-1.5 py-0.5 rounded whitespace-nowrap">{discountCode} {formatDiscountInfo(discountType, discountRate)}</span></div><span className="text-emerald-400 font-medium">-{formatCurrencyWithSeparator(calculatedDiscountAmount)}</span></div> )
                                : ( <DiscountCodeInput subtotal={cartSubtotal} /> )}
                                <div className="flex justify-between font-bold text-base sm:text-lg text-white"><span>Total</span><span>{formatCurrencyWithSeparator(cartTotal)}</span></div>
                            </div>
                        </div>

                        {/* Contact Info Card */}
                        <div ref={profileSectionRef} className={`bg-[#1a1c23] border rounded-lg p-4 sm:p-6 transition-colors mb-6 border-[#2a2d36]`}>
                <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center text-white">Contact & Shipping Information</h2>
                <p className="text-sm text-gray-400 mb-4">Ensure your details below are correct for order updates and shipping.</p>  
                
                            <ProfilePreviewButton />
                        </div>

                        {/* Back Link */}
                        <div className="mt-6"> <Link to="/checkout/cart-details" className="inline-flex items-center text-sm text-gray-400 hover:text-white transition-colors"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Cart</Link> </div>
                    </div>

                    {/* Order Placement Sidebar */}
                    <div className="lg:w-1/3">
                        {/* --- FIX: Changed top-8 to top-20, added max-height and overflow --- */}
                         {/* Adjust top-20 (5rem) and bottom padding (2rem) if needed */}
                        <div className="sticky top-20 max-h-[calc(100vh-5rem-2rem)] overflow-y-auto bg-[#1a1c23] border border-[#2a2d36] rounded-lg p-6">
                            <h2 className="text-lg sm:text-xl font-semibold mb-4 text-white">Complete Your Order</h2>
                            <p className="text-sm text-gray-400 mb-6">Review your order details and contact information.</p>
                            <Button
                                className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white py-3 text-base sm:py-4 sm:text-lg font-semibold transition-colors"
                                onClick={handlePlaceOrder}
                                disabled={cartItems.length === 0 || isSubmitting || isProfileLoading || isProfileFetching} // Disable also while profile is fetching
                            >
                                {isSubmitting ? ( <><Loader2 className="animate-spin h-5 w-5 mr-2" /> Processing...</> ) : ( "Place Order" )}
                            </Button>
                            <p className="text-xs text-gray-500 mt-4 text-center">By placing your order, you agree to our Terms of Service and Privacy Policy.</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}