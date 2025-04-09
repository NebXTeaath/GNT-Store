// src/pages/order/checkout/WhatsAppNotification.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MessageSquare, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface WhatsAppNotificationProps {
  id?: string | number;
  onClose?: () => void;
}

const WhatsAppNotification = ({ id, onClose }: WhatsAppNotificationProps) => {
  const navigate = useNavigate();

  const handleGotIt = () => {
    if (onClose) {
      onClose();
    }
    if (id) toast.dismiss(id);
    navigate("/order-history");
  };

  const handleDismiss = () => {
    if (onClose) {
      onClose();
    }
    if (id) toast.dismiss(id);
  };

  return (
    <div className="relative overflow-hidden rounded-lg border border-[#4752c4]/20 bg-white p-6 shadow-lg backdrop-blur-sm dark:bg-[#1A1F2C] dark:border-[#4752c4]/30 transition-all duration-300 ease-in-out">
      <div className="absolute inset-0 bg-gradient-to-r from-[#5865f2]/5 to-[#4752c4]/5 dark:from-[#5865f2]/10 dark:to-[#4752c4]/10" />
      <button 
        onClick={handleDismiss}
        className="absolute right-3 top-3 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors dark:hover:bg-gray-800"
      >
        <X className="h-4 w-4" />
      </button>
      
      <div className="flex items-start gap-4 relative z-10">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#5865f2]/10 dark:bg-[#5865f2]/20">
          <MessageSquare className="h-5 w-5 text-[#5865f2]" />
        </div>
        
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-gray-900 dark:text-white">Support</h4>
            <span className="inline-flex h-2 w-2 rounded-full bg-green-500" />
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-300">
            A team member will contact you via WhatsApp soon. You can also access support through the "Need Help" button in your order history.
          </p>
          
          <div className="flex items-center gap-3 pt-1">
            <Button
              onClick={handleGotIt}
              className={cn(
                "bg-[#5865f2] hover:bg-[#4752c4] text-white transition-all",
                "shadow-md hover:shadow-lg",
                "active:translate-y-0.5"
              )}
            >
              Got It
            </Button>
            
            <button 
              onClick={handleDismiss}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Module-level variable to ensure only one WhatsApp toast is active
let activeWhatsAppNotificationId: string | number | null = null;

export const showWhatsAppNotification = (onClose?: () => void) => {
  // If there is already an active notification, do not create a new one.
  if (activeWhatsAppNotificationId !== null) {
    return activeWhatsAppNotificationId;
  }
  const id = toast.custom(
    (id) => (
      <WhatsAppNotification
        id={id}
        onClose={() => {
          if (onClose) {
            onClose();
          }
          // Clear the active notification flag when the toast is dismissed.
          activeWhatsAppNotificationId = null;
        }}
      />
    ),
    { 
      position: "top-center",
      duration: Infinity,
      className: "my-toast-container"
    }
  );
  activeWhatsAppNotificationId = id;
  return id;
};

export default WhatsAppNotification;
