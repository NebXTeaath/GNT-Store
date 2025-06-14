// src/components/global/Mobile/ServicesDrawer.tsx
import { useNavigate } from "react-router-dom";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Wrench, DownloadCloud } from "lucide-react";
import { useLoading } from "@/components/global/Loading/LoadingContext";

interface ServicesDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ServicesDrawer({ open, onOpenChange }: ServicesDrawerProps) {
  const navigate = useNavigate();
  const { setIsLoading, setLoadingMessage } = useLoading();

  const handleNavigation = (path: string, message: string) => {
    setLoadingMessage(message);
    setIsLoading(true);
    onOpenChange(false);
    setTimeout(() => {
      navigate(path);
      // Loading will be set to false by LoadingRouteListener
    }, 300);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-[#1a1c23] border-t border-[#2a2d36] text-white">
        <DrawerHeader className="text-center">
          <DrawerTitle>Our Services</DrawerTitle>
          <DrawerDescription>Choose a service to get started.</DrawerDescription>
        </DrawerHeader>
        <div className="p-4 pb-8 space-y-4">
          <Button
            variant="outline"
            className="w-full justify-center text-lg py-8 bg-transparent border-gray-600 hover:bg-[#2a2d36]"
            onClick={() => handleNavigation('/repair-home', 'Loading Repair Services...')}
          >
            <Wrench className="mr-3 h-6 w-6" />
            Repair Services
          </Button>
          <Button
            variant="outline"
            className="w-full justify-center text-lg py-8 bg-transparent border-gray-600 hover:bg-[#2a2d36]"
            onClick={() => handleNavigation('/game-load-service', 'Loading Game Services...')}
          >
            <DownloadCloud className="mr-3 h-6 w-6" />
            Game Load Service
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}