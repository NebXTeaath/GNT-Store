// src/pages/order/checkout/CartItemRow.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CartItem } from '@/context/CartContext'; // Import the type
import { formatCurrencyWithSeparator } from '@/lib/currencyFormat';
import { toast } from "sonner";

interface CartItemRowProps {
    item: CartItem;
    onUpdateQuantity: (id: string, quantity: number) => void; // Renamed for clarity
    onRemoveItem: (id: string) => void; // Renamed for clarity
}

// Use React.memo to prevent unnecessary re-renders
const CartItemRow = React.memo(({ item, onUpdateQuantity, onRemoveItem }: CartItemRowProps) => {
    const navigate = useNavigate();
    console.log(`Rendering CartItemRow: ${item.title} (ID: ${item.id})`); // Debug log

    const handleDecrease = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (item.quantity > 1) {
            onUpdateQuantity(item.id, item.quantity - 1);
        } else {
            // Optional: Ask for confirmation before removing last item via quantity button
             onRemoveItem(item.id); // Or just call remove directly
        }
    };

    const handleIncrease = (e: React.MouseEvent) => {
        e.stopPropagation();
         if (item.quantity < 99) {
            onUpdateQuantity(item.id, item.quantity + 1);
        } else {
            toast.error("Maximum quantity is 99", { id: `max-quantity-${item.id}` });
        }
    };

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        onRemoveItem(item.id);
    };

     // Navigate to product details page
     const navigateToProduct = () => {
        if (item.slug) {
            navigate(`/product/${item.slug}`);
        } else {
            navigate(`/product/${item.id}`); // Fallback
            console.warn(`Product slug not found for ID: ${item.id}`);
        }
    };


    return (
        <div
            key={item.id} // Key remains important for React's list handling
            onClick={navigateToProduct} // Navigate on row click
            className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg p-4 flex flex-col sm:flex-row items-center sm:items-start gap-4 cursor-pointer hover:border-[#5865f2] transition-colors duration-200"
        >
            {/* Image */}
            <div className="w-24 h-24 bg-[#2a2d36] rounded-md overflow-hidden flex-shrink-0">
                <img
                    src={item.image || "/placeholder.svg"}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    loading="lazy" // Add lazy loading
                />
            </div>
            {/* Details, Quantity, Price, Remove */}
            <div className="flex-1 flex flex-col sm:flex-row justify-between items-center sm:items-start w-full">
                {/* Title */}
                 <div className="text-center sm:text-left mb-4 sm:mb-0 flex-grow mr-4">
                    <h3 className="font-medium text-lg line-clamp-2">{item.title}</h3>
                    {/* Optional: Add other details like condition if needed */}
                 </div>
                 {/* Controls & Price */}
                <div className="flex flex-col sm:flex-row items-center gap-4 flex-shrink-0">
                    {/* Quantity Controls */}
                    <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}> {/* Stop propagation */}
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 bg-transparent border border-gray-600 hover:bg-[#2a2d36]"
                            onClick={handleDecrease}
                            disabled={item.quantity <= 1} // Consider disabling remove via decrease
                            aria-label={`Decrease quantity of ${item.title}`}
                        >
                            <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center font-medium" aria-live="polite" aria-atomic="true">
                            {item.quantity}
                        </span>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 bg-transparent border border-gray-600 hover:bg-[#2a2d36]"
                            onClick={handleIncrease}
                            disabled={item.quantity >= 99}
                             aria-label={`Increase quantity of ${item.title}`}
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                    {/* Price */}
                    <div className="font-medium text-right w-24" aria-label={`Total price for ${item.title}`}>
                         {formatCurrencyWithSeparator(item.discount_price * item.quantity)}
                    </div>
                    {/* Remove Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-400 hover:text-red-500 hover:bg-transparent"
                        onClick={handleRemove}
                        aria-label={`Remove ${item.title} from cart`}
                    >
                        <Trash2 className="h-5 w-5" />
                    </Button>
                </div>
            </div>
        </div>
    );
});

// Explicitly setting displayName is good practice for debugging with memo
CartItemRow.displayName = 'CartItemRow';

export { CartItemRow }; // Export the component