// src/pages/GameLoadService/gameLoadHistory/GameLoadHistoryCard.tsx
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DownloadCloud, ChevronDown, Info } from "lucide-react";
import { FetchedGameLoadRequest, formatDate, formatStatus, getStatusColor } from "@/pages/GameLoadService/gameLoadHistory/gameLoadHistoryService.ts";
import { formatCurrencyWithSeparator } from "@/lib/currencyFormat";

interface GameLoadHistoryCardProps {
  request: FetchedGameLoadRequest;
  onOpenDetails: () => void;
}

export const GameLoadHistoryCard = ({ request, onOpenDetails }: GameLoadHistoryCardProps) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card
        className="bg-[#1a1c23] border-[#2a2d36] overflow-hidden cursor-pointer hover:border-[#5865f2]/80 group"
        onClick={onOpenDetails}
        role="button"
        tabIndex={0}
      >
        <div className={`border-l-4 ${getStatusColor(request.status)} p-4 sm:p-6`}>
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2 text-xs">
                <span className="bg-[#2a2d36] px-2 py-0.5 text-gray-300 rounded whitespace-nowrap">{request.console_type}</span>
                <span className="text-gray-400">ID: {request.id.substring(0, 8)}...</span>
                
                {/* --- NEW: REMARK INDICATOR --- */}
                {request.remark && (
                    <span className="flex items-center gap-1 text-blue-400 bg-blue-900/50 px-2 py-0.5 rounded">
                        <Info className="h-3 w-3" />
                        Update
                    </span>
                )}
              </div>
              <h3 className="text-lg font-semibold text-white mb-1 sm:mb-2 line-clamp-1">
                {request.games_list.length} Games Requested
              </h3>
              <p className="text-xs text-gray-400">Submitted: {formatDate(request.created_at)}</p>
            </div>
            <div className="flex flex-col items-start sm:items-end flex-shrink-0 mt-2 sm:mt-0">
              <p className="font-bold text-xl">{formatCurrencyWithSeparator(request.final_price)}</p>
              <span className={`mt-1 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(request.status)}`}>
                {formatStatus(request.status)}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-[#2a2d36] rounded-md">
                <DownloadCloud className="h-5 w-5 text-[#5865f2]" />
              </div>
              <span className="text-sm text-gray-300">
                {request.storage_addon_added ? 'Storage Add-on Included' : 'No Storage Add-on'}
              </span>
            </div>
            <Button variant="ghost" size="sm" className="text-gray-300 group-hover:text-white group-hover:bg-[#2a2d36]">
              Show Details <ChevronDown className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};