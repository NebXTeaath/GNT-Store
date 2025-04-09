// src/components/ShopDrawer.tsx
"use client";

import React from "react";
import { useNavigate } from "react-router-dom";
// Import Accordion components from your UI library
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

interface ShopDrawerProps {
  onClose: () => void;
}

export default function ShopDrawer({ onClose }: ShopDrawerProps) {
  const navigate = useNavigate();

  // Navigate using replace to avoid extra history entries.
  const handleLinkClick = (path: string) => {
    navigate(path, { replace: true });
    onClose();
  };

  return (
    <Drawer open={true} onOpenChange={onClose}>
      <DrawerContent>
        <div className="px-4 py-2 max-h-[calc(100vh-50px)] overflow-y-auto space-y-6">
          <Accordion type="multiple">
            {/* Gaming Consoles Section */}
            <AccordionItem value="gaming">
              <AccordionTrigger className="text-lg font-bold text-gray-700">
                Gaming Consoles
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2 pl-4">
                  <li>
                    <Button
                      variant="link"
                      onClick={() => handleLinkClick("/gaming-consoles")}
                      className="block text-gray-700"
                    >
                      All Gaming Consoles
                    </Button>
                  </li>
                  <li>
                    <Button
                      variant="link"
                      onClick={() => handleLinkClick("/gaming-consoles/ps5")}
                      className="block text-gray-700"
                    >
                      PlayStation 5 (PS5)
                    </Button>
                  </li>
                  <li>
                    <Button
                      variant="link"
                      onClick={() => handleLinkClick("/gaming-consoles/ps4")}
                      className="block text-gray-700"
                    >
                      PlayStation 4 (PS4)
                    </Button>
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            {/* PC Components Section */}
            <AccordionItem value="pc-components">
              <AccordionTrigger className="text-lg font-bold text-gray-700">
                PC Components
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2 pl-4">
                  <li>
                    <Button
                      variant="link"
                      onClick={() => handleLinkClick("/pc-components")}
                      className="block text-gray-700"
                    >
                      All PC Components
                    </Button>
                  </li>
                  <li>
                    <Button
                      variant="link"
                      onClick={() => handleLinkClick("/pc-components/cpu")}
                      className="block text-gray-700"
                    >
                      CPU
                    </Button>
                  </li>
                  <li>
                    <Button
                      variant="link"
                      onClick={() => handleLinkClick("/pc-components/gpu")}
                      className="block text-gray-700"
                    >
                      GPU
                    </Button>
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Other Shop Items as a flat list */}
          <div>
            <ul className="space-y-2">
              <li>
                <Button
                  variant="link"
                  onClick={() => handleLinkClick("/laptops")}
                  className="block text-gray-700 text-lg font-bold"
                >
                  Laptops
                </Button>
              </li>
              <li>
                <Button
                  variant="link"
                  onClick={() => handleLinkClick("/consolegames")}
                  className="block text-gray-700 text-lg font-bold"
                >
                  Console Games
                </Button>
              </li>
              <li>
                <Button
                  variant="link"
                  onClick={() => handleLinkClick("/pcbuild")}
                  className="block text-gray-700 text-lg font-bold"
                >
                  PC Build
                </Button>
              </li>
            </ul>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
