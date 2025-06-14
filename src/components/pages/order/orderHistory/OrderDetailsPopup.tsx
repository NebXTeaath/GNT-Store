// src/components/pages/order/orderHistory/OrderDetailsPopup.tsx
import React, { useState, useEffect } from "react"; // Ensure useEffect is imported
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { FetchedSupabaseOrder, OrderDetailsStructure } from "@/lib/pages/order/checkout/orderUtils";
import { Button } from "@/components/ui/button";
import { Package, Edit3, MapPin, Clock, Loader2 } from "lucide-react";
import { useIsMobile } from "@/components/global/Mobile/use-mobile.tsx";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDiscountInfo } from "@/lib/pages/order/checkout/Discount/formatDiscountInfo";
import { formatDate } from "../../../../lib/pages/order/orderHistory/orderService";
import ReactMarkdown, { Components } from 'react-markdown';
import { cn } from "@/lib/utils";
import WriteReviewModal from '@/components/reviews/WriteReviewModal';
import { useQuery, useQueryClient, QueryKey } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { ProductReview } from '@/lib/types/review';
import { toast } from "sonner";

const adminWhatsAppNumber = import.meta.env.VITE_ADMIN_WHATSAPP;

const formatCurrencyWithSeparator = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return 'N/A';
  return amount.toLocaleString("en-IN", {
    style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
};

interface OrderDetailsModalProps {
  order: FetchedSupabaseOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface OrderDetailsContentProps extends Omit<OrderDetailsModalProps, "open" | "order"> {
  order: FetchedSupabaseOrder;
  isMobile: boolean;
}

const markdownComponents: Components = {
  strong: ({ node, ...props }) => <strong className="font-semibold text-base" {...props} />,
  ol: ({ node, ...props }) => <ol className="list-decimal list-inside my-2 pl-4 space-y-1" {...props} />,
  li: ({ node, ...props }) => <li className="text-gray-300" {...props} />,
};

// --- ReviewButtonForProduct ---
// This component is now self-reliant on its useQuery for displaying review state
const ReviewButtonForProduct: React.FC<{
  order: FetchedSupabaseOrder;
  product: OrderDetailsStructure['products'][0];
  onReviewModalOpen: (
    productId: string,
    productSlug: string,
    productName: string,
    existingReview?: ProductReview | null // existingReview is for pre-filling the modal
  ) => void;
}> = ({ order, product, onReviewModalOpen }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient(); // Added for potential manual refetch on error, though useQuery handles retries

  const userReviewQueryKey: QueryKey = ['userReview', user?.id, product.id, order.id];

  const fetchUserReview = async () => {
    if (!user || !product.id || !order.id) return null;
    const { data, error } = await supabase.rpc('get_user_review_for_product_order', {
      p_user_id_check: user.id, p_product_id_check: product.id, p_order_id_check: order.id
    });
    if (error) {
      console.error(`Error fetching user review for product ${product.id} (Order ${order.id}):`, error.message);
      throw error; // Let useQuery handle the error state
    }
    return data && data.length > 0 ? data[0] as ProductReview : null;
  };

  const {
    data: existingReview, // This is the source of truth for this button's display
    isLoading: isLoadingReview,
    isError,
    error: queryError,
    // refetch // We can use this if we want a manual retry button within this component
  } = useQuery<ProductReview | null, Error>({
    queryKey: userReviewQueryKey,
    queryFn: fetchUserReview,
    enabled: !!user && !!product.id && !!order.id && order.order_status === 'delivered',
    staleTime: 5 * 60 * 1000, // Data is fresh for 5 minutes
    gcTime: 15 * 60 * 1000,   // Cache kept for 15 minutes
    refetchOnWindowFocus: true, // Refetch when window is refocused
    retry: 1, // Retry once on failure
  });

  useEffect(() => {
    if (isError && queryError) {
      // Log once or use toast with a unique ID to prevent spamming
      console.warn(`Failed to load review status for ${product.name}: ${queryError.message}`);
      // toast.error("Could not load review status", { id: `review-status-err-${product.id}`});
    }
  }, [isError, queryError, product.name, product.id]);


  if (order.order_status !== 'delivered') return null;

  if (isLoadingReview) {
    return <Button variant="outline" size="sm" className="text-xs h-7" disabled><Loader2 className="h-3 w-3 mr-1.5 animate-spin" />Loading...</Button>;
  }
  // If there was an error fetching, we might want to allow them to try writing a review anyway,
  // or show a retry button. For now, let's assume "Write Review" is okay as a fallback.
  // If `existingReview` is `null` due to error, it will show "Write Review".

  return (
  <Button
    variant="default"
    size="sm"
    className={cn(
      "text-xs h-7 font-semibold",
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
    {existingReview ? 'Edit Review' : 'Write Review'}
  </Button>
);
};

// --- OrderDetailsContent ---
const OrderDetailsContent = ({ order, isMobile }: OrderDetailsContentProps) => {
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedProductForReview, setSelectedProductForReview] = useState<{
    id: string;
    slug: string;
    name: string;
    review?: ProductReview | null; // This will be from ReviewButtonForProduct's query for prefilling
  } | null>(null);

  const queryClient = useQueryClient();
  const { user } = useAuth(); // Needed for query key invalidation

  const orderDetails: OrderDetailsStructure | undefined = order?.order_details;
  const products = orderDetails?.products ?? [];
  // ... (other state and variable declarations as before) ...
  const orderSummary = orderDetails?.order_summary;
  const customer = orderDetails?.customer;
  const orderStatus = order?.order_status ?? 'Unknown';
  const formattedDate = formatDate(orderDetails?.order_date);


  const handleOpenReviewModal = (
    productId: string,
    productSlug: string,
    productName: string,
    existingReviewData?: ProductReview | null
  ) => {
    setSelectedProductForReview({
      id: productId,
      slug: productSlug,
      name: productName,
      review: existingReviewData // Use the review data passed from the button
    });
    setIsReviewModalOpen(true);
  };

  const handleReviewSubmittedOrUpdated = async () => {
    if (selectedProductForReview && user) {
      const { id: productId, slug: productSlug } = selectedProductForReview;
      const userReviewQueryKeyToInvalidate: QueryKey = ['userReview', user.id, productId, order.id];

      // 1. Invalidate the query. This tells TanStack Query that the data for this key is stale.
      //    The ReviewButtonForProduct's useQuery will refetch on its next render or when enabled.
      await queryClient.invalidateQueries({ queryKey: userReviewQueryKeyToInvalidate, exact: true });

      // 2. To make the update appear more "instantaneously" in the button after modal closes,
      //    we can *proactively refetch* it.
      //    This is optional but improves UX.
      try {
         console.log(`Modal closed, submitted/updated. Proactively refetching review for product ${productId}, order ${order.id}`);
         // This refetch will update the cache, and ReviewButtonForProduct will pick up the new data.
         await queryClient.refetchQueries({ queryKey: userReviewQueryKeyToInvalidate, exact: true });
      } catch (error) {
          console.error("Error during proactive refetch of user review after modal close:", error);
      }


      // Invalidate other related queries as before
      queryClient.invalidateQueries({ queryKey: ['productReviews', productId] });
      queryClient.invalidateQueries({ queryKey: ['productDetailsBySlug', productSlug] });
      queryClient.invalidateQueries({ queryKey: ['productDetails', productId] });
      // Also, if your order list shows review status, you might invalidate it too
      // queryClient.invalidateQueries({ queryKey: ['orders'] });


      console.log('Review submitted/updated. Query invalidated for product:', productId);
    }
    // Modal will close via its onOpenChange, and the button will update due to query refetch
  };

  // Function to format order details for WhatsApp using server data
  const formatOrderDetailsForWhatsApp = () => {
    // Add checks for summary and customer existence
    if (!orderDetails || !orderSummary || !customer) {
        return "Order details are incomplete. Cannot generate support message.";
    }

    const {
      discount_rate: discountRate,
      discount_code: discountCode,
      discount_type: discountType,
      discount_amount: discountAmount,
      subtotal,
      total,
    } = orderSummary;
    // Check if discountAmount is present and greater than 0 for hasDiscount
    const hasDiscount = discountAmount !== null && discountAmount !== undefined && discountAmount > 0;

    let message = "Order Support Request\n\n";
    message += `Order ID: ${order.id ?? 'N/A'}\n`;
    message += `Order Date: ${formattedDate}\n`; // Use pre-formatted safe date
    message += `Status: ${orderStatus.charAt(0).toUpperCase() + orderStatus.slice(1)}\n\n`; // Use safe status

    message += "Items:\n";
    products.forEach((product) => { // Use safe 'products' array
      message += `• ${product.name ?? 'Unknown Item'} (Qty: ${product.quantity ?? 0}) - ${formatCurrencyWithSeparator(
        product.subtotal // Access subtotal directly
      )}\n`;
    });
    message += `\nSubtotal: ${formatCurrencyWithSeparator(subtotal)}\n`;

    if (hasDiscount) {
        // Safely access discount properties
        const discountCodeDisplay = discountCode ?? 'N/A';
        const discountTypeDisplay = discountType ?? 'N/A';
        const rateDisplay = formatDiscountInfo(discountTypeDisplay, discountRate ?? 0); // Use helper

        message += `Discount Applied: ${discountCodeDisplay} (${rateDisplay}) - Saving ${formatCurrencyWithSeparator(discountAmount)}\n`;
    }

    message += `Total: ${formatCurrencyWithSeparator(total)}\n`;
    message += `Shipping Address: ${customer.address ?? 'N/A'}\n\n`;

    if (orderStatus.toLowerCase() === "delivered") {
      message += `Delivered on ${formattedDate}\n`;
    } else {
      message += `Delivery Info: ${order.remark || "to be updated soon by our team"}\n`;
    }

    message += "\nPlease assist with this order.";
    return message;
  };


  // WhatsApp "Need Help?" button handler
  const handleNeedHelpClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // Prevent modal close if button is inside clickable area
    if (!adminWhatsAppNumber) {
        console.error("Admin WhatsApp number (VITE_ADMIN_WHATSAPP) is not configured.");
        alert("Support contact is currently unavailable.");
        return;
    }
    const message = formatOrderDetailsForWhatsApp();
    // Add check if details were incomplete
    if (message.startsWith("Order details are incomplete")) {
        alert(message);
        return;
    }
    window.open(
      `https://wa.me/${adminWhatsAppNumber}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  };
  
  const hasDiscountApplied = orderSummary?.discount_amount !== null && orderSummary?.discount_amount !== undefined && orderSummary.discount_amount > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-[#2a2d36]">
        <h2 className="text-xl font-semibold">Order Details</h2>
      </div>
      <ScrollArea className={cn("overflow-y-auto", isMobile ? "flex-1 min-h-0" : "max-h-[calc(80vh-132px)]")}>
        {!orderDetails ? (
          <div className="p-6 text-center text-red-400">Order details could not be loaded.</div>
        ) : (
          <div className="px-6 py-4">
            {/* Top Section (as before) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <h3 className="text-lg font-medium">Order #{order.id?.substring(0, 36) ?? 'N/A'}</h3>
              <div className="text-right">
                <div className="text-sm text-gray-400">Total</div>
                <div className="text-lg font-medium">{formatCurrencyWithSeparator(orderSummary?.total)}</div>
                <span className={`mt-1 inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(orderStatus)}`}>{orderStatus.charAt(0).toUpperCase() + orderStatus.slice(1)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400 mt-1 mb-4"><span>Placed on {formattedDate}</span></div>

            {/* Order Items */}
            <h4 className="font-medium mb-4">Order Items ({products.length})</h4>
            <div className="space-y-4">
              {products.map((product) => (
                <div
                  key={product.id ?? Math.random()}
                  className="flex flex-row justify-between items-start sm:items-center"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="h-12 w-12 min-w-[3rem] bg-[#2a2d36] rounded-md flex items-center justify-center overflow-hidden flex-shrink-0">
                      {product.image ? <img src={product.image} alt={product.name ?? 'Product'} className="h-full w-full object-cover" /> : <Package className="h-6 w-6 text-gray-400" />}
                    </div>
                    <div className="flex-1 min-w-0 mr-2 sm:max-w-xs">
                      <p className="font-medium line-clamp-2" title={product.name ?? undefined}>{product.name ?? 'Unknown Item'}</p>
                      <p className="text-sm text-gray-400">Qty: {product.quantity ?? 0}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0 ml-2">
                    <p className="whitespace-nowrap text-sm font-medium">
                      {formatCurrencyWithSeparator(product.subtotal)}
                    </p>
                    {order.order_status === 'delivered' && product.id && product.slug && (
                      <div className="mt-1">
                        <ReviewButtonForProduct
                            order={order}
                            product={product}
                            onReviewModalOpen={handleOpenReviewModal}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Shipping & Summary (as before) */}
            <div className="mt-6 pt-6 border-t border-[#2a2d36]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Shipping Address</h4>
                  <p className="text-sm text-gray-300">{customer?.address ?? 'N/A'}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-3">Delivery Information</h4>
                  {orderStatus.toLowerCase() === 'delivered' ? (
                    <p className="text-sm text-gray-300"><span className="text-emerald-500 font-medium">✓</span> Delivered on {formatDate(order.updated_at)}</p>
                  ) : orderStatus.toLowerCase() === 'out for delivery' ? (
                    <>
                      <p className="text-sm text-gray-300 mb-1"><span className="text-cyan-400 font-medium animate-pulse">🚚</span> Your order is out for delivery!</p>
                      <div className="text-sm text-gray-300 prose prose-sm prose-invert max-w-none break-words"><ReactMarkdown components={markdownComponents}>{order.remark || ""}</ReactMarkdown></div>
                    </>
                  ) : (
                    <div className="text-sm text-gray-300 prose prose-sm prose-invert max-w-none break-words">
                      <ReactMarkdown components={markdownComponents}>{order.remark || "_to be updated soon_"}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-6 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-gray-400">Subtotal</span><span>{formatCurrencyWithSeparator(orderSummary?.subtotal)}</span></div>
                {hasDiscountApplied ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400 flex items-center flex-wrap">Discount {orderSummary?.discount_code && `(${orderSummary.discount_code})`} <span className="ml-1">{formatDiscountInfo(orderSummary?.discount_type ?? '', orderSummary?.discount_rate ?? 0)}</span></span>
                    <span className="text-emerald-500">-{formatCurrencyWithSeparator(orderSummary?.discount_amount)}</span>
                  </div>
                ) : (<div className="flex justify-between text-sm"><span className="text-gray-400">Discount</span><span>-</span></div>)}
                <div className="flex justify-between font-medium pt-2 border-t border-[#2a2d36] mt-2"><span>Total</span><span>{formatCurrencyWithSeparator(orderSummary?.total)}</span></div>
              </div>
            </div>

          </div>
        )}
      </ScrollArea>
      {/* Footer (as before) */}
      <div className={`p-6 border-t border-[#2a2d36] ${isMobile ? 'sticky bottom-0 z-10 bg-[#1a1c23]' : ''}`} style={isMobile ? { paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 20px))" } : {}}>
        <div className="flex flex-col sm:flex-row justify-end gap-3">
          <Button size="sm" className="bg-[#5865f2] hover:bg-[#4752c4] text-white" onClick={handleNeedHelpClick}>Need Help?</Button>
        </div>
      </div>

      {/* Write Review Modal */}
      {selectedProductForReview && order && (
        <WriteReviewModal
          isOpen={isReviewModalOpen}
          onOpenChange={setIsReviewModalOpen}
          productId={selectedProductForReview.id}
          productSlug={selectedProductForReview.slug} // Ensure slug is passed if modal needs it
          productName={selectedProductForReview.name}
          orderId={order.id}
          // Pass the review data that was set when opening the modal
          existingReview={selectedProductForReview.review}
          onReviewSubmitted={handleReviewSubmittedOrUpdated}
        />
      )}
    </div>
  );
};

// Main Modal/Drawer Component (as before)
export const OrderDetailsModal = ({ order, open, onOpenChange }: OrderDetailsModalProps) => {
    const isMobile = useIsMobile();
      if (!order) return null;
      return isMobile ? (
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="flex flex-col h-full bg-[#1a1c23] border-t border-[#2a2d36] text-white rounded-t-[10px]" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
            <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-[#2a2d36]" />
            <OrderDetailsContent order={order} onOpenChange={onOpenChange} isMobile={true} />
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-[600px] p-0 bg-[#1a1c23] border border-[#2a2d36] text-white max-h-[90vh] flex flex-col">
            <OrderDetailsContent order={order} onOpenChange={onOpenChange} isMobile={false} />
          </DialogContent>
        </Dialog>
      );
};

// getStatusColor function (as before)
function getStatusColor(status: string = ""): string {
  switch (status.toLowerCase()) {
    case "pending": return "bg-yellow-500/10 text-yellow-400";
    case "processing": return "bg-blue-500/10 text-blue-400";
    case "shipped": return "bg-violet-500/10 text-violet-400";
    case "out for delivery": return "bg-cyan-500/10 text-cyan-400";
    case "delivered": return "bg-emerald-500/10 text-emerald-400";
    case "cancelled": return "bg-red-500/10 text-red-400";
    case "failed": return "bg-red-700/20 text-red-500";
    default: return "bg-gray-500/10 text-gray-400";
  }
}