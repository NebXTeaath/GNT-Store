//src\components\global\Mobile\mobile-account-sheet.tsx
import { useNavigate } from "react-router-dom";
import { User, Heart, History, Wrench, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

interface MobileAccountSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileAccountSheet({ open, onOpenChange }: MobileAccountSheetProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const displayName = user?.name || user?.email || '';
  
  const handleLogout = async () => {
    try {
      await logout();
      onOpenChange(false);
      toast.success("Successfully logged out");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to log out");
    }
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="bg-[#1a1c23] border-[#2a2d36] text-white p-0">
        <SheetHeader className="p-4 pb-0">
          <SheetTitle className="text-white">Your Account</SheetTitle>
          <SheetDescription className="text-gray-400">
            Welcome back, {displayName}
          </SheetDescription>
        </SheetHeader>
        <Separator className="my-4 bg-[#2a2d36]" />
        <div className="space-y-4 p-4">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-white hover:bg-[#2a2d36] hover:text-white"
            onClick={() => handleNavigation('/profile')}
          >
            <User className="mr-2 h-5 w-5" />
            Profile
          </Button>
          <Separator className="bg-[#2a2d36]" />
          <Button 
            variant="ghost" 
            className="w-full justify-start text-white hover:bg-[#2a2d36] hover:text-white"
            onClick={() => handleNavigation('/wishlist')}
          >
            <Heart className="mr-2 h-5 w-5" />
            Wishlist
          </Button>
          <Separator className="bg-[#2a2d36]" />
          <Button 
            variant="ghost" 
            className="w-full justify-start text-white hover:bg-[#2a2d36] hover:text-white"
            onClick={() => handleNavigation('/order-history')}
          >
            <History className="mr-2 h-5 w-5" />
            Order History
          </Button>
          <Separator className="bg-[#2a2d36]" />
          <Button 
            variant="ghost" 
            className="w-full justify-start text-white hover:bg-[#2a2d36] hover:text-white"
            onClick={() => handleNavigation('/repair-history')}
          >
            <Wrench className="mr-2 h-5 w-5" />
            Repair History
          </Button>
          <Separator className="bg-[#2a2d36]" />
          <Button
            variant="destructive"
            className="w-full mt-6"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-5 w-5" /> 
            Logout
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}