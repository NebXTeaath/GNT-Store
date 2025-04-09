// src/pages/Profile/ProfilePreviewButton.tsx
"use client";

import React, { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UserRound, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ProfileIndex } from "@/pages/Profile/components/ProfileIndex";
import { useAuth } from "@/context/AuthContext";
import LoginModal from "@/pages/Login/LoginModal";
// *** Import the hook correctly ***
import { useUserProfileQuery } from '@/components/global/hooks/useUserProfileData';

// Define the Skeleton component separately for clarity
const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
    <Card className={`w-full bg-[#1a1c23] border border-[#2a2d36] ${className}`}>
        <CardContent className="p-4">
            <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full bg-[#2a2d36]" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/5 bg-[#2a2d36]" />
                    <Skeleton className="h-4 w-4/5 bg-[#2a2d36]" />
                    <Skeleton className="h-4 w-2/5 bg-[#2a2d36]" />
                </div>
            </div>
            <div className="mt-3 space-y-1 pt-2 border-t border-dashed border-gray-700/50">
                <Skeleton className="h-3 w-full bg-[#2a2d36]" />
                <Skeleton className="h-3 w-3/4 bg-[#2a2d36]" />
            </div>
        </CardContent>
    </Card>
);


const ProfilePreviewButton: React.FC<{ className?: string }> = ({ className }) => {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [loginModalOpen, setLoginModalOpen] = useState(false);
    const { isAuthenticated } = useAuth();

    // Get query status along with other states
    const {
        data: userProfile,
        isLoading,
        isFetching,
        isError,
        error,
        refetch,
        status: queryStatus // <<<--- Get the detailed status
    } = useUserProfileQuery();

    // --- Handlers (remain unchanged) ---
    const dismissKeyboard = useCallback(() => {
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && typeof activeElement.blur === 'function') {
            activeElement.blur();
        }
    }, []);

    const handleOpenDrawer = () => {
        dismissKeyboard();
        setTimeout(() => {
            setDrawerOpen(true);
        }, 100);
    };

    const handleProfileClick = () => {
        if (isAuthenticated) {
            handleOpenDrawer();
        } else {
            setLoginModalOpen(true);
        }
    };

    const handleLoginSuccess = () => {
        setLoginModalOpen(false);
        toast.success("Login successful! Profile data is loading.");
    };

    const handleRetry = () => {
        refetch();
    };

    // --- Rendering Logic ---

    // Define the pulse animation style
    const pulseAnimationStyle = <style>{`.animate-pulse-border { animation: pulse-border 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; } @keyframes pulse-border { 0%, 100% { border-color: rgba(248, 113, 113, 0.7); } 50% { border-color: rgba(248, 113, 113, 0.3); } }`}</style>;

    // ----- Determine Skeleton State -----
    // Show skeleton if:
    // 1. Query is actively loading (`isLoading` is true, covers initial 'pending').
    // 2. Query is refetching (`isFetching` is true).
    // 3. Query is 'idle' BUT the user IS authenticated (query *should* run but hasn't started yet).
    const shouldShowSkeleton = isLoading || isFetching || (queryStatus === 'pending' && isAuthenticated);

    if (shouldShowSkeleton) {
        return <SkeletonCard className={className} />;
    }

    // ----- Settled States Rendering -----
    // At this point, the query is settled ('success' or 'error') OR it's 'idle' because the user is not authenticated.

    // 1. Error State (Query settled with an error)
    if (isError) { // isError is usually true when status is 'error'
        console.error("Profile Preview Error:", error);
        return (
            <>
                <Card className={`w-full bg-red-900/20 border border-red-700 ${className}`}>
                    {pulseAnimationStyle}
                    <CardContent className="p-4 text-center text-red-400">
                        Could not load profile.
                        <Button variant="link" onClick={handleRetry} className="text-red-300 p-0 h-auto ml-2">Retry?</Button>
                    </CardContent>
                </Card>
                <LoginModal open={loginModalOpen} onOpenChange={setLoginModalOpen} onLoginSuccess={handleLoginSuccess} />
                {isAuthenticated && <ProfileIndex open={drawerOpen} onOpenChange={setDrawerOpen} />}
            </>
        );
    }

    // 2. Not Authenticated (Query might be 'idle' or potentially 'success'/'error' from a previous user - check auth first)
    if (!isAuthenticated) {
        return (
            <>
                <Card
                    className={`w-full cursor-pointer bg-[#1a1c23] border border-[#2a2d36] hover:border-[#3f4354] transition-colors ${className}`}
                    onClick={() => setLoginModalOpen(true)}
                >
                    {/* No pulse needed */}
                    <CardContent className="p-4 text-center">
                        <Button variant="ghost" className="text-white hover:bg-[#5865f2]/20 w-full justify-center">
                            <UserRound className="mr-2 h-4 w-4" /> Sign In / Sign Up
                        </Button>
                    </CardContent>
                </Card>
                <LoginModal open={loginModalOpen} onOpenChange={setLoginModalOpen} onLoginSuccess={handleLoginSuccess} />
            </>
        );
    }

    // ----- Authenticated & Settled States -----
    // At this point: Query settled ('success'), no error, user IS authenticated.

    // Calculate completeness *only* now when data is available
     const isProfileComplete = Boolean(
        userProfile && // We know queryStatus is 'success' here
        userProfile.name &&
        userProfile.email &&
        userProfile.phone &&
        userProfile.address?.line1 &&
        userProfile.address?.city &&
        userProfile.address?.state &&
        userProfile.address?.zip &&
        userProfile.address?.country
    );
     const showIncompleteWarning = userProfile && !isProfileComplete; // Simplified check


    // 3. Authenticated, Settled, No Profile Data Found (Query 'success' but data is null/empty)
    if (!userProfile) {
        return (
            <>
                <Card
                    className={`w-full cursor-pointer bg-[#1a1c23] border border-[#2a2d36] hover:border-[#5865f2]/80 transition-colors ${className}`}
                    onClick={handleOpenDrawer}
                >
                    {/* No pulse needed */}
                    <CardContent className="p-4 text-center">
                        <Button variant="ghost" className="text-white hover:bg-[#5865f2]/20 justify-center">
                            <UserRound className="mr-2 h-4 w-4" /> Set Up Your Profile
                        </Button>
                    </CardContent>
                </Card>
                <ProfileIndex open={drawerOpen} onOpenChange={setDrawerOpen} />
            </>
        );
    }

    // 4. Authenticated, Settled, Profile Data Exists (Final desired state)
    const cardClassName = `w-full transition-colors bg-[#1a1c23] ${className} ${showIncompleteWarning ? "border-red-500/70 animate-pulse-border" : "border-[#2a2d36]"
        } cursor-pointer hover:border-[#5865f2]/80`; // Auth is true here

    return (
        <>
            <Card className={cardClassName} onClick={handleProfileClick}>
                {pulseAnimationStyle} {/* Applied conditionally via cardClassName */}
                <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                        {/* Icon */}
                        <div className="rounded-full bg-[#5865f2]/10 p-3 flex-shrink-0">
                            <UserRound className="h-6 w-6 text-[#5865f2]" />
                        </div>
                        {/* Details */}
                        <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-lg text-white truncate" title={userProfile.name}>{userProfile.name || "Name not set"}</h3>
                            <p className="text-sm text-gray-400 truncate" title={userProfile.email}>{userProfile.email || "Email not set"}</p>
                            <p className="text-sm text-gray-400 truncate" title={userProfile.phone}>{userProfile.phone || 'Phone not set'}</p>
                            {/* Address Preview */}
                            {userProfile.address?.line1 ? (
                                <div className="mt-2 text-xs text-gray-500 truncate">
                                    <p title={`${userProfile.address.line1}${userProfile.address.line2 ? `, ${userProfile.address.line2}` : ''}`}>
                                        {userProfile.address.line1}{userProfile.address.line2 ? `, ${userProfile.address.line2}` : ''}
                                    </p>
                                    <p title={`${userProfile.address.city}, ${userProfile.address.state} ${userProfile.address.zip}`}>
                                        {userProfile.address.city}, {userProfile.address.state} {userProfile.address.zip}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-xs text-gray-500 mt-2">Address not set</p>
                            )}
                        </div>
                    </div>
                    {/* Incomplete Warning */}
                    {showIncompleteWarning && (
                        <div className="mt-3 p-3 bg-red-900/20 border border-red-500/30 rounded text-red-400 text-xs sm:text-sm flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            <span>Please complete your profile information. Click to edit.</span>
                        </div>
                    )}
                </CardContent>
            </Card>
            {/* Modals */}
            <ProfileIndex open={drawerOpen} onOpenChange={setDrawerOpen} />
            {/* <LoginModal open={loginModalOpen} onOpenChange={setLoginModalOpen} onLoginSuccess={handleLoginSuccess} /> */}
        </>
    );
};

export default ProfilePreviewButton;