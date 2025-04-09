//src/pages/order/checkout/Discount/DiscountCodeInput.tsx
import React, { useState } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDiscount } from '@/context/DiscountContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatDiscountInfo } from '@/pages/order/formatDiscountInfo'; // Adjust the import path as necessary
import { formatCurrencyWithSeparator } from '@/lib/currencyFormat';

interface DiscountCodeInputProps {
  subtotal: number;
  className?: string;
}

const DiscountCodeInput: React.FC<DiscountCodeInputProps> = ({ subtotal, className }) => {
  const [inputCode, setInputCode] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const { 
    discountCode, 
    discountRate,
    discountType,
    calculatedDiscountAmount, 
    applyDiscount, 
    removeDiscount,
    isValidatingDiscount 
  } = useDiscount();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if cart subtotal is zero (empty cart)
    if (subtotal <= 0) {
      toast.error("Cannot apply discount", { description: "Please add items to your cart first" });
      return;
    }
    
    if (inputCode.trim()) {
      // Pass both the code and the subtotal to the applyDiscount function
      await applyDiscount(inputCode.trim(), subtotal);
    }
  };
  
  const handleRemoveDiscount = () => {
    removeDiscount();
    setInputCode('');
  };
  
  // If there's already a discount applied, show it instead of the input
  if (discountCode) {
    return (
      <div className={cn("flex justify-between items-center", className)}>
        <div className="flex items-center">
          <span className="text-gray-400 mr-2">Discount</span>
          <div className="flex items-center text-emerald-500 text-sm">
            <Check className="h-3 w-3 mr-1" />
            {discountCode}
            <span className="ml-1 text-gray-400">{formatDiscountInfo(discountType, discountRate)}</span>
            <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6  text-gray-400 hover:text-white hover:bg-transparent"
            onClick={handleRemoveDiscount}
          >
            <X className="h-4 w-4" />
          </Button>
          </div>
        </div>
        <div className="flex items-center">
          <span>- {formatCurrencyWithSeparator(calculatedDiscountAmount)}</span>
        </div>
      </div>
    );
  }
  
  // Check if cart is empty to conditionally disable the discount section
  const isCartEmpty = subtotal <= 0;
  
  // Otherwise show the input or the toggle button
  return (
    <div className={cn("space-y-2", className)}>
      {!isExpanded ? (
        <div 
          className={cn(
            "flex justify-between items-center",
            isCartEmpty ? "text-gray-500 cursor-not-allowed" : "text-gray-400 hover:text-white cursor-pointer"
          )}
          onClick={() => {
            // Only allow expanding if cart is not empty
            if (isCartEmpty) {
              toast.error("Cannot apply discount", { description: "Please add items to your cart first" });
              return;
            }
            setIsExpanded(true);
          }}
        >
          <span>Do you have a discount code?</span>
          <span className="text-sm underline">Add code</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex items-center gap-2 animate-fade-in">
          <Input
            type="text"
            placeholder="Enter discount code"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            className="flex-1 bg-[#2a2d36] border-[#2a2d36] text-white placeholder:text-gray-500"
            disabled={isValidatingDiscount || isCartEmpty}
          />
          <Button 
            type="submit" 
            className="bg-[#5865f2] hover:bg-[#4752c4] text-white"
            disabled={inputCode.trim() === '' || isValidatingDiscount || isCartEmpty}
          >
            {isValidatingDiscount ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : 'Apply'}
          </Button>
        </form>
      )}
    </div>
  );
};

export default DiscountCodeInput;