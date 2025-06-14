// src/components/global/Profile/ProfilePreviewButton.tsx
"use client";

import React, { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UserRound, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileIndex } from "@/components/global/Profile/components/ProfileIndex";
import { useAuth } from "@/context/AuthContext";
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
    // Use the global modal opener from context instead of local state
    const { isAuthenticated, openLoginModal } = useAuth();

    const {
        data: userProfile,
        isLoading,
        isFetching,
        isError,
        error,
        refetch,
        status: queryStatus
    } = useUserProfileQuery();

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
            // Call the context function to open the global modal
            openLoginModal();
        }
    };

    const handleRetry = () => {
        refetch();
    };

    const pulseAnimationStyle = <style>{`.animate-pulse-border { animation: pulse-border 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; } @keyframes pulse-border { 0%, 100% { border-color: rgba(248, 113, 113, 0.7); } 50% { border-color: rgba(248, 113, 113, 0.3); } }`}</style>;

    const shouldShowSkeleton = isLoading || isFetching || (queryStatus === 'pending' && isAuthenticated);

    if (shouldShowSkeleton) {
        return <SkeletonCard className={className} />;
    }

    if (isError) {
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
                {isAuthenticated && <ProfileIndex open={drawerOpen} onOpenChange={setDrawerOpen} />}
            </>
        );
    }

    if (!isAuthenticated) {
        return (
            <Card
                className={`w-full cursor-pointer bg-[#1a1c23] border border-[#2a2d36] hover:border-[#3f4354] transition-colors ${className}`}
                onClick={() => openLoginModal()}
            >
                <CardContent className="p-4 text-center">
                    <Button variant="ghost" className="text-white hover:bg-[#5865f2]/20 w-full justify-center">
                        <UserRound className="mr-2 h-4 w-4" /> Sign In / Sign Up
                    </Button>
                </CardContent>
            </Card>
        );
    }

    const isProfileComplete = Boolean(
        userProfile &&
        userProfile.name &&
        userProfile.email &&
        userProfile.phone &&
        userProfile.address?.line1 &&
        userProfile.address?.city &&
        userProfile.address?.state &&
        userProfile.address?.zip &&
        userProfile.address?.country
    );
    const showIncompleteWarning = userProfile && !isProfileComplete;

    if (!userProfile) {
        return (
            <>
                <Card
                    className={`w-full cursor-pointer bg-[#1a1c23] border border-[#2a2d36] hover:border-[#5865f2]/80 transition-colors ${className}`}
                    onClick={handleOpenDrawer}
                >
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

    const cardClassName = `w-full transition-colors bg-[#1a1c23] ${className} ${showIncompleteWarning ? "border-red-500/70 animate-pulse-border" : "border-[#2a2d36]"
        } cursor-pointer hover:border-[#5865f2]/80`;

    return (
        <>
            <Card className={cardClassName} onClick={handleProfileClick}>
                {pulseAnimationStyle}
                <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                        <div className="rounded-full bg-[#5865f2]/10 p-3 flex-shrink-0">
                            <UserRound className="h-6 w-6 text-[#5865f2]" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-lg text-white truncate" title={userProfile.name}>{userProfile.name || "Name not set"}</h3>
                            <p className="text-sm text-gray-400 truncate" title={userProfile.email}>{userProfile.email || "Email not set"}</p>
                            <p className="text-sm text-gray-400 truncate" title={userProfile.phone}>{userProfile.phone || 'Phone not set'}</p>
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
                    {showIncompleteWarning && (
                        <div className="mt-3 p-3 bg-red-900/20 border border-red-500/30 rounded text-red-400 text-xs sm:text-sm flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            <span>Please complete your profile information. Click to edit.</span>
                        </div>
                    )}
                </CardContent>
            </Card>
            <ProfileIndex open={drawerOpen} onOpenChange={setDrawerOpen} />
        </>
    );
};

export default ProfilePreviewButton;