// src/pages/order/checkout/order-summary.tsx
import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ProfilePreviewButton from "@/pages/Profile/ProfilePreviewButton";
import { useCart } from "@/context/CartContext";
import OrderSuccessConfirmation from "@/pages/order/checkout/OrderSuccessConfirmation";
import { createServerOrder, UserProfile as OrderUtilsUserProfile } from "@/pages/order/checkout/orderUtils";
import { useAuth } from "@/context/AuthContext";
import { useDiscount } from "@/context/DiscountContext";
import DiscountCodeInput from "@/pages/order/checkout/Discount/DiscountCodeInput";
import { useLoading } from "@/components/global/Loading/LoadingContext";
import LoadingScreen from "@/components/global/Loading/LoadingScreen";
import { formatDiscountInfo } from '@/pages/order/formatDiscountInfo';
import { useUserProfileQuery, useUpdateProfileMutation } from '@/components/global/hooks/useUserProfileData';
import { formatCurrencyWithSeparator } from "@/lib/currencyFormat";

export default function OrderSummary() {
    console.log("--- OrderSummary Component Mount / Render ---");

    const navigate = useNavigate();
    const location = useLocation();
    const { data: userProfileData, isLoading: isProfileLoading, isFetching: isProfileFetching } = useUserProfileQuery();
    const { mutate: updateProfileMutation } = useUpdateProfileMutation();
    const { user } = useAuth();
    // Destructure clearCart separately for clarity in its use
    const { cartItems, cartSubtotal, cartTotal, clearCart: clearCartFromContext } = useCart();
    const { discountCode, discountRate, discountType, calculatedDiscountAmount, removeDiscount } = useDiscount();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [orderId, setOrderId] = useState("");
    const { loadingMessage, isLoading: isGlobalLoading, setIsLoading: setIsGlobalLoading, setLoadingMessage } = useLoading();
    const profileSectionRef = useRef<HTMLDivElement>(null);

    // --- Log Initial States ---
     console.log("Initial States:", { isProfileLoading, isProfileFetching, user: !!user, cartItemsLength: cartItems?.length, isSubmitting, showConfirmation, isGlobalLoading });
     console.log("Initial Profile Data:", userProfileData);


    // --- Effects ---
    useEffect(() => { window.scrollTo({ top: 0, behavior: "auto" }); }, []);

    // Auto-update profile email effect (Keep as is)
    useEffect(() => {
        if (user && userProfileData && !userProfileData.email && user.email) {
            console.log("[OrderSummary] Profile email missing, attempting update.");
            toast.info("Updating profile with your login email...");
            updateProfileMutation({ email: user.email }, {
                onSuccess: () => { toast.success("Profile email updated."); },
                onError: (error) => { console.error("Failed to auto-update profile email:", error); toast.error("Failed to auto-update profile email."); }
            });
        }
     }, [user, userProfileData, updateProfileMutation]);

    useEffect(() => { document.title = "[GNT] Order Summary"; }, []);

    // MODIFIED Effect to handle showing confirmation (but NOT clearing cart here)
    useEffect(() => {
        const shouldShowConfirmation = sessionStorage.getItem("showOrderConfirmation") === "true";
        const refreshedOrderId = sessionStorage.getItem("lastOrderId");
        // We still read the clearCart flag, but won't act on it here
        const shouldClearCartFlag = sessionStorage.getItem("clearCartAfterOrder") === "true";

        if (shouldShowConfirmation && refreshedOrderId) {
            console.log("[OrderSummary Effect] showOrderConfirmation flag found, showing confirmation.");
            setOrderId(refreshedOrderId);
            setShowConfirmation(true); // Set state to show the modal
            setIsGlobalLoading(false); // Ensure global loading stops

            // REMOVE cart clearing from here
            // if (shouldClearCartFlag) {
            //    console.log("[OrderSummary Effect] WILL CLEAR CART LATER in onClose handler.");
            // }

            // Clean up session flags immediately after deciding to show confirmation
            sessionStorage.removeItem("showOrderConfirmation");
            sessionStorage.removeItem("lastOrderId");
            // IMPORTANT: Keep the clearCartAfterOrder flag for the onClose handler
        } else {
             // If not showing confirmation, ensure any stray clear flag is removed
             if (shouldClearCartFlag) {
                 console.warn("[OrderSummary Effect] Found clearCartAfterOrder flag but not showing confirmation. Removing flag.");
                 sessionStorage.removeItem("clearCartAfterOrder");
             }
        }
    }, [setIsGlobalLoading]); // Removed clearCart dependency

    // --- Computed Values ---
    const isProfileFetchComplete = !isProfileLoading && !isProfileFetching;
    const isProfileCompleteForSubmit = Boolean(/* ... same checks ... */
        userProfileData?.name &&
        userProfileData?.email &&
        userProfileData?.phone &&
        userProfileData?.address?.line1 &&
        userProfileData?.address?.city &&
        userProfileData?.address?.state &&
        userProfileData?.address?.zip &&
        userProfileData?.address?.country
    );

    // --- Handlers ---
    const handlePlaceOrder = async () => {
        console.log("--- handlePlaceOrder triggered ---");
        // ... (Checks 1-3 remain the same: auth, profile, cart empty) ...
        if (!user) { toast.error("Authentication required"); navigate("/login", { state: { from: location.pathname } }); return; }
        if (!isProfileFetchComplete || !userProfileData) { toast.info("Loading profile..."); return; }
        if (!isProfileCompleteForSubmit) { toast.error("Profile incomplete"); profileSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
        if (!cartItems || cartItems.length === 0) { toast.error("Your cart is empty"); return; }

        // 4. Set Loading States
        setIsSubmitting(true);
        setLoadingMessage("Processing your order...");
        setIsGlobalLoading(true);

        try {
            // 5. Prepare Payload (Keep as is)
             if (!user || !userProfileData || !userProfileData.address) { throw new Error("User profile data is missing or incomplete."); }
            const profileForOrder: OrderUtilsUserProfile = { /* ... same mapping ... */
                id: user.id, name: userProfileData.name, email: userProfileData.email, phone: userProfileData.phone, address: { line1: userProfileData.address.line1, line2: userProfileData.address.line2 || "", city: userProfileData.address.city, state: userProfileData.address.state, zip: userProfileData.address.zip, country: userProfileData.address.country, },
            };

            // 6. Call Server Function (Keep as is)
            console.log("[handlePlaceOrder] Calling createServerOrder...");
            const newOrderId = await createServerOrder( cartItems, profileForOrder, discountCode );
            console.log("[handlePlaceOrder] createServerOrder successful, Order ID:", newOrderId);

            // 7. Handle Success - Set flags and state, but DO NOT clear cart yet
            sessionStorage.setItem("lastOrderId", newOrderId);
            sessionStorage.setItem("showOrderConfirmation", "true");
            sessionStorage.setItem("cartBeforeOrder", JSON.stringify(cartItems));
            sessionStorage.setItem("clearCartAfterOrder", "true"); // Set flag for onClose

            removeDiscount(); // Clear discount state

            setOrderId(newOrderId);
            setShowConfirmation(true); // Trigger confirmation modal render
            // Let the useEffect handle stopping global loading

        } catch (error) {
            // 8. Handle Errors (Keep as is)
            console.error("Error placing order:", error);
            setIsSubmitting(false);
            setIsGlobalLoading(false);
            let errorMessage = "An unknown error occurred.";
            if (error instanceof Error) errorMessage = error.message; else if (typeof error === 'string') errorMessage = error;
            const discountLimitPatterns = ["usage limit", "reached usage limit", "discount code limit"];
            const isDiscountLimitError = discountLimitPatterns.some(pattern => errorMessage.toLowerCase().includes(pattern.toLowerCase()));
            if (isDiscountLimitError) { toast.error("Discount Code Error", { description: errorMessage }); }
            else { toast.error("Failed to Place Order", { description: errorMessage }); }
        } finally {
             // Remove finally block or just keep setIsSubmitting(false) if needed *after* success state is set
             // setIsSubmitting(false); // Move inside catch, let success flow handle its state
        }
    };

    // MODIFIED Confirmation Close Handler
    const handleConfirmationClose = () => {
        console.log("[handleConfirmationClose] Closing confirmation modal.");

        // Check the flag *before* clearing
        const shouldClearCartFlag = sessionStorage.getItem("clearCartAfterOrder") === "true";
        if (shouldClearCartFlag) {
            console.log("[handleConfirmationClose] Flag found, clearing cart and discount.");
            clearCartFromContext(); // Call the actual clear cart function from context
            removeDiscount(); // Ensure discount is cleared again
        } else {
             console.warn("[handleConfirmationClose] clearCartAfterOrder flag NOT found. Cart not cleared.");
        }

        // Clean up all related session storage items
        sessionStorage.removeItem("showOrderConfirmation");
        sessionStorage.removeItem("lastOrderId");
        sessionStorage.removeItem("cartBeforeOrder");
        sessionStorage.removeItem("clearCartAfterOrder"); // Remove the flag regardless

        setShowConfirmation(false); // Hide the modal
        setIsSubmitting(false); // Ensure submitting state is reset
        navigate("/order-history"); // Navigate after cleanup
    };


    // Reverse items for display order if needed
    const reversedCartItems = useMemo(() => [...cartItems].reverse(), [cartItems]);

    // --- Render ---
    console.log("--- Rendering OrderSummary JSX ---", { showConfirmation, isGlobalLoading });

    return (
        <div className="min-h-screen bg-[#0f1115] text-white">
            {/* Modals / Overlays */}
            {showConfirmation && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-120 p-4">
                    {/* Pass the CORRECTED close handler */}
                    <OrderSuccessConfirmation orderId={orderId} onClose={handleConfirmationClose} isModal={true} />
                </div>
            )}
            {/* Loading Screen */}
            {isGlobalLoading && !showConfirmation && <LoadingScreen message={loadingMessage || "Processing..."} />}

            {/* Main Content */}
            <main className={`container mx-auto px-4 py-8 ${showConfirmation || (isGlobalLoading && !showConfirmation) ? 'blur-sm pointer-events-none' : ''}`}>
                {/* Checkout Steps */}
                 <div className="mb-8"> {/* ... Step indicator JSX ... */}
                     <div className="flex items-center justify-center"> <div className="flex items-center"><div className="h-8 w-8 rounded-full bg-[#5865f2] flex items-center justify-center"><span className="text-sm font-bold">1</span></div><div className="ml-2 text-sm font-medium">Cart Details</div></div><div className="mx-4 h-1 w-16 bg-[#5865f2]"></div><div className="flex items-center"><div className="h-8 w-8 rounded-full bg-[#5865f2] flex items-center justify-center"><span className="text-sm font-bold">2</span></div><div className="ml-2 text-sm font-medium">Order Summary</div></div> </div>
                 </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Left Column: Items & Profile */}
                    <div className="lg:w-2/3">
                        <h1 className="text-2xl font-bold mb-6 text-white">Order Summary</h1>
                        <div className="mb-4 text-sm text-gray-400">{`Cart Items: ${cartItems?.length ?? 0}`}</div>

                        {/* Items Summary Card */}
                        <div className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg p-4 sm:p-6 mb-6">
                             <h2 className="text-lg sm:text-xl font-semibold mb-4 text-white">Items</h2>
                             {/* ... Item list JSX ... */}
                             <div className="space-y-3 max-h-60 overflow-y-auto pr-2 mb-4"> {reversedCartItems.map((item) => ( <div key={item.id} className="flex justify-between items-center text-sm sm:text-base"> <div className="flex-1 min-w-0 mr-4"> <span className="font-medium line-clamp-2 block text-gray-200">{item.title}</span> <span className="text-gray-400 text-xs sm:text-sm">x{item.quantity}</span> </div> <span className="font-medium whitespace-nowrap text-gray-200"> {formatCurrencyWithSeparator(item.discount_price * item.quantity)} </span> </div> ))} {cartItems.length === 0 && ( <p className="text-center text-gray-400 py-4">Your cart is empty.</p> )} </div>
                             {/* Totals Section */}
                             {cartItems.length > 0 && ( <div className="border-t border-[#2a2d36] pt-4 space-y-2 text-sm sm:text-base"> <div className="flex justify-between"> <span className="text-gray-400">Subtotal</span> <span className="text-gray-200">{formatCurrencyWithSeparator(cartSubtotal)}</span> </div> {discountCode ? ( <div className="flex justify-between items-center"> <div className="flex items-center flex-wrap gap-x-1"> <span className="text-gray-400">Discount</span> <span className="text-emerald-400 text-xs sm:text-sm bg-emerald-900/50 px-1.5 py-0.5 rounded whitespace-nowrap"> {discountCode} {formatDiscountInfo(discountType, discountRate)} </span> </div> <span className="text-emerald-400 font-medium"> -{formatCurrencyWithSeparator(calculatedDiscountAmount)} </span> </div> ) : ( <DiscountCodeInput subtotal={cartSubtotal} /> )} <div className="flex justify-between font-bold text-base sm:text-lg text-white"> <span>Total</span> <span>{formatCurrencyWithSeparator(cartTotal)}</span> </div> </div> )}
                        </div>

                        {/* Contact Info Card */}
                        <div ref={profileSectionRef} className={`bg-[#1a1c23] border rounded-lg p-4 sm:p-6 transition-colors mb-6 border-[#2a2d36]`}>
                             <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center text-white">Contact & Shipping Information</h2>
                             <p className="text-sm text-gray-400 mb-4">Ensure your details below are correct for order updates and shipping.</p>
                             {/* ... Profile Loading/Display JSX ... */}
                             {(isProfileLoading || isProfileFetching) && !userProfileData && ( <div className="flex justify-center items-center p-6 text-gray-400"> <Loader2 className="animate-spin h-5 w-5 mr-2" /> Loading Profile... </div> )} {isProfileFetchComplete && userProfileData && ( <ProfilePreviewButton /> )} {isProfileFetchComplete && !userProfileData && ( <p className="text-red-400 text-center p-4">Could not load profile.</p> )}
                        </div>

                        {/* Back Link */}
                        <div className="mt-6">
                            <Link to="/checkout/cart-details" className="inline-flex items-center text-sm text-gray-400 hover:text-white transition-colors">
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Cart
                            </Link>
                        </div>
                    </div>

                    {/* Order Placement Sidebar */}
                    <div className="lg:w-1/3">
                        <div className="sticky top-20 max-h-[calc(100vh-5rem-2rem)] overflow-y-auto bg-[#1a1c23] border border-[#2a2d36] rounded-lg p-6">
                             <h2 className="text-lg sm:text-xl font-semibold mb-4 text-white">Complete Your Order</h2>
                             <p className="text-sm text-gray-400 mb-6">Review your order details and contact information.</p>
                             <Button className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white py-3 text-base sm:py-4 sm:text-lg font-semibold transition-colors" onClick={handlePlaceOrder} disabled={cartItems.length === 0 || isSubmitting || !isProfileFetchComplete || !isProfileCompleteForSubmit} > {isSubmitting ? ( <><Loader2 className="animate-spin h-5 w-5 mr-2" /> Processing...</> ) : ( "Place Order" )} </Button>
                             <p className="text-xs text-gray-500 mt-4 text-center">By placing your order, you agree to our Terms of Service and Privacy Policy.</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}