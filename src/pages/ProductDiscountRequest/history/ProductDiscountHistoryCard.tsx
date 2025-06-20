// src/pages/ProductDiscountRequest/history/ProductDiscountHistoryCard.tsx
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tag, ChevronDown, Info, Link as LinkIcon } from "lucide-react";
import { formatDate, formatStatus, getStatusColor, getStatusTextColor } from "./productDiscountHistoryService";
import { FetchedProductDiscountRequest } from "@/lib/types/ProductDiscountRequestTypes";
import { formatCurrencyWithSeparator } from "@/lib/currencyFormat";
import { cn } from "@/lib/utils";

interface CardProps {
  request: FetchedProductDiscountRequest;
  onOpenDetails: () => void;
}

export const ProductDiscountHistoryCard = ({ request, onOpenDetails }: CardProps) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card
        className={cn("bg-[#1a1c23] border border-l-4 overflow-hidden cursor-pointer hover:border-[#5865f2]/80 group", getStatusColor(request.status))}
        onClick={onOpenDetails}
        role="button"
        tabIndex={0}
      >
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2 text-xs">
                <span className="bg-[#2a2d36] px-2 py-0.5 text-gray-300 rounded whitespace-nowrap">{request.product_type}</span>
                <span className="text-gray-400">ID: {request.id.substring(0, 8)}...</span>
                {request.remarks && (
                    <span className="flex items-center gap-1 text-blue-400 bg-blue-900/50 px-2 py-0.5 rounded">
                        <Info className="h-3 w-3" /> Update
                    </span>
                )}
              </div>
              <a href={request.product_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="group/link inline-flex items-center gap-1.5 text-lg font-semibold text-white mb-1 sm:mb-2 hover:text-[#5865f2] transition-colors">
                <span className="line-clamp-1">{request.ecom_site} Product</span>
                <LinkIcon className="h-4 w-4 text-gray-400 group-hover/link:text-[#5865f2] transition-colors" />
              </a>
              <p className="text-xs text-gray-400">Requested: {formatDate(request.created_at)}</p>
            </div>
            <div className="flex flex-col items-start sm:items-end flex-shrink-0 mt-2 sm:mt-0">
              <p className={cn("font-bold text-xl", getStatusTextColor(request.status))}>
                {request.our_price ? formatCurrencyWithSeparator(request.our_price) : "Pending"}
              </p>
              <span className={cn("mt-1 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap", getStatusColor(request.status).replace('border-', 'bg-').replace('/80', '/20'), getStatusTextColor(request.status))}>
                {formatStatus(request.status)}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-300">Your Price: <span className="font-medium">{formatCurrencyWithSeparator(request.current_price)}</span></p>
            <Button variant="ghost" size="sm" className="text-gray-300 group-hover:text-white group-hover:bg-[#2a2d36]">
              Show Details <ChevronDown className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};