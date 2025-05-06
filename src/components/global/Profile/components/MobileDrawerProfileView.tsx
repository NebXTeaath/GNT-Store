// src/pages/Profile/components/MobileDrawerProfileView.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Loader2, Info, RefreshCcw, PenSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { usePincodeValidator } from "../pincodeValidator";
import { useLoading } from "@/components/global/Loading/LoadingContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import { useProfileService } from "../profileService";
import { EmailEditDialog } from "../EmailEditDialog"; // Ensure import

interface MobileDrawerProfileViewProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function MobileDrawerProfileView({ open, onOpenChange }: MobileDrawerProfileViewProps) {
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuth();
    const { validatePincode } = usePincodeValidator();
    const { setIsLoading: setIsLoadingGlobal, setLoadingMessage } = useLoading();
    const [isKeyboardOpen, setIsKeyboardOpen] = useState(false); // Keep keyboard state
    const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
    const [emailChangePending, setEmailChangePending] = useState(false); // <-- Add state

    const {
        localProfile,
        isLoading: isDataLoading,
        isSaving,
        isPincodeLoading,
        isError,
        charCounts,
        handleInputChange,
        handleSubmit: handleServiceSubmit,
        refreshProfileData,
    } = useProfileService(
        validatePincode,
        setLoadingMessage,
        setIsLoadingGlobal
    );

    // Effect for keyboard detection (keep as is)
    useEffect(() => {
        const handleResize = () => { const vh = window.innerHeight * 0.01; document.documentElement.style.setProperty('--vh', `${vh}px`); setIsKeyboardOpen(window.innerHeight < window.outerHeight * 0.8); }; handleResize(); window.addEventListener('resize', handleResize); return () => window.removeEventListener('resize', handleResize);
    }, []);
    // Effect for back button handling (keep as is)
    useEffect(() => {
       const handlePopState = (event: PopStateEvent) => { if (open) { event.preventDefault(); onOpenChange(false); } }; window.addEventListener('popstate', handlePopState); return () => window.removeEventListener('popstate', handlePopState);
    }, [open, onOpenChange]);
    // Effect to redirect if not authenticated (keep as is)
    useEffect(() => {
        if (!isAuthenticated && open) { onOpenChange(false); localStorage.setItem("redirectAfterLogin", window.location.pathname); navigate("/login"); }
    }, [isAuthenticated, open, onOpenChange, navigate]);

