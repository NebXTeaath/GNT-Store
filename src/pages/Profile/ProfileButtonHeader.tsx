// src/pages/Profile/ProfileButtonHeader.tsx
"use client";
import React, { useState } from "react";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { ProfileIndex } from "@/pages/Profile/components/ProfileIndex";
import LoginModal from "@/pages/Login/LoginModal"; // Import LoginModal
import { toast } from "sonner"; // Import toast for feedback

interface ProfileButtonHeaderProps {
    className?: string;
}

const ProfileButtonHeader: React.FC<ProfileButtonHeaderProps> = ({ className }) => {
    const { isAuthenticated } = useAuth();
    const [isProfileIndexOpen, setIsProfileIndexOpen] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false); // State for login modal

    const handleProfileClick = () => {
        if (isAuthenticated) {
            // Open the profile drawer directly. Data is handled inside.
            setIsProfileIndexOpen(true);
        } else {
            // If not authenticated, open the login modal instead.
            setIsLoginModalOpen(true);
        }
    };

     const handleLoginSuccess = () => {
         setIsLoginModalOpen(false); // Close modal on success
         toast.success("Login successful!");
         // Optionally open profile drawer immediately after successful login
         // setIsProfileIndexOpen(true); // Uncomment if desired behavior
     };


    return (
        <>
            <Button
                variant="ghost"
                size="icon"
                className={`text-gray-300 hover:text-white hover:bg-[#5865f2]/20 rounded-full ${className}`} // Example styling
                onClick={handleProfileClick}
                aria-label="User Profile" // Accessibility
            >
                <User className="h-5 w-5" /> {/* Slightly larger icon */}
                <span className="sr-only">Profile</span>
            </Button>

            {/* Render Profile Drawer conditionally based on auth status and open state */}
            {isAuthenticated && (
                <ProfileIndex
                    open={isProfileIndexOpen}
                    onOpenChange={setIsProfileIndexOpen}
                />
            )}

             {/* Render Login Modal, controlled by its state */}
             <LoginModal
                 open={isLoginModalOpen}
                 onOpenChange={setIsLoginModalOpen}
                 onLoginSuccess={handleLoginSuccess} // Handle successful login
             />
        </>
    );
};

export default ProfileButtonHeader;