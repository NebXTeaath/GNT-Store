// src/pages/Profile/components/DesktopModalProfileView.tsx
import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Save, User, LogOut, Loader2, Info, RefreshCcw, PenSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { usePincodeValidator } from "../pincodeValidator";
import { useLoading } from "@/context/LoadingContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useProfileService } from "../profileService";
import { EmailEditDialog } from "../EmailEditDialog";
import { toast } from "sonner";

interface DesktopModalProfileViewProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function DesktopModalProfileView({ open, onOpenChange }: DesktopModalProfileViewProps) {
    const navigate = useNavigate();
    const { isAuthenticated, user, logout } = useAuth();
    const { validatePincode } = usePincodeValidator();
    const { setIsLoading: setIsLoadingGlobal, setLoadingMessage } = useLoading();
    const [isEmailDialogOpen, setIsEmailDialogOpen] = React.useState(false);

    const personalInfoRef = useRef<HTMLDivElement>(null);
    const shippingInfoRef = useRef<HTMLDivElement>(null);

    const {
        localProfile,
        isLoading: isDataLoading, // Renamed from isLoading for clarity
        isSaving,
        isPincodeLoading,
        charCounts,
        handleInputChange,
        handleSubmit: handleServiceSubmit,
        refreshProfileData,
        isError,
    } = useProfileService(
        validatePincode,
        setLoadingMessage,
        setIsLoadingGlobal // Pass global loading setter if needed by service
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await handleServiceSubmit(e);
    };

