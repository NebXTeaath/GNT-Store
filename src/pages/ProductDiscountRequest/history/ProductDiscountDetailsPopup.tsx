// src/pages/ProductDiscountRequest/history/ProductDiscountDetailsPopup.tsx
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { formatDate, formatStatus, getStatusTextColor } from "./productDiscountHistoryService";
import { FetchedProductDiscountRequest } from "@/lib/types/ProductDiscountRequestTypes";
import { Button } from "@/components/ui/button";
import { Link as LinkIcon, Info, Tag, ExternalLink } from "lucide-react";
import { useIsMobile } from "@/components/global/Mobile/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrencyWithSeparator } from "@/lib/currencyFormat";
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

const adminWhatsAppNumber = import.meta.env.VITE_ADMIN_WHATSAPP;

interface DetailsModalProps {
  request: FetchedProductDiscountRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DetailsContent = ({ request, isMobile }: { request: FetchedProductDiscountRequest; isMobile: boolean }) => {
    const handleNeedHelpClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!adminWhatsAppNumber) return alert("Support contact is unavailable.");
        const message = `Need help with my Product Discount Request #${request.id.substring(0, 48)}`;
        window.open(`https://wa.me/${adminWhatsAppNumber}?text=${encodeURIComponent(message)}`, "_blank");
    };

    return (
        <div className={`flex flex-col ${isMobile ? 'h-full' : 'h-[80vh]'}`}>
            <div className="p-6 border-b border-[#2a2d36] flex-shrink-0">
                <h2 className="text-xl font-semibold">Discount Request Details</h2>
            </div>
            <ScrollArea className="flex-1 min-h-0 overflow-y-auto">
                <div className={`px-6 py-4 space-y-6 ${isMobile ? 'pb-12' : 'pb-4'}`}>
                    <div className="flex justify-between items-start">
                        <h3 className="text-lg font-medium">Request #{request.id.substring(0, 8)}</h3>
                        <span className={cn("px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap", getStatusTextColor(request.status))}>
                            {formatStatus(request.status)}
                        </span>
                    </div>
                    <p className="text-sm text-gray-400">Submitted on {formatDate(request.created_at)}</p>

                    <div className="bg-[#2a2d36] rounded-lg p-4 space-y-3">
                        <div className="flex justify-between"><span className="text-gray-400">Product Type:</span><span>{request.product_type}</span></div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400">E-com Site:</span>
                            <a href={request.product_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1.5 text-blue-400 hover:underline">
                                {request.ecom_site} <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                        </div>
                    </div>
                    
                    {request.remarks && (
                        <div>
                            <h4 className="font-medium mb-3 flex items-center gap-2"><Info className="h-4 w-4 text-blue-400"/>Admin Remarks</h4>
                            <div className="bg-[#2a2d36] rounded-lg p-4 text-sm text-gray-300 prose prose-sm prose-invert max-w-none break-words">
                                <ReactMarkdown>{request.remarks}</ReactMarkdown>
                            </div>
                        </div>
                    )}
                    
                    <div className="pt-4 border-t border-[#2a2d36] space-y-2">
                        <h4 className="font-medium text-lg mb-2">Price Details</h4>
                        <div className="flex justify-between text-gray-300">
                            <span>Your Submitted Price:</span>
                            <span>{formatCurrencyWithSeparator(request.current_price)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-xl pt-2 border-t border-gray-600 mt-2 text-white">
                            <span>Our Offered Price:</span>
                            <span className={cn(getStatusTextColor(request.status))}>
                                {request.our_price ? formatCurrencyWithSeparator(request.our_price) : "Pending Review"}
                            </span>
                        </div>
                         {request.our_price && request.current_price > request.our_price && (
                             <p className="text-right text-sm text-green-400">
                                You save {formatCurrencyWithSeparator(request.current_price - request.our_price)}!
                             </p>
                         )}
                    </div>
                </div>
            </ScrollArea>
            <div className={`p-6 border-t border-[#2a2d36] flex-shrink-0 ${isMobile ? 'sticky bottom-0 bg-[#1a1c23]' : 'bg-[#1a1c23]'}`}>
                <Button size="sm" className="w-full bg-[#5865f2] hover:bg-[#4752c4]" onClick={handleNeedHelpClick}>
                    Need Help?
                </Button>
            </div>
        </div>
    );
};

export const ProductDiscountDetailsModal = ({ request, open, onOpenChange }: DetailsModalProps) => {
    const isMobile = useIsMobile();
    if (!request) return null;

    return isMobile ? (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent className="flex flex-col h-full bg-[#1a1c23] border-t border-[#2a2d36] text-white rounded-t-lg">
                <DetailsContent request={request} isMobile={true} />
            </DrawerContent>
        </Drawer>
    ) : (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg p-0 bg-[#1a1c23] border-[#2a2d36] text-white flex flex-col max-h-[90vh]">
                <DetailsContent request={request} isMobile={false} />
            </DialogContent>
        </Dialog>
    );
};