// src/pages/reviews/OrderReviewPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { FetchedSupabaseOrder, OrderDetailsStructure } from '@/lib/pages/order/checkout/orderUtils';
import { ProductReview } from '@/lib/types/review';
import WriteReviewModal from '@/components/reviews/WriteReviewModal';
import { toast } from 'sonner';
import { useQuery, useQueryClient, QueryKey } from '@tanstack/react-query';
import { Loader2, AlertCircle, ArrowLeft, Package, Edit3, ShoppingBag } from 'lucide-react'; // Added ShoppingBag
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import SEO from '@/components/seo/SEO';
import { cn } from '@/lib/utils';
// GlobalLayout is not needed here as this page will be rendered within it via the router
import { formatDate } from '@/lib/pages/order/orderHistory/orderService';


// Reusable ReviewButtonForProduct (Copied from previous step, assuming it's correct)
const ReviewButtonForProduct: React.FC<{
    orderId: string;
    product: OrderDetailsStructure['products'][0];
    onReviewModalOpen: (
        productId: string,
        productSlug: string,
        productName: string,
        existingReview?: ProductReview | null
    ) => void;
}> = ({ orderId, product, onReviewModalOpen }) => {
    const { user } = useAuth();
    const userReviewQueryKey: QueryKey = ['userReview', user?.id, product.id, orderId];

    const fetchUserReview = async () => {
        if (!user || !product.id || !orderId) return null;
        const { data, error } = await supabase.rpc('get_user_review_for_product_order', {
            p_user_id_check: user.id, p_product_id_check: product.id, p_order_id_check: orderId
        });
        if (error) {
            console.error(`Error fetching user review for product ${product.id} (Order ${orderId}):`, error.message);
            throw error;
        }
        return data && data.length > 0 ? data[0] as ProductReview : null;
    };

    const { data: existingReview, isLoading: isLoadingReview, isError, error: queryError } = useQuery<ProductReview | null, Error>({
        queryKey: userReviewQueryKey,
        queryFn: fetchUserReview,
        enabled: !!user && !!product.id && !!orderId,
        staleTime: 5 * 60 * 1000,
        gcTime: 15 * 60 * 1000,
        refetchOnWindowFocus: true,
        retry: 1,
    });

    useEffect(() => {
        if (isError && queryError) {
            console.warn(`Failed to load review status for ${product.name}: ${queryError.message}`);
        }
    }, [isError, queryError, product.name, product.id]);

    if (isLoadingReview) {
        return <Button variant="outline" size="sm" className="text-xs h-8 w-full md:w-auto" disabled><Loader2 className="h-3 w-3 mr-1.5 animate-spin" />Loading Review Status...</Button>;
    }

    return (
        <Button
            variant="default"
            size="sm"
            className={cn(
                "text-xs h-8 w-full md:w-auto font-semibold",
                "bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900",
                "hover:from-yellow-500 hover:to-yellow-600 hover:text-yellow-100",
            )}
            onClick={(e) => {
                e.stopPropagation();
                if (!product.slug) {
                    toast.error("Product details incomplete for review.");
                    console.error("Product slug is missing for review:", product);
                    return;
                }
                onReviewModalOpen(product.id, product.slug, product.name ?? 'Product', existingReview);
            }}
        >
            <Edit3 className="h-3 w-3 mr-1.5" />
            {existingReview ? 'Edit Your Review' : 'Write a Review'}
        </Button>
    );
};


