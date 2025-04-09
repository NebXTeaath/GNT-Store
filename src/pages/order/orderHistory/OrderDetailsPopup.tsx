// src/pages/order/orderHistory/OrderDetailsPopup.tsx
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Order } from "@/pages/order/orderHistory/orderService";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react"; // Removed MapPin if not needed
import { useIsMobile } from "@/components/global/Mobile/use-mobile.tsx";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDiscountInfo } from "@/pages/order/formatDiscountInfo";

// Import the admin's WhatsApp number from the environment variable
const adminWhatsAppNumber = import.meta.env.VITE_ADMIN_WHATSAPP;

// Updated formatCurrency to support thousands separator and locale-specific formatting
const formatCurrencyWithSeparator = (amount: number) => {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

interface OrderDetailsModalProps {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// New interface for the content component that excludes 'open'
interface OrderDetailsContentProps extends Omit<OrderDetailsModalProps, "open"> {
  isMobile: boolean;
}

const OrderDetailsContent = ({
  order,
  onOpenChange: _onOpenChange,
  isMobile,
}: OrderDetailsContentProps) => {
  // Access order_date from order.orderdetails
  const orderDate = new Date(order.orderdetails.order_date);
  const formattedDate = orderDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Function to format order details for WhatsApp using server data
  const formatOrderDetailsForWhatsApp = () => {
    const {
      discount_rate: discountRate,
      discount_code: discountCode,
      discount_type: discountType,
      discount_amount: discountAmount,
      subtotal,
      total,
    } = order.orderdetails.order_summary;
    const hasDiscount = discountRate && discountRate > 0;
  
    let message = "Order Support Request\n\n";
    message += `Order ID: ${order.id}\n`;
    message += `Order Date: ${formattedDate}\n`;
    message += `Status: ${
      order.orderstatus
        ? order.orderstatus.charAt(0).toUpperCase() + order.orderstatus.slice(1)
        : "Unknown"
    }\n\n`;
  
    message += "Items:\n";
    order.orderdetails.products.forEach((product) => {
      message += `• ${product.name} (Qty: ${product.quantity}) - ${formatCurrencyWithSeparator(
        product.subtotal
      )}\n`;
    });
    message += `\nSubtotal: ${formatCurrencyWithSeparator(subtotal)}\n`;
  
    if (hasDiscount) {
      const discountLabel = discountType === "percentage"
        ? `${discountRate}%`
        : `${formatCurrencyWithSeparator(discountAmount ?? 0)}`;
      
      message += `Discount Applied: ${discountCode} (${discountType}) - ${discountLabel} off, saving ${formatCurrencyWithSeparator(
        discountAmount ?? 0
      )}\n`;
    }
  
    message += `Total: ${formatCurrencyWithSeparator(total)}\n`;
    message += `Shipping Address: ${order.orderdetails.customer.address}\n\n`;
  
    if (order.orderstatus?.toLowerCase() === "delivered") {
      message += `Delivered on ${formattedDate}\n`;
    } else {
      message += `Delivery Info: ${order.remark || "to be updated soon by our team"}\n`;
    }
  
    message += "\nPlease assist with this order.";
    return message;
  };
  

  // WhatsApp "Need Help?" button handler
  const handleNeedHelpClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const message = formatOrderDetailsForWhatsApp();
    window.open(
      `https://wa.me/${adminWhatsAppNumber}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  };

  // Use discount info from order.orderdetails.order_summary for display in the modal
  const {
    discount_rate: discountRate,
    discount_code: discountCode,
    discount_type: discountType,
    discount_amount: discountAmount,
  } = order.orderdetails.order_summary;
  const hasDiscount = discountRate && discountRate > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-[#2a2d36]">
        <h2 className="text-xl font-semibold">Order Details</h2>
      </div>

      {/* Scrollable content */}
      <ScrollArea
        className={
          isMobile
            ? "flex-1 min-h-0 overflow-y-auto"
            : "max-h-[calc(80vh-132px)] overflow-y-auto"
        }
      >
        <div className="px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h3 className="text-lg font-medium">Order {order.id}</h3>
            <div className="text-right">
              <div className="text-sm text-gray-400">Total</div>
              <div className="text-lg font-medium">
                {formatCurrencyWithSeparator(
                  order.orderdetails.order_summary.total
                )}
              </div>
              <span
                className={`mt-1 inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                  order.orderstatus
                )}`}
              >
                {order.orderstatus
                  ? order.orderstatus.charAt(0).toUpperCase() +
                    order.orderstatus.slice(1)
                  : "Unknown"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-400 mt-1 mb-4">
            <span>Placed on {formattedDate}</span>
          </div>

          <h4 className="font-medium mb-4">Order Items</h4>
          <div className="space-y-4">
            {order.orderdetails.products.map((product: any) => (
              <div
                key={product.id}
                className="flex justify-between items-start sm:items-center"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div className="h-12 w-12 min-w-[3rem] bg-[#2a2d36] rounded-md flex items-center justify-center overflow-hidden product-image-container">
                    {product.image && product.image.length > 0 ? (
                      <img
                        src={product.image[0]}
                        alt={product.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                          const container = target.closest(
                            ".product-image-container"
                          );
                          if (container) {
                            container.innerHTML = "";
                            const packageIcon = document.createElement("div");
                            packageIcon.innerHTML = `
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-gray-400">
                                <path d="M16.5 9.4 7.55 4.24" />
                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                                <polyline points="3.29 7 12 12 20.71 7" />
                                <line x1="12" x2="12" y1="22" y2="12" />
                              </svg>
                            `;
                            packageIcon.className =
                              "h-full w-full flex items-center justify-center text-gray-400";
                            container.appendChild(packageIcon);
                          }
                        }}
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Package className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="max-w-[calc(100%-4rem)] sm:max-w-xs">
                    <p className="font-medium line-clamp-2" title={product.name}>
                      {product.name}
                    </p>
                    <p className="text-sm text-gray-400">
                      Qty: {product.quantity}
                    </p>
                  </div>
                </div>
                <p className="whitespace-nowrap ml-2">
                  {formatCurrencyWithSeparator(product.subtotal)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-[#2a2d36]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">Shipping Address</h4>
                <div className="flex items-start gap-2">
                  {/* Optional icon placeholder */}
                  <div className="h-4 w-4 text-gray-400 mt-0.5" />
                  <p className="text-sm text-gray-300">
                    {order.orderdetails.customer.address}
                  </p>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-3">Delivery Information</h4>
                {order.orderstatus &&
                order.orderstatus.toLowerCase() !== "delivered" ? (
                  <p className="text-sm text-gray-300 italic">
                    {order.remark
                      ? order.remark
                      : "to be updated soon by our team"}
                  </p>
                ) : (
                  <p className="text-sm text-gray-300">
                    <span className="text-emerald-500 font-medium">✓</span>{" "}
                    Delivered on {formattedDate}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Subtotal</span>
                <span>
                  {formatCurrencyWithSeparator(
                    order.orderdetails.order_summary.subtotal
                  )}
                </span>
              </div>

              {hasDiscount ? (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400 flex items-center">
                    Discount{" "}
                    {discountCode && (
                      <span className="text-emerald-500 ml-1">
                        ({discountCode})
                      </span>
                    )}
                    <span className="ml-1">
                      {formatDiscountInfo(discountType ?? '', discountRate ?? 0)}
                    </span>
                  </span>
                  <span className="text-emerald-500">
                    -{formatCurrencyWithSeparator(discountAmount ?? 0)}
                  </span>
                </div>
              ) : (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">No discount applied</span>
                  <span>-</span>
                </div>
              )}

              <div className="flex justify-between font-medium pt-2 border-t border-[#2a2d36] mt-2">
                <span>Total</span>
                <span>
                  {formatCurrencyWithSeparator(
                    order.orderdetails.order_summary.total
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Footer with WhatsApp redirect */}
      {isMobile ? (
        <div
          className="sticky bottom-0 z-10 p-6 border-t border-[#2a2d36] bg-[#1a1c23]"
          style={{
            paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 20px))",
          }}
        >
          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <Button
              size="sm"
              className="bg-[#5865f2] hover:bg-[#4752c4] text-white"
              onClick={handleNeedHelpClick}
            >
              Need Help?
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-6 border-t border-[#2a2d36]">
          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <Button
              size="sm"
              className="bg-[#5865f2] hover:bg-[#4752c4] text-white"
              onClick={handleNeedHelpClick}
            >
              Need Help?
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export const OrderDetailsModal = ({
  order,
  open,
  onOpenChange,
}: OrderDetailsModalProps) => {
  const isMobile = useIsMobile();

  return isMobile ? (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className="flex flex-col h-full bg-[#1a1c23] border-t border-[#2a2d36] text-white rounded-t-[10px]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
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

function getStatusColor(status: string = ""): string {
  switch (status.toLowerCase()) {
    case "pending":
      return "bg-orange-500/10 text-orange-500";
    case "processing":
      return "bg-blue-500/10 text-blue-500";
    case "shipped":
      return "bg-violet-500/10 text-violet-500";
    case "delivered":
      return "bg-emerald-500/10 text-emerald-500";
    case "cancelled":
      return "bg-red-500/10 text-red-500";
    default:
      return "bg-gray-500/10 text-gray-500";
  }
}
