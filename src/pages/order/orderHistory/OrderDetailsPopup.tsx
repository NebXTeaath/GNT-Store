// src/pages/order/orderHistory/OrderDetailsPopup.tsx
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
// Import the specific, correct type
import { FetchedSupabaseOrder, OrderDetailsStructure } from "@/pages/order/checkout/orderUtils";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";
import { useIsMobile } from "@/components/global/Mobile/use-mobile.tsx";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDiscountInfo } from "@/pages/order/formatDiscountInfo";
// Import the safer date formatter
import { formatDate } from "./orderService";

// Import the admin's WhatsApp number from the environment variable
const adminWhatsAppNumber = import.meta.env.VITE_ADMIN_WHATSAPP;

// Ensure this handles potential null/undefined safely
const formatCurrencyWithSeparator = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) {
      return 'N/A'; // Or some placeholder like ₹--.--
  }
  return amount.toLocaleString("en-IN", { // Use en-IN consistently
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

interface OrderDetailsModalProps {
  order: FetchedSupabaseOrder | null; // Allow order to potentially be null
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Use the specific type here too
interface OrderDetailsContentProps extends Omit<OrderDetailsModalProps, "open" | "order"> {
  order: FetchedSupabaseOrder; // Assume order is non-null when this renders
  isMobile: boolean;
}

const OrderDetailsContent = ({
  order,
  onOpenChange: _onOpenChange, // Renamed to avoid confusion, not used directly here
  isMobile,
}: OrderDetailsContentProps) => {
  // --- Safety Checks ---
  const orderDetails: OrderDetailsStructure | undefined = order?.order_details;
  const orderSummary = orderDetails?.order_summary;
  const customer = orderDetails?.customer;
  const products = orderDetails?.products ?? []; // Default to empty array
  const orderStatus = order?.order_status ?? 'Unknown';

  // Use the safe formatDate helper
  const formattedDate = formatDate(orderDetails?.order_date);

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

  // Use discount info safely
   const hasDiscount = orderSummary?.discount_amount !== null && orderSummary?.discount_amount !== undefined && orderSummary?.discount_amount > 0;
   const discountCodeDisplay = orderSummary?.discount_code;
   const discountTypeDisplay = orderSummary?.discount_type;
   const discountRateDisplay = orderSummary?.discount_rate;
   const discountAmountDisplay = orderSummary?.discount_amount;


  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-[#2a2d36]">
        <h2 className="text-xl font-semibold">Order Details</h2>
        {/* Optional: Add close button explicitly if needed */}
      </div>

      {/* Scrollable content */}
      <ScrollArea className={ isMobile ? "flex-1 min-h-0 overflow-y-auto" : "max-h-[calc(80vh-132px)] overflow-y-auto" } >
        {/* Add a check: If orderDetails is missing, show an error message */}
        {!orderDetails ? (
             <div className="p-6 text-center text-red-400">
                Order details could not be loaded for this order.
             </div>
        ) : (
            <div className="px-6 py-4">
              {/* Top Section */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <h3 className="text-lg font-medium">Order #{order.id?.substring(0, 8) ?? 'N/A'}</h3>
                <div className="text-right">
                  <div className="text-sm text-gray-400">Total</div>
                  <div className="text-lg font-medium">
                    {formatCurrencyWithSeparator(orderSummary?.total)}
                  </div>
                  <span className={`mt-1 inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(orderStatus)}`} >
                    {orderStatus.charAt(0).toUpperCase() + orderStatus.slice(1)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-400 mt-1 mb-4">
                <span>Placed on {formattedDate}</span>
              </div>

              {/* Order Items */}
              <h4 className="font-medium mb-4">Order Items ({products.length})</h4>
              <div className="space-y-4">
                {products.map((product) => ( // Iterate over safe 'products' array
                  <div key={product.id ?? Math.random()} className="flex justify-between items-start sm:items-center" >
                    <div className="flex items-start sm:items-center gap-3">
                      {/* Image with Fallback */}
                      <div className="h-12 w-12 min-w-[3rem] bg-[#2a2d36] rounded-md flex items-center justify-center overflow-hidden product-image-container">
                         {/* Use product.image directly if it's a string URL */}
                         {product.image ? (
                            <img src={product.image} alt={product.name ?? 'Product'} className="h-full w-full object-cover"
                                onError={(e) => { /* Keep error handling */
                                    const target = e.target as HTMLImageElement; target.style.display = 'none'; /* ... rest of onError ... */
                                }}
                            />
                         ) : (
                            <Package className="h-6 w-6 text-gray-400" />
                         )}
                      </div>
                      {/* Text Details */}
                      <div className="max-w-[calc(100%-4rem)] sm:max-w-xs">
                        <p className="font-medium line-clamp-2" title={product.name ?? undefined}>
                          {product.name ?? 'Unknown Item'}
                        </p>
                        <p className="text-sm text-gray-400">
                          Qty: {product.quantity ?? 0}
                        </p>
                      </div>
                    </div>
                    {/* Subtotal */}
                    <p className="whitespace-nowrap ml-2">
                      {formatCurrencyWithSeparator(product.subtotal)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Shipping & Summary */}
              <div className="mt-6 pt-6 border-t border-[#2a2d36]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Shipping Address */}
                  <div>
                    <h4 className="font-medium mb-3">Shipping Address</h4>
                    <p className="text-sm text-gray-300">
                      {customer?.address ?? 'N/A'}
                    </p>
                  </div>
                  {/* Delivery Info */}
                  <div>
                    <h4 className="font-medium mb-3">Delivery Information</h4>
                    {orderStatus.toLowerCase() === "delivered" ? (
                        <p className="text-sm text-gray-300"> <span className="text-emerald-500 font-medium">✓</span>{" "} Delivered on {formattedDate} </p>
                    ) : (
                         <p className="text-sm text-gray-300 italic"> {order.remark || "to be updated soon by our team"} </p>
                    )}
                  </div>
                </div>

                {/* Order Summary Details */}
                <div className="mt-6 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Subtotal</span>
                        <span>{formatCurrencyWithSeparator(orderSummary?.subtotal)}</span>
                    </div>
                    {hasDiscount ? (
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400 flex items-center flex-wrap">
                                Discount
                                {discountCodeDisplay && (<span className="text-emerald-500 ml-1">({discountCodeDisplay})</span>)}
                                <span className="ml-1">{formatDiscountInfo(discountTypeDisplay ?? '', discountRateDisplay ?? 0)}</span>
                            </span>
                            <span className="text-emerald-500">-{formatCurrencyWithSeparator(discountAmountDisplay)}</span>
                        </div>
                    ) : (
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Discount</span>
                            <span>-</span>
                        </div>
                    )}
                    <div className="flex justify-between font-medium pt-2 border-t border-[#2a2d36] mt-2">
                        <span>Total</span>
                        <span>{formatCurrencyWithSeparator(orderSummary?.total)}</span>
                    </div>
                </div>
              </div>
            </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className={`p-6 border-t border-[#2a2d36] ${isMobile ? 'sticky bottom-0 z-10 bg-[#1a1c23]' : ''}`}
           style={isMobile ? { paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 20px))" } : {}} >
        <div className="flex flex-col sm:flex-row justify-end gap-3">
          <Button size="sm" className="bg-[#5865f2] hover:bg-[#4752c4] text-white" onClick={handleNeedHelpClick} >
            Need Help?
          </Button>
        </div>
      </div>
    </div>
  );
};

// Main Modal/Drawer Component
export const OrderDetailsModal = ({ order, open, onOpenChange }: OrderDetailsModalProps) => {
  const isMobile = useIsMobile();

  // Conditional rendering based on whether 'order' is provided
  if (!order) {
      // Optionally render nothing, or a placeholder/error state if the modal was opened without an order
      console.warn("OrderDetailsModal rendered without an order object.");
      return null;
  }

  return isMobile ? (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="flex flex-col h-full bg-[#1a1c23] border-t border-[#2a2d36] text-white rounded-t-[10px]" style={{ paddingBottom: "env(safe-area-inset-bottom)" }} >
        <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-[#2a2d36]" />
        {/* Pass the guaranteed non-null order */}
        <OrderDetailsContent order={order} onOpenChange={onOpenChange} isMobile={true} />
      </DrawerContent>
    </Drawer>
  ) : (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 bg-[#1a1c23] border border-[#2a2d36] text-white max-h-[90vh] flex flex-col">
         {/* Pass the guaranteed non-null order */}
        <OrderDetailsContent order={order} onOpenChange={onOpenChange} isMobile={false} />
      </DialogContent>
    </Dialog>
  );
};

// Keep getStatusColor function
function getStatusColor(status: string = ""): string {
  switch (status.toLowerCase()) {
    case "pending": return "bg-yellow-500/10 text-yellow-400";
    case "processing": return "bg-blue-500/10 text-blue-400";
    case "shipped": return "bg-violet-500/10 text-violet-400";
    case "delivered": return "bg-emerald-500/10 text-emerald-400";
    case "cancelled": return "bg-red-500/10 text-red-400";
    case "failed": return "bg-red-700/20 text-red-500";
    default: return "bg-gray-500/10 text-gray-400";
  }
}

// Import the safer date formatter (already done above)
// import { formatDate } from "./orderService";