// src/pages/order/orderHistory/OrderCard.tsx
import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Package, Calendar } from "lucide-react";
// Import the specific type directly for clarity
import { FetchedSupabaseOrder } from "@/pages/order/checkout/orderUtils";
import { formatDate } from "./orderService"; // Import formatDate helper
import { Button } from "@/components/ui/button";
import { OrderDetailsModal } from "./OrderDetailsPopup";

// Make sure this function handles potential null/undefined amount safely
const formatCurrencyWithSeparator = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) {
    return 'N/A'; // Or some placeholder
  }
  // Assuming amount is stored correctly (e.g., not in cents if DB stores decimal)
  return amount.toLocaleString('en-IN', { // Changed locale to en-IN as used elsewhere
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

interface OrderCardProps {
  // Use the specific type that comes from the database/RPC
  order: FetchedSupabaseOrder;
}

export const OrderCard = ({ order }: OrderCardProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- Safety Check and Formatting ---
  // Check if order and nested properties exist before accessing
  const orderDetails = order?.order_details;
  const orderSummary = orderDetails?.order_summary;
  const products = orderDetails?.products;

  // Use the formatDate helper from orderService for consistency and safety
  const formattedDate = formatDate(orderDetails?.order_date);

  // Safely get total and status
  const totalAmount = orderSummary?.total; // Can be null/undefined if summary doesn't exist
  const orderStatus = order?.order_status ?? 'Unknown'; // Default if status is missing

  // Safely get product count
  const productCount = products?.length ?? 0;
  // --- End Safety Check ---


  // Handler to toggle modal
  const toggleModal = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click if button is clicked
    setIsModalOpen(!isModalOpen);
  };

  // Click handler for the entire card
  const handleCardClick = () => {
      setIsModalOpen(true);
  };


  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="bg-[#1a1c23] rounded-lg overflow-hidden shadow-sm border border-[#2a2d36] cursor-pointer"
        onClick={handleCardClick} // Use specific handler for card click
      >
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            {/* Safely display order ID */}
            <h3 className="text-lg font-medium text-white">Order #{order?.id?.substring(0, 8) ?? 'N/A'}</h3>
            <div className="text-right">
              <div className="text-sm text-gray-400">Total</div>
              <div className="text-lg font-medium text-white">
                {/* Use safe totalAmount */}
                {formatCurrencyWithSeparator(totalAmount)}
              </div>
              {/* Use safe orderStatus */}
              <span
                className={`mt-1 inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(orderStatus)}`}
              >
                {orderStatus.charAt(0).toUpperCase() + orderStatus.slice(1)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-400 mt-1 mb-4">
            <Calendar className="h-3.5 w-3.5" />
            {/* Display formatted date */}
            <span>Placed on {formattedDate}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-[#2a2d36] rounded-md">
                <Package className="h-5 w-5 text-[#5865f2]" />
              </div>
              <div className="text-sm">
                 {/* Use safe productCount */}
                <span className="text-gray-300">
                  {productCount} item{productCount !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-300 hover:text-white hover:bg-[#2a2d36] flex items-center gap-1"
              onClick={toggleModal} // Button specifically toggles modal
            >
              <span>Show Details</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Order Details Modal - Ensure order prop is passed correctly */}
      {/* Add a check to only render Modal if order exists */}
      {order && (
           <OrderDetailsModal
              order={order} // Pass the full order object
              open={isModalOpen}
              onOpenChange={setIsModalOpen}
            />
      )}

    </>
  );
};

// Keep getStatusColor function (ensure it handles default/unknown status)
function getStatusColor(status: string = ""): string { // Add default value
  switch (status.toLowerCase()) {
    case "pending": return "bg-yellow-500/10 text-yellow-400"; // Adjusted colors slightly
    case "processing": return "bg-blue-500/10 text-blue-400";
    case "shipped": return "bg-violet-500/10 text-violet-400";
    case "delivered": return "bg-emerald-500/10 text-emerald-400";
    case "cancelled": return "bg-red-500/10 text-red-400";
    case "failed": return "bg-red-700/20 text-red-500";
    default: return "bg-gray-500/10 text-gray-400"; // Default for unknown
  }
}