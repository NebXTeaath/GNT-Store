import { useState } from "react";
import { Tag } from "lucide-react";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/components/global/Mobile/use-mobile";

interface OffersPopoverProps {
  className?: string;
}

export function OffersPopover({ className }: OffersPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size={isMobile ? "icon" : "sm"}
          className={cn(
            "text-gray-300 hover:text-white hover:bg-[#4752c4] relative",
            className
          )}
        >
          <Tag className="h-4 w-4" />
          
          <span className="absolute -top-1 -right-1 flex h-2 w-2 rounded-full bg-red-500">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="center"
        className="w-80 p-4 bg-[#1a1c23] border-[#2a2d36] text-white shadow-lg"
      >
        <div className="flex flex-col">
          <div className="font-medium text-lg mb-2 text-white">Special Offer!</div>
          <p className="text-sm text-gray-300 mb-3">
            Use code <span className="font-bold text-[#5865f2]">newUser</span> to get an additional 5% discount on all orders at checkout.
          </p>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}
              className="text-xs bg-transparent border-[#2a2d36] hover:bg-[#2a2d36] hover:border-[#5865f2] text-gray-300 hover:text-white">
              Got it
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
