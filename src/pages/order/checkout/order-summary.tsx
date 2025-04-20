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
import SEO from '@/components/seo/SEO';

export default function OrderSummary() {
    const navigate = useNavigate();
    const location = useLocation();
    const siteUrl = window.location.origin;

    const { data: userProfileData, isLoading: isProfileLoading, isFetching: isProfileFetching, refetch: refetchProfile } = useUserProfileQuery();
    const { mutate: updateProfileMutation } = useUpdateProfileMutation();
    const { user, isAuthenticated, isLoadingAuth, openLoginModal } = useAuth(); // Get auth state/modal opener
    const { cartItems, cartSubtotal, cartTotal, clearCart: clearCartFromContext } = useCart();
    const { discountCode, discountRate, discountType, calculatedDiscountAmount, removeDiscount } = useDiscount();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [orderId, setOrderId] = useState("");
    const { loadingMessage, isLoading: isGlobalLoading, setIsLoading: setIsGlobalLoading, setLoadingMessage } = useLoading();
    const profileSectionRef = useRef<HTMLDivElement>(null);

    // --- Authentication Check Effect ---
    useEffect(() => {
        if (isLoadingAuth) return;

        if (!isAuthenticated) {
            console.log('[OrderSummary] Not authenticated, opening login modal.');
            openLoginModal(location.pathname + location.search);
        } else {
            // Refetch profile when confirmed authenticated
            refetchProfile();
        }
    }, [isLoadingAuth, isAuthenticated, openLoginModal, location.pathname, location.search, refetchProfile]);
    // --- End Authentication Check Effect ---

    // --- Other Effects ---
    useEffect(() => { window.scrollTo({ top: 0, behavior: "auto" }); }, []);
    useEffect(() => { /* Auto-update profile email if needed */ }, [user, userProfileData, updateProfileMutation]);
    useEffect(() => { document.title = "[GNT] Order Summary"; }, []);
    useEffect(() => { /* Handle showing confirmation from session storage */ }, [setIsGlobalLoading]);

    // --- Computed Values ---
    const isProfileFetchComplete = !isProfileLoading && !isProfileFetching;
    const isProfileCompleteForSubmit = Boolean( userProfileData?.name && userProfileData?.email && userProfileData?.phone && userProfileData.address?.line1 && userProfileData.address?.city && userProfileData.address?.state && userProfileData.address?.zip );

    // --- Handlers ---
    const handlePlaceOrder = async () => {
        if (!isAuthenticated || !user) { openLoginModal(location.pathname + location.search); return; }
        if (!isProfileFetchComplete || !userProfileData) { toast.info("Loading profile..."); return; }
        if (!isProfileCompleteForSubmit) { toast.error("Profile incomplete"); profileSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
        if (!cartItems || cartItems.length === 0) { toast.error("Your cart is empty"); return; }

        setIsSubmitting(true); setLoadingMessage("Processing order..."); setIsGlobalLoading(true);
        try {
             if (!userProfileData.address) throw new Error("Profile address missing.");
            const profileForOrder: OrderUtilsUserProfile = { id: user.id, name: userProfileData.name, email: userProfileData.email, phone: userProfileData.phone, address: { line1: userProfileData.address.line1, line2: userProfileData.address.line2 || "", city: userProfileData.address.city, state: userProfileData.address.state, zip: userProfileData.address.zip, country: userProfileData.address.country } };
            const newOrderId = await createServerOrder( cartItems, profileForOrder, discountCode );
            sessionStorage.setItem("lastOrderId", newOrderId); sessionStorage.setItem("showOrderConfirmation", "true"); sessionStorage.setItem("cartBeforeOrder", JSON.stringify(cartItems)); sessionStorage.setItem("clearCartAfterOrder", "true"); removeDiscount(); setOrderId(newOrderId); setShowConfirmation(true);
        } catch (error: any) { /* Error handling */ setIsSubmitting(false); setIsGlobalLoading(false); toast.error("Order Failed", { description: error.message }); }
    };

    const handleConfirmationClose = () => {
        const shouldClear = sessionStorage.getItem("clearCartAfterOrder") === "true";
        if (shouldClear) { clearCartFromContext(); removeDiscount(); }
        sessionStorage.removeItem("showOrderConfirmation"); sessionStorage.removeItem("lastOrderId"); sessionStorage.removeItem("cartBeforeOrder"); sessionStorage.removeItem("clearCartAfterOrder");
        setShowConfirmation(false); setIsSubmitting(false); navigate("/order-history");
    };

    const reversedCartItems = useMemo(() => [...cartItems].reverse(), [cartItems]);

    // SEO
    const pageTitle = "Order Summary | GNT Store";
    const pageDescription = "Review order details and place your order.";
    const canonicalUrl = `${siteUrl}${location.pathname}`;

    // Loading State
     if (isLoadingAuth || (isAuthenticated && (isProfileLoading || isProfileFetching))) {
        return ( <div className="min-h-screen bg-[#0f1115]"> <SEO title="Loading..." noIndex={true}/> <LoadingScreen message="Loading order summary..." /> </div> );
    }
    // Render null if modal/redirect is happening
    if (!isAuthenticated) { return null; }

    // Authenticated Render
    return (
        <div className="min-h-screen bg-[#0f1115] text-white">
            {showConfirmation && ( <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[120] p-4"> <OrderSuccessConfirmation orderId={orderId} onClose={handleConfirmationClose} isModal={true} /> </div> )}
            {isGlobalLoading && !showConfirmation && <LoadingScreen message={loadingMessage || "Processing..."} />}
             <SEO title={pageTitle} description={pageDescription} canonicalUrl={canonicalUrl} noIndex={true} ogData={{ title: pageTitle, description: pageDescription, url: canonicalUrl }} />

            <main className={`container mx-auto px-4 py-8 ${showConfirmation || (isGlobalLoading && !showConfirmation) ? 'blur-sm pointer-events-none' : ''}`}>
                {/* Steps */}
                <div className="mb-8"> <div className="flex items-center justify-center"> <div className="flex items-center"><div className="h-8 w-8 rounded-full bg-[#5865f2] flex items-center justify-center">1</div><div className="ml-2 text-sm">Cart</div></div><div className="mx-4 h-1 w-16 bg-[#5865f2]"></div><div className="flex items-center"><div className="h-8 w-8 rounded-full bg-[#5865f2] flex items-center justify-center">2</div><div className="ml-2 text-sm">Summary</div></div> </div> </div>
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Left: Items & Profile */}
                    <div className="lg:w-2/3">
                        <h1 className="text-2xl font-bold mb-6">Order Summary</h1>
                        <div className="mb-4 text-sm text-gray-400">{`Items: ${cartItems?.length ?? 0}`}</div>
                        {/* Items Card */}
                        <div className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg p-4 sm:p-6 mb-6">
                             <h2 className="text-lg sm:text-xl font-semibold mb-4">Items</h2>
                             <div className="space-y-3 max-h-60 overflow-y-auto pr-2 mb-4"> {reversedCartItems.map((item) => ( <div key={item.id} className="flex justify-between items-center text-sm sm:text-base"> <div className="flex-1 min-w-0 mr-4"> <span className="font-medium line-clamp-2 block text-gray-200">{item.title}</span> <span className="text-gray-400 text-xs">x{item.quantity}</span> </div> <span className="font-medium whitespace-nowrap text-gray-200"> {formatCurrencyWithSeparator(item.discount_price * item.quantity)} </span> </div> ))} {cartItems.length === 0 && ( <p className="text-center text-gray-400 py-4">Cart is empty.</p> )} </div>
                             {cartItems.length > 0 && ( <div className="border-t border-[#2a2d36] pt-4 space-y-2 text-sm sm:text-base"> <div className="flex justify-between"> <span className="text-gray-400">Subtotal</span> <span className="text-gray-200">{formatCurrencyWithSeparator(cartSubtotal)}</span> </div> {discountCode ? ( <div className="flex justify-between items-center"> <div className="flex items-center flex-wrap gap-x-1"> <span className="text-gray-400">Discount</span> <span className="text-emerald-400 text-xs bg-emerald-900/50 px-1.5 py-0.5 rounded whitespace-nowrap"> {discountCode} {formatDiscountInfo(discountType, discountRate)} </span> </div> <span className="text-emerald-400 font-medium"> -{formatCurrencyWithSeparator(calculatedDiscountAmount)} </span> </div> ) : ( <DiscountCodeInput subtotal={cartSubtotal} /> )} <div className="flex justify-between font-bold text-base sm:text-lg text-white"> <span>Total</span> <span>{formatCurrencyWithSeparator(cartTotal)}</span> </div> </div> )}
                        </div>
                        {/* Contact Card */}
                        <div ref={profileSectionRef} className={`bg-[#1a1c23] border rounded-lg p-4 sm:p-6 transition-colors mb-6 border-[#2a2d36]`}>
                             <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center">Contact & Shipping</h2>
                             <p className="text-sm text-gray-400 mb-4">Ensure details are correct.</p>
                             <ProfilePreviewButton />
                        </div>
                        {/* Back Link */}
                        <div className="mt-6"> <Link to="/checkout/cart-details" className="inline-flex items-center text-sm text-gray-400 hover:text-white"> <ArrowLeft className="mr-2 h-4 w-4" /> Back to Cart </Link> </div>
                    </div>
                    {/* Right: Place Order */}
                    <div className="lg:w-1/3">
                        <div className="sticky top-20 max-h-[calc(100vh-5rem-2rem)] overflow-y-auto bg-[#1a1c23] border border-[#2a2d36] rounded-lg p-6">
                             <h2 className="text-lg sm:text-xl font-semibold mb-4">Complete Order</h2>
                             <p className="text-sm text-gray-400 mb-6">Review details & contact info.</p>
                             <Button className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white py-3 text-base sm:py-4 sm:text-lg font-semibold" onClick={handlePlaceOrder} disabled={cartItems.length === 0 || isSubmitting || !isProfileFetchComplete || !isProfileCompleteForSubmit} > {isSubmitting ? ( <><Loader2 className="animate-spin h-5 w-5 mr-2" /> Processing...</> ) : ( "Place Order" )} </Button>
                             <p className="text-xs text-gray-500 mt-4 text-center">By ordering, you agree to Terms & Privacy.</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}