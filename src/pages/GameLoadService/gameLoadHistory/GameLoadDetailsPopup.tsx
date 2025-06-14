// src/components/pages/gameLoadHistory/GameLoadDetailsPopup.tsx
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { FetchedGameLoadRequest, formatDate, formatStatus, getStatusColor } from "@/pages/GameLoadService/gameLoadHistory/gameLoadHistoryService";
import { Button } from "@/components/ui/button";
import { Gamepad2, Package, CheckSquare, XSquare, Info } from "lucide-react";
import { useIsMobile } from "@/components/global/Mobile/use-mobile.tsx";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrencyWithSeparator } from "@/lib/currencyFormat";
import ReactMarkdown from 'react-markdown'; // <<< --- IMPORT MARKDOWN RENDERER
import { cn } from '@/lib/utils'; // Import cn for conditional classes

const adminWhatsAppNumber = import.meta.env.VITE_ADMIN_WHATSAPP;

interface GameLoadDetailsModalProps {
  request: FetchedGameLoadRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Define markdown components for consistent styling (optional but recommended)
const markdownComponents: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  strong: ({ node, ...props }) => <strong className="font-semibold text-base" {...props} />,
  ol: ({ node, ...props }) => <ol className="list-decimal list-inside my-2 pl-4 space-y-1" {...props} />,
  ul: ({ node, ...props }) => <ul className="list-disc list-inside my-2 pl-4 space-y-1" {...props} />,
  li: ({ node, ...props }) => <li className="text-gray-300" {...props} />,
  a: ({ node, ...props }) => <a className="text-blue-400 hover:underline" {...props} />,
};

const GameLoadDetailsContent = ({ request, isMobile }: { request: FetchedGameLoadRequest; isMobile: boolean }) => {
    const handleNeedHelpClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!adminWhatsAppNumber) return alert("Support contact is unavailable.");
        const message = `Need help with my Game Load Service Request #${request.id.substring(0, 36)}`;
        window.open(`https://wa.me/${adminWhatsAppNumber}?text=${encodeURIComponent(message)}`, "_blank");
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-6 border-b border-[#2a2d36]">
                <h2 className="text-xl font-semibold">Game Load Service Details</h2>
            </div>
            <ScrollArea className={isMobile ? "flex-1 min-h-0" : "max-h-[calc(80vh-132px)]"}>
                <div className="px-6 py-4 space-y-6">
                    {/* --- Top section remains the same --- */}
                    <div className="flex justify-between items-start">
                        <h3 className="text-lg font-medium">Request #{request.id.substring(0, 8)}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                            {formatStatus(request.status)}
                        </span>
                    </div>
                    <p className="text-sm text-gray-400">Submitted on {formatDate(request.created_at)}</p>
                    
                    {/* --- Console and Storage Info remains the same --- */}
                    <div className="bg-[#2a2d36] rounded-lg p-4 space-y-3">
                        <div className="flex justify-between"><span className="text-gray-400">Console:</span><span>{request.console_type}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">Available Storage:</span><span>{request.available_storage} {request.storage_unit}</span></div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-400">Storage Add-on:</span>
                            {request.storage_addon_added ? <CheckSquare className="h-5 w-5 text-green-400" /> : <XSquare className="h-5 w-5 text-red-400" />}
                        </div>
                    </div>
                    
                    {/* --- Games list remains the same --- */}
                    <div>
                        <h4 className="font-medium mb-3 flex items-center gap-2"><Package className="h-4 w-4"/>Requested Games</h4>
                        <ul className="list-disc list-inside bg-[#2a2d36] rounded-lg p-4 text-gray-300 space-y-1">
                            {request.games_list.map((game, i) => <li key={i}>{game}</li>)}
                        </ul>
                    </div>

                    {/* --- NEW REMARK SECTION --- */}
                    {request.remark && (
                        <div>
                            <h4 className="font-medium mb-3 flex items-center gap-2"><Info className="h-4 w-4 text-blue-400"/>Updates & Remarks</h4>
                            <div className="bg-[#2a2d36] rounded-lg p-4 text-sm text-gray-300 prose prose-sm prose-invert max-w-none break-words">
                                <ReactMarkdown components={markdownComponents}>
                                    {request.remark}
                                </ReactMarkdown>
                            </div>
                        </div>
                    )}
                    
                    {/* --- Price and Footer remains the same --- */}
                    <div className="pt-4 border-t border-[#2a2d36] text-right">
                        <p className="text-sm text-gray-400">Total Price Paid</p>
                        <p className="text-2xl font-bold">{formatCurrencyWithSeparator(request.final_price)}</p>
                    </div>
                </div>
            </ScrollArea>
            <div className={`p-6 border-t border-[#2a2d36] ${isMobile ? 'sticky bottom-0 bg-[#1a1c23]' : ''}`}>
                <Button size="sm" className="w-full bg-[#5865f2] hover:bg-[#4752c4]" onClick={handleNeedHelpClick}>
                    Need Help?
                </Button>
            </div>
        </div>
    );
};

export const GameLoadDetailsModal = ({ request, open, onOpenChange }: GameLoadDetailsModalProps) => {
    // This part remains unchanged
    const isMobile = useIsMobile();
    if (!request) return null;

    return isMobile ? (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent className="flex flex-col h-full bg-[#1a1c23] border-t border-[#2a2d36] text-white rounded-t-lg">
                <div className="mx-auto mt-4 h-2 w-24 rounded-full bg-[#2a2d36]" />
                <GameLoadDetailsContent request={request} isMobile={true} />
            </DrawerContent>
        </Drawer>
    ) : (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg p-0 bg-[#1a1c23] border-[#2a2d36] text-white flex flex-col">
                <GameLoadDetailsContent request={request} isMobile={false} />
            </DialogContent>
        </Dialog>
    );
};