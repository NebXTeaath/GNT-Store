// src/pages/order/orderHistory/OrderCard.tsx
import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Package, Calendar } from "lucide-react";
import { Order } from "@/pages/order/orderHistory/orderService";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/components/global/Mobile/use-mobile.tsx";
import { OrderDetailsModal } from "./OrderDetailsPopup";

// Updated formatCurrency to support thousands separator and locale-specific formatting
const formatCurrencyWithSeparator = (amount: number) => {
  return amount.toLocaleString('en-US', { 
    style: 'currency', 
    currency: 'INR', 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
};

interface OrderCardProps {
  order: Order;
}

export const OrderCard = ({ order }: OrderCardProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isMobile = useIsMobile();
  
  // Format the order date
  const orderDate = new Date(order.orderdetails.order_date);
  const formattedDate = orderDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  
  // Handler to toggle modal
  const toggleModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsModalOpen(!isModalOpen);
  };

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="bg-[#1a1c23] rounded-lg overflow-hidden shadow-sm border border-[#2a2d36] cursor-pointer"
        onClick={toggleModal}
      >
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h3 className="text-lg font-medium text-white">Order {order.id}</h3>
            <div className="text-right">
              <div className="text-sm text-gray-400">Total</div>
              <div className="text-lg font-medium text-white">
                {formatCurrencyWithSeparator(order.orderdetails.order_summary.total)}
              </div>
              {/* Always display status label below total */}
              <span 
                className={`mt-1 inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.orderstatus)}`}
              >
                {order.orderstatus.charAt(0).toUpperCase() + order.orderstatus.slice(1)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-400 mt-1 mb-4">
            <Calendar className="h-3.5 w-3.5" />
            <span>Placed on {formattedDate}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-[#2a2d36] rounded-md">
                <Package className="h-5 w-5 text-[#5865f2]" />
              </div>
              <div className="text-sm">
                <span className="text-gray-300">
                  {order.orderdetails.products.length} item{order.orderdetails.products.length > 1 ? "s" : ""}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-300 hover:text-white hover:bg-[#2a2d36] flex items-center gap-1"
              onClick={toggleModal}
            >
              <span>Show Details</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.div>
      
      {/* Order Details Modal */}
      <OrderDetailsModal 
        order={order} 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
      />
    </>
  );
};

function getStatusColor(status: string): string {
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
