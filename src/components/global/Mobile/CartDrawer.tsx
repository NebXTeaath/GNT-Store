//src\components\global\Mobile\CartDrawer.tsx
"use client";

import React from "react";
import { useNavigate } from "react-router-dom";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

/**
 * CartDrawerProps defines the prop for closing the drawer.
 */
interface CartDrawerProps {
  onClose: () => void;
}

/**
 * CartDrawer renders a drawer-style sidebar for the cart icon.
 * It shows two buttons: one for Order Details and one for Order History.
 * Tapping a button navigates to the respective page (using replace navigation)
 * and closes the drawer.
 */
export default function CartDrawer({ onClose }: CartDrawerProps) {
  const navigate = useNavigate();

  const handleLinkClick = (path: string) => {
    navigate(path, { replace: true });
    onClose();
  };

  return (
    <Drawer open={true} onOpenChange={onClose}>
      <DrawerContent>
        <div className="px-4 py-2 max-h-[calc(100vh-50px)] overflow-y-auto space-y-4">
          <Button
            variant="outline"
            className="w-full text-left"
            onClick={() => handleLinkClick("/checkout/order-details")}
          >
            Order Details
          </Button>
          <Button
            variant="outline"
            className="w-full text-left"
            onClick={() => handleLinkClick("/order-history")}
          >
            Order History
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