const OrderReviewPage: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isAuthenticated, isLoadingAuth, openLoginModal } = useAuth();
    const queryClient = useQueryClient();

    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [selectedProductForReview, setSelectedProductForReview] = useState<{
        id: string; slug: string; name: string; review?: ProductReview | null;
    } | null>(null);

    const [pageError, setPageError] = useState<string | null>(null);
    const [pageLoadingMessage, setPageLoadingMessage] = useState<string>("Loading review details...");
    const siteUrl = window.location.origin;

    const { data: orderData, isLoading: isLoadingOrder, error: orderFetchError, refetch: refetchOrder } = useQuery<FetchedSupabaseOrder | null, Error>({
        queryKey: ['orderForReviewPage', orderId, user?.id],
        queryFn: async () => {
            if (!orderId || !user?.id) return null;
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('id', orderId)
                .eq('user_id', user.id)
                .single();
            if (error) {
                if (error.code === 'PGRST116') return null;
                throw new Error(error.message);
            }
            return data as FetchedSupabaseOrder | null;
        },
        enabled: !!orderId && !!user?.id && !isLoadingAuth,
    });

    useEffect(() => {
        if (!isLoadingAuth && !isAuthenticated) {
            openLoginModal(location.pathname);
        } else if (isAuthenticated && orderId && !orderData && !isLoadingOrder && !orderFetchError) {
            // Only refetch if not already loading and no error, and orderData is unexpectedly null
            refetchOrder();
        }
    }, [isLoadingAuth, isAuthenticated, openLoginModal, location.pathname, orderId, refetchOrder, orderData, isLoadingOrder, orderFetchError]);

    useEffect(() => {
        if (!isLoadingOrder) {
            if (orderFetchError) {
                setPageError("Failed to load order details. The link might be invalid or the order doesn't exist.");
            } else if (!orderData) {
                setPageError("Order not found, you are not authorized to review this order, or it has not been delivered yet.");
            } else if (orderData.order_status !== 'delivered') {
                setPageError("You can only review products from delivered orders.");
            } else {
                setPageError(null);
            }
        }
    }, [orderData, isLoadingOrder, orderFetchError]);

    const productsToReview = orderData?.order_details?.products || [];

    const handleOpenReviewModal = (productId: string, productSlug: string, productName: string, existingReviewData?: ProductReview | null) => {
        setSelectedProductForReview({
            id: productId, slug: productSlug, name: productName, review: existingReviewData
        });
        setIsReviewModalOpen(true);
    };

    const handleReviewSubmittedOrUpdated = async () => {
        if (selectedProductForReview && user && orderData) {
             const { id: productId } = selectedProductForReview;
             await queryClient.invalidateQueries({ queryKey: ['existingReviewPage', user.id, productId, orderData.id], exact: true });
             await queryClient.invalidateQueries({ queryKey: ['productReviews', productId] });
             await queryClient.invalidateQueries({ queryKey: ['productDetailsBySlug', selectedProductForReview.slug] });
             await queryClient.invalidateQueries({ queryKey: ['productDetails', productId] });
             // Optionally, refetch the order data if review status might affect how the OrderReviewPage itself displays info
             // await refetchOrder();
        }
    };

    const isLoadingPage = isLoadingAuth || isLoadingOrder;
    const seoPageTitle = orderData ? `Review Your Order #${orderData.id.substring(0,8)} | GNT Store` : "Review Your Order | GNT Store";
    const seoPageDescription = "Share your feedback on the products from your recent GNT Store order.";

    if (isLoadingPage) {
        return (
            // This page is already rendered within GlobalLayout by the router
            <div className="min-h-[calc(100vh-150px)] flex flex-col items-center justify-center p-4">
                <SEO title="Loading Order for Review..." description="Loading your order details..." noIndex={true} />
                <Loader2 className="h-12 w-12 animate-spin text-[#5865f2] mb-4" />
                <p className="text-lg text-gray-300">{pageLoadingMessage}</p>
            </div>
        );
    }

    if (!isAuthenticated) {
        // Auth modal will be shown by AuthContext, render a placeholder or nothing
        return (
            <div className="min-h-[calc(100vh-150px)] flex flex-col items-center justify-center p-4">
                 <SEO title="Login Required" description="Please log in to review your order." noIndex={true} />
                {/* Optionally, show a message like "Please log in to continue." */}
            </div>
        );
    }


    return (
        // This page is already rendered within GlobalLayout by the router
        <>
            <SEO
                title={seoPageTitle}
                description={seoPageDescription}
                canonicalUrl={`${siteUrl}/review/order/${orderId}`}
                noIndex={true}
            />
            <div className="min-h-[calc(100vh-200px)] py-8"> {/* Adjusted min-height */}
                <div className="container mx-auto max-w-3xl px-4">
                    <Button 
                        variant="default" 
                        onClick={() => navigate('/order-history')} 
                        className="mb-6 text-gray-400 hover:text-[#4752c4] bg-black-900 hover:bg-black-900 "
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Order History
                    </Button>

                    {pageError && (
                        <Card className="bg-red-900/20 border-red-500/50 text-red-300 shadow-lg">
                            <CardHeader>
                                <CardTitle className="flex items-center text-red-300">
                                    <AlertCircle className="h-6 w-6 mr-2" />
                                    Error Loading Order for Review
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="mb-4">{pageError}</p>
                                <Button onClick={() => navigate('/order-history')} variant="outline" className="border-red-400 text-red-300 hover:bg-red-700/50 hover:text-red-200">
                                    View Your Orders
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {!pageError && orderData && (
                        <Card className="bg-[#1a1c23] border border-[#2a2d36] shadow-xl">
                            <CardHeader>
                                <CardTitle className="text-2xl md:text-3xl font-bold text-white">
                                    Review Products from Order #{orderData.id.substring(0,8)}...
                                </CardTitle>
                                <CardDescription className="text-gray-400">
                                    Thank you for your purchase! Please share your feedback on the items below.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {productsToReview.length === 0 && (
                                    <p className="text-gray-400 text-center py-4">No products found in this order to review.</p>
                                )}
                                {productsToReview.map((product, index) => (
                                    <React.Fragment key={product.id}>
                                        {index > 0 && <Separator className="bg-[#2a2d36]/70 my-4" />}
                                        <div className="bg-[#22252e]/50 p-4 rounded-lg border border-[#3f4354]/70 flex flex-col md:flex-row md:items-center gap-4">
                                            {product.image ? (
                                                <img src={product.image} alt={product.name} className="w-20 h-20 md:w-24 md:h-24 object-contain rounded-md flex-shrink-0 bg-gray-700 p-1" />
                                            ) : (
                                                <div className="w-20 h-20 md:w-24 md:h-24 bg-[#2a2d36] rounded-md flex items-center justify-center flex-shrink-0">
                                                    <Package className="h-10 w-10 text-gray-500" />
                                                </div>
                                            )}
                                            <div className="flex-grow">
                                                <h3 className="text-lg font-semibold text-white line-clamp-2">{product.name}</h3>
                                                <p className="text-sm text-gray-400">Purchased on: {formatDate(orderData.order_details.order_date)}</p>
                                            </div>
                                            <div className="md:ml-auto flex-shrink-0 mt-3 md:mt-0 w-full md:w-auto">
                                                {orderData.order_status === 'delivered' && product.id && (
                                                    <ReviewButtonForProduct
                                                        orderId={orderData.id}
                                                        product={product}
                                                        onReviewModalOpen={handleOpenReviewModal}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </React.Fragment>
                                ))}
                                {productsToReview.length > 0 && (
                                    <div className="text-center mt-8">
                                        
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {selectedProductForReview && orderData && (
                <WriteReviewModal
                    isOpen={isReviewModalOpen}
                    onOpenChange={setIsReviewModalOpen}
                    productId={selectedProductForReview.id}
                    productSlug={selectedProductForReview.slug}
                    productName={selectedProductForReview.name}
                    orderId={orderData.id}
                    existingReview={selectedProductForReview.review}
                    onReviewSubmitted={handleReviewSubmittedOrUpdated}
                />
            )}
        </>
    );
};

export default OrderReviewPage;