    // Effect to clear pending state when dialog closes
    useEffect(() => {
        if (!open) {
            setEmailChangePending(false);
        }
    }, [open]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!emailChangePending) {
            await handleServiceSubmit(e);
        } else {
             console.log("Save prevented due to pending email change.");
        }
    };

    const handleRefresh = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setEmailChangePending(false); // Clear pending state on refresh
        refreshProfileData();
    };

    // Callback from EmailEditDialog when request is successfully *sent*
    const handleEmailUpdateRequestSent = (_newEmail: string) => {
        setIsEmailDialogOpen(false);
        setEmailChangePending(true); // Set pending state
        // Optional: Timer to clear pending state
        // setTimeout(() => setEmailChangePending(false), 60000);
    };

    // Determine if skeleton should be shown
    const showSkeleton = isDataLoading || (!isError && localProfile === null);

    // --- Main Content Rendering ---
    const MobileProfileContent = (
        <>
            {showSkeleton ? (
                <div className="space-y-6 p-1"> <Skeleton className="h-8 w-48 bg-[#2a2d36] mb-8" /> <div className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg p-6 mb-6"> <Skeleton className="h-6 w-36 bg-[#2a2d36] mb-6" /> <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> <div className="space-y-2"><Skeleton className="h-4 w-20 bg-[#2a2d36]"/><Skeleton className="h-10 w-full bg-[#2a2d36]"/></div> <div className="space-y-2"><Skeleton className="h-4 w-24 bg-[#2a2d36]"/><Skeleton className="h-10 w-full bg-[#2a2d36]"/></div> <div className="space-y-2 md:col-span-2"><Skeleton className="h-4 w-28 bg-[#2a2d36]"/><Skeleton className="h-10 w-full bg-[#2a2d36]"/></div> </div> </div> <div className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg p-6"> <Skeleton className="h-6 w-48 bg-[#2a2d36] mb-6" /> <div className="space-y-4"> <div className="space-y-2"><Skeleton className="h-4 w-32 bg-[#2a2d36]"/><Skeleton className="h-10 w-full bg-[#2a2d36]"/></div> <div className="space-y-2"><Skeleton className="h-4 w-32 bg-[#2a2d36]"/><Skeleton className="h-10 w-full bg-[#2a2d36]"/></div> <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> <div className="space-y-2"><Skeleton className="h-4 w-16 bg-[#2a2d36]"/><Skeleton className="h-10 w-full bg-[#2a2d36]"/></div> <div className="space-y-2"><Skeleton className="h-4 w-16 bg-[#2a2d36]"/><Skeleton className="h-10 w-full bg-[#2a2d36]"/></div> <div className="space-y-2"><Skeleton className="h-4 w-16 bg-[#2a2d36]"/><Skeleton className="h-10 w-full bg-[#2a2d36]"/></div> </div> <div className="space-y-2"><Skeleton className="h-4 w-24 bg-[#2a2d36]"/><Skeleton className="h-10 w-full bg-[#2a2d36]"/></div> </div> </div> </div>
            ) : isError ? (
                 <div className="text-center text-red-400 p-6 border border-red-600 rounded-lg bg-red-900/20"> <p className="mb-4">Error loading profile data.</p> <Button onClick={refreshProfileData} variant="outline" size="sm" className="border-red-500 text-red-300 hover:bg-red-800/50"> <RefreshCcw className="mr-2 h-4 w-4"/> Try Again </Button> </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Personal Info */}
                    <div className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg p-6">
                        <h2 className="text-xl font-bold mb-4 text-white">Personal Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Name */}
                            <div className="space-y-2"> <Label htmlFor="name" className="text-gray-300">Full Name</Label> <div className="relative"> <Input id="name" name="name" value={localProfile?.name || ""} onChange={handleInputChange} maxLength={50} className="bg-[#2a2d36] border-[#3f4354] text-white pr-16" placeholder="Enter your full name"/> <span className="absolute right-3 top-2.5 text-xs text-gray-400"> {charCounts.name}/50 </span> </div> </div>
                            {/* Email */}
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-gray-300">Email Address</Label>
                                <div className="relative"> <Input id="email" name="email" type="email" value={localProfile?.email || ""} className="bg-[#2a2d36]/70 border-[#3f4354] text-gray-400 pr-12 cursor-not-allowed" disabled readOnly/> <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-1.5 h-7 w-7 text-gray-400 hover:text-white hover:bg-[#3f4354]" onClick={() => setIsEmailDialogOpen(true)} title="Change Email" > <PenSquare className="h-4 w-4" /> </Button> </div>
                                {/* Pending Email Change Message */}
                                {emailChangePending ? (
                                   <p className="text-xs text-yellow-400 flex items-center pt-1"> <Info className="h-3 w-3 mr-1 flex-shrink-0" /> Email change pending. Check inbox. </p>
                                ) : (
                                   <p className="text-xs text-gray-500 flex items-center pt-1"> <Info className="h-3 w-3 mr-1 flex-shrink-0" /> Click edit to change (requires confirmation). </p>
                                )}
                            </div>
                            {/* Phone */}
                            <div className="space-y-2 md:col-span-2"> <Label htmlFor="phone" className="text-gray-300">Phone Number</Label> <div className="relative"> <Input id="phone" name="phone" type="tel" value={localProfile?.phone || ""} onChange={handleInputChange} className="bg-[#2a2d36] border-[#3f4354] text-white pr-16" placeholder="Enter 10-digit mobile number" maxLength={10} /> <span className="absolute right-3 top-2.5 text-xs text-gray-400"> {charCounts.phone}/10 </span> </div> <p className="text-xs text-gray-500 flex items-center pt-1"> <Info className="h-3 w-3 mr-1 flex-shrink-0" /> Enter 10-digit mobile number (e.g., 9876543210) </p> </div>
                        </div>
                    </div>
                    {/* Address Info */}
                    <div className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg p-6">
                         <h2 className="text-xl font-bold mb-4 text-white">Shipping & Billing Address</h2>
                         <div className="space-y-4">
                             <div className="space-y-2"> <Label htmlFor="address.line1" className="text-gray-300">Address Line 1</Label> <div className="relative"> <Input id="address.line1" name="address.line1" value={localProfile?.address?.line1 || ""} onChange={handleInputChange} placeholder="Building, House No., Street Name" maxLength={50} className="bg-[#2a2d36] border-[#3f4354] text-white pr-16" /> <span className="absolute right-3 top-2.5 text-xs text-gray-400"> {charCounts.line1}/50 </span> </div> </div>
                             <div className="space-y-2"> <Label htmlFor="address.line2" className="text-gray-300">Address Line 2</Label> <div className="relative"> <Input id="address.line2" name="address.line2" value={localProfile?.address?.line2 || ""} onChange={handleInputChange} placeholder="Apartment, Suite, Area, Landmark (Optional)" maxLength={50} className="bg-[#2a2d36] border-[#3f4354] text-white pr-16" /> <span className="absolute right-3 top-2.5 text-xs text-gray-400"> {charCounts.line2}/50 </span> </div> </div>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                 <div className="space-y-2"> <Label htmlFor="address.zip" className="text-gray-300">PIN Code</Label> <div className="relative"> <Input id="address.zip" name="address.zip" type="tel" value={localProfile?.address?.zip || ""} onChange={handleInputChange} placeholder="6-digit PIN" maxLength={6} className="bg-[#2a2d36] border-[#3f4354] text-white pr-16"/> <span className="absolute right-3 top-2.5 text-xs text-gray-400"> {charCounts.zip}/6 </span> </div> <p className="text-xs text-gray-500 flex items-center pt-1"> <Info className="h-3 w-3 mr-1 flex-shrink-0" /> Auto-fills City/State </p> </div>
                                  <div className="space-y-2"> <Label htmlFor="address.city" className="text-gray-300">City</Label> {isPincodeLoading ? ( <Skeleton className="h-10 w-full bg-[#2a2d36]" /> ) : ( <div className="relative"> <Input id="address.city" name="address.city" value={localProfile?.address?.city || ""} onChange={handleInputChange} maxLength={50} className="bg-[#2a2d36] border-[#3f4354] text-white pr-16" placeholder="City Name"/> <span className="absolute right-3 top-2.5 text-xs text-gray-400"> {charCounts.city}/50 </span> </div> )} </div>
                                  <div className="space-y-2"> <Label htmlFor="address.state" className="text-gray-300">State/Province</Label> {isPincodeLoading ? ( <Skeleton className="h-10 w-full bg-[#2a2d36]" /> ) : ( <div className="relative"> <Input id="address.state" name="address.state" value={localProfile?.address?.state || ""} onChange={handleInputChange} maxLength={50} className="bg-[#2a2d36] border-[#3f4354] text-white pr-16" placeholder="State Name"/> <span className="absolute right-3 top-2.5 text-xs text-gray-400"> {charCounts.state}/50 </span> </div> )} </div>
                             </div>
                            <div className="space-y-2"> <Label htmlFor="address.country" className="text-gray-300">Country</Label> <div className="relative"> <Input id="address.country" name="address.country" value={localProfile?.address?.country || ""} onChange={handleInputChange} maxLength={50} className="bg-[#2a2d36] border-[#3f4354] text-white pr-16" placeholder="Country Name"/> <span className="absolute right-3 top-2.5 text-xs text-gray-400"> {charCounts.country}/50 </span> </div> </div>
                        </div>
                    </div>
                </form>
            )}
        </>
    );


    // --- Header/Footer Rendering Logic ---
    const headerContent = ( <div className="flex flex-col"> <div className="flex justify-between items-start"> <div> <DrawerTitle className="text-2xl font-bold flex gap-2 items-center text-white"> <User className="h-6 w-6" /> Your Profile <Button onClick={handleRefresh} variant="outline" size="sm" className="bg-[#2a2d36] hover:bg-[#3f4354] border-[#3f4354] text-white" disabled={isDataLoading || isSaving} > <RefreshCcw className={` h-4 w-4 ${isDataLoading ? "animate-spin" : ""}`} /> </Button> </DrawerTitle> <DrawerDescription className="text-gray-400 mt-1"> Manage your personal information and shipping details </DrawerDescription> </div> </div> </div>);
    const footerContent = ( <div className="flex items-center justify-end gap-4 w-full"> <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="bg-[#2a2d36] hover:bg-[#3f4354] border-[#3f4354] text-white" disabled={isSaving} > <X /> </Button> <Button type="submit" onClick={handleSubmit} className="bg-[#5865f2] hover:bg-[#4752c4]" disabled={isSaving || isDataLoading || !localProfile || emailChangePending /* Disable save if pending */} > {isSaving ? ( <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving... </> ) : emailChangePending ? ( <>Confirm Email</> ) : ( <> Save </> )} </Button> </div>);

    // --- Drawer Rendering ---
    return (
        <>
            <Drawer open={open} onOpenChange={onOpenChange} repositionInputs={false}>
                <DrawerContent className="bg-[#0f1115] text-white border-[#2a2d36] p-4 pb-6 max-h-[90vh] flex flex-col">
                    {!isKeyboardOpen && ( <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-[#2a2d36] mb-4" /> )}
                    {isKeyboardOpen ? ( <div className="sticky top-0 z-10 bg-[#0f1115] py-1 mb-1 border-b border-[#2a2d36]"> <h3 className="text-base font-medium text-white flex items-center justify-between"> <span className="flex items-center"> <User className="mr-1 h-4 w-4" /> Profile </span> </h3> </div> ) : ( <DrawerHeader className="text-left px-0 pt-0 mb-4 flex-shrink-0"> {headerContent} </DrawerHeader> )}
                    <ScrollArea
                        className={`flex-grow overflow-y-auto ${isKeyboardOpen ? 'mb-1' : 'mb-2'}`}
                        style={{ overscrollBehavior: 'contain' }}
                        >
                        {MobileProfileContent}
                        </ScrollArea>
                    {isKeyboardOpen ? ( <div className="fixed bottom-0 left-0 right-0 z-10 bg-[#0f1115] border-t border-[#2a2d36] py-1 px-4 h-10 flex justify-end items-center"> <div className="flex gap-2"> <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="h-7 px-2 text-sm" disabled={isSaving}> Cancel </Button> <Button type="submit" onClick={handleSubmit} className="h-7 px-2 text-sm bg-[#5865f2] hover:bg-[#4752c4]" disabled={isSaving || isDataLoading || localProfile === null || emailChangePending /* Disable save if pending */}> {isSaving ? "Saving..." : emailChangePending ? "Confirm Email" : "Save"} </Button> </div> </div> ) : ( <DrawerFooter className="mt-auto p-0 pt-4 bg-[#0f1115] border-t border-[#2a2d36] flex-shrink-0"> {footerContent} </DrawerFooter> )}
                </DrawerContent>
            </Drawer>

            {/* Email Edit Dialog */}
            <EmailEditDialog
                open={isEmailDialogOpen}
                onOpenChange={setIsEmailDialogOpen}
                currentEmail={localProfile?.email || user?.email || ""}
                onEmailUpdated={handleEmailUpdateRequestSent} // <-- Use the new handler
            />
        </>
    );
}