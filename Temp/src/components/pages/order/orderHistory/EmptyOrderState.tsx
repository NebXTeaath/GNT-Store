//src/pages/order/orderHistory/EmptyOrderState.tsx
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyOrderStateProps {
  searchQuery?: string;
}

export const EmptyOrderState = ({ searchQuery }: EmptyOrderStateProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="bg-[#1a1c23] rounded-lg p-10 text-center shadow-sm border border-[#2a2d36]"
    >
      <div className="w-16 h-16 bg-[#2a2d36] rounded-full flex items-center justify-center mx-auto mb-6">
        <PackageOpen className="h-8 w-8 text-[#5865f2]" />
      </div>
      <h3 className="text-xl font-medium text-white mb-2">
        {searchQuery ? "No matching orders found" : "No orders yet"}
      </h3>
      <p className="text-gray-400 max-w-md mx-auto mb-6">
        {searchQuery
          ? `We couldn't find any orders matching "${searchQuery}". Try a different search term or browse all your orders.`
          : "Looks like you haven't placed any orders yet. Start shopping to see your orders here."}
      </p>
      <Button asChild className="bg-[#5865f2] hover:bg-[#4752c4] text-white">
        <Link to="/">Continue Shopping</Link>
      </Button>
    </motion.div>
  );
};