    const handleRefresh = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        refreshProfileData();
    };

    useEffect(() => {
        if (!isAuthenticated && open) {
            onOpenChange(false);
            localStorage.setItem("redirectAfterLogin", window.location.pathname);
            navigate("/login");
        }
    }, [isAuthenticated, open, onOpenChange, navigate]);

    const handleLogout = async () => {
        try {
            await logout();
            onOpenChange(false);
            navigate("/");
        } catch (error) {
            console.error("Logout failed:", error);
            toast.error("Logout failed. Please try again.");
        }
    };

    const handleEmailUpdated = (newEmail: string) => {
        setIsEmailDialogOpen(false);
        // No need to manually update localProfile here if service effect handles it
    };

    const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
        ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    // ----- MODIFIED RENDER CONDITION -----
    // Show Skeleton if data is loading OR if loading is done, no error, but profile state is still null
    const showSkeleton = isDataLoading || (!isError && localProfile === null);

    const DesktopProfileContent = (
        <>
            {showSkeleton ? ( // Use the new condition
                // Skeleton UI (Existing Skeleton Code - Keep As Is)
                <div className="space-y-6 p-1">
                    {/* ... existing skeleton structure ... */}
                     <Skeleton className="h-8 w-48 bg-[#2a2d36] mb-8" />
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                         {/* Personal Information Skeleton */}
                         <div className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg p-6">
                             <Skeleton className="h-6 w-36 bg-[#2a2d36] mb-6" />
                             <div className="space-y-6">
                                 {/* ... skeleton fields ... */}
                             </div>
                         </div>
                         {/* Address Skeleton */}
                         <div className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg p-6">
                             <Skeleton className="h-6 w-48 bg-[#2a2d36] mb-6" />
                             <div className="space-y-6">
                                 {/* ... skeleton fields ... */}
                             </div>
                         </div>
                     </div>
                </div> // End Skeleton wrapper
            ) : isError ? (
                // Error UI (Existing Error Code - Keep As Is)
                <div className="text-center text-red-400 p-6 border border-red-600 rounded-lg bg-red-900/20">
                    <p className="mb-4">Error loading profile data.</p>
                    <Button onClick={refreshProfileData} variant="outline" size="sm" className="border-red-500 text-red-300 hover:bg-red-800/50">
                        <RefreshCcw className="mr-2 h-4 w-4" /> Try Again
                    </Button>
                </div>
            ) : ( // If not showSkeleton and not isError, localProfile MUST be non-null (either real or default)
                // Form (Existing Form Code - Keep As Is, uses localProfile)
                 <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Use optional chaining for safety when accessing localProfile properties */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Personal Information Section */}
                        <div ref={personalInfoRef} className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg p-6">
                            <h2 className="text-xl font-bold mb-6 text-white">Personal Information</h2>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-gray-300">Full Name</Label>
                                    <div className="relative">
                                        <Input id="name" name="name" value={localProfile?.name || ""} onChange={handleInputChange} maxLength={50} className="bg-[#2a2d36] border-[#3f4354] text-white pr-16" placeholder="Enter your full name" />
                                        <span className="absolute right-3 top-2.5 text-xs text-gray-400">{charCounts.name}/50</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-gray-300">Email Address</Label>
                                    <div className="relative">
                                        <Input id="email" name="email" type="email" value={localProfile?.email || ""} className="bg-[#2a2d36]/70 border-[#3f4354] text-gray-400 pr-12 cursor-not-allowed" disabled readOnly />
                                        <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-1.5 h-7 w-7 text-gray-400 hover:text-white hover:bg-[#3f4354]" onClick={() => setIsEmailDialogOpen(true)} title="Change Email" >
                                            <PenSquare className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <p className="text-xs text-gray-500 flex items-center pt-1"> <Info className="h-3 w-3 mr-1 flex-shrink-0" /> Click the edit icon to change your email (requires password) </p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone" className="text-gray-300">Phone Number</Label>
                                    <div className="relative">
                                        <Input id="phone" name="phone" type="tel" value={localProfile?.phone || ""} onChange={handleInputChange} className="bg-[#2a2d36] border-[#3f4354] text-white pr-16" placeholder="Enter 10-digit mobile number" maxLength={10} />
                                        <span className="absolute right-3 top-2.5 text-xs text-gray-400">{charCounts.phone}/10</span>
                                    </div>
                                     <p className="text-xs text-gray-500 flex items-center pt-1"> <Info className="h-3 w-3 mr-1 flex-shrink-0" /> Enter 10-digit mobile number (e.g., 9876543210) </p>
                                </div>
                            </div>
                        </div>
                        {/* Shipping & Billing Address Section */}
                        <div ref={shippingInfoRef} className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg p-6">
                            <h2 className="text-xl font-bold mb-6 text-white">Shipping & Billing Address</h2>
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <Label htmlFor="address.line1" className="text-gray-300">Address Line 1</Label>
                                    <div className="relative">
                                        <Input id="address.line1" name="address.line1" value={localProfile?.address?.line1 || ""} onChange={handleInputChange} placeholder="Building, House No., Street Name" maxLength={50} className="bg-[#2a2d36] border-[#3f4354] text-white pr-16" />
                                        <span className="absolute right-3 top-2.5 text-xs text-gray-400">{charCounts.line1}/50</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="address.line2" className="text-gray-300">Address Line 2</Label>
                                    <div className="relative">
                                        <Input id="address.line2" name="address.line2" value={localProfile?.address?.line2 || ""} onChange={handleInputChange} placeholder="Apartment, Suite, Area, Landmark (Optional)" maxLength={50} className="bg-[#2a2d36] border-[#3f4354] text-white pr-16" />
                                        <span className="absolute right-3 top-2.5 text-xs text-gray-400">{charCounts.line2}/50</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                     <div className="space-y-2">
                                         <Label htmlFor="address.zip" className="text-gray-300">PIN Code</Label>
                                         <div className="relative">
                                             <Input id="address.zip" name="address.zip" type="tel" value={localProfile?.address?.zip || ""} onChange={handleInputChange} placeholder="6-digit PIN" maxLength={6} className="bg-[#2a2d36] border-[#3f4354] text-white pr-16" />
                                             <span className="absolute right-3 top-2.5 text-xs text-gray-400">{charCounts.zip}/6</span>
                                         </div>
                                         <p className="text-xs text-gray-500 flex items-center pt-1"> <Info className="h-3 w-3 mr-1 flex-shrink-0" /> Auto-fills City/State </p>
                                     </div>
                                     <div className="space-y-2">
                                         <Label htmlFor="address.city" className="text-gray-300">City</Label>
                                         {isPincodeLoading ? ( <Skeleton className="h-10 w-full bg-[#2a2d36]" /> ) : (
                                             <div className="relative">
                                                 <Input id="address.city" name="address.city" value={localProfile?.address?.city || ""} onChange={handleInputChange} maxLength={50} className="bg-[#2a2d36] border-[#3f4354] text-white pr-16" placeholder="City Name" />
                                                 <span className="absolute right-3 top-2.5 text-xs text-gray-400">{charCounts.city}/50</span>
                                             </div>
                                         )}
                                     </div>
                                     <div className="space-y-2">
                                         <Label htmlFor="address.state" className="text-gray-300">State/Province</Label>
                                         {isPincodeLoading ? ( <Skeleton className="h-10 w-full bg-[#2a2d36]" /> ) : (
                                             <div className="relative">
                                                 <Input id="address.state" name="address.state" value={localProfile?.address?.state || ""} onChange={handleInputChange} maxLength={50} className="bg-[#2a2d36] border-[#3f4354] text-white pr-16" placeholder="State Name" />
                                                 <span className="absolute right-3 top-2.5 text-xs text-gray-400">{charCounts.state}/50</span>
                                             </div>
                                         )}
                                     </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="address.country" className="text-gray-300">Country</Label>
                                    <div className="relative">
                                         <Input id="address.country" name="address.country" value={localProfile?.address?.country || ""} onChange={handleInputChange} maxLength={50} className="bg-[#2a2d36] border-[#3f4354] text-white pr-16" placeholder="Country Name" />
                                         <span className="absolute right-3 top-2.5 text-xs text-gray-400">{charCounts.country}/50</span>
                                     </div>
                                </div>
                            </div>
                        </div>
                    </div>
                 </form>
            )}
        </>
    );

  // Redesigned header with extra right padding to avoid conflicts with a fixed close (X) button
  const headerContent = (
    <div className="flex flex-col space-y-4 pr-10">
      <div className="flex items-start">
        <div className="flex-grow">
          <DialogTitle className="text-2xl font-bold flex gap-3 items-center text-white">
            <User className="h-6 w-6" /> Your Profile
            <Button onClick={handleRefresh} variant="outline" size="sm" className="bg-[#2a2d36] hover:bg-[#3f4354] border-[#3f4354] text-white" disabled={isDataLoading || isSaving}>
          <RefreshCcw className={`h-4 w-4 ${isDataLoading ? "animate-spin" : ""}`} />
        </Button>
          </DialogTitle>
          <DialogDescription className="text-gray-400 mt-1">
            Manage your personal information and shipping details
          </DialogDescription>
        </div>
      </div>
      
    </div>
  );

  const footerContent = (
    <div className="flex items-center justify-end gap-4 w-full">
      <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="bg-[#2a2d36] hover:bg-[#3f4354] border-[#3f4354] text-white" disabled={isSaving}>
      <X /> 
      </Button>
      <Button type="submit" onClick={handleSubmit} className="bg-[#5865f2] hover:bg-[#4752c4]" disabled={isSaving || isDataLoading || !localProfile}>
        {isSaving ? (
          <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving... </>
        ) : (
          <>  Save Changes </>
        )}
      </Button>
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        {/* Expand horizontally and restrict vertical height so that the ScrollArea enables overflow navigation */}
        <DialogContent className="bg-[#0f1115] text-white w-full max-w-[90vw] lg:max-w-[72rem] max-h-[90vh] flex flex-col border-[#2a2d36]">
          <DialogHeader className="mb-4">
            {headerContent}
          </DialogHeader>
          <ScrollArea className="flex-grow pr-3 overflow-y-auto">
            <div className="pb-1">
              {DesktopProfileContent}
            </div>
          </ScrollArea>
          <DialogFooter className="mt-auto pt-4 border-t border-[#2a2d36]">
            {footerContent}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EmailEditDialog
        open={isEmailDialogOpen}
        onOpenChange={setIsEmailDialogOpen}
        currentEmail={localProfile?.email || user?.email || ""} 
        onEmailUpdated={handleEmailUpdated}
      />
    </>
  );
}
