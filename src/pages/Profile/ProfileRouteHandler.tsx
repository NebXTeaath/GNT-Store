// src/pages/Profile/ProfileRouteHandler.tsx
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ProfileIndex } from '@/pages/Profile/components/ProfileIndex';

const ProfileRouteHandler: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation(); // Get current location

    // State to control drawer visibility, default to true if potentially landing here directly
    // We check auth status before rendering anything significant.
    const [drawerOpen, setDrawerOpen] = useState(true);

    useEffect(() => {
        // If the user is not authenticated when this component mounts,
        // immediately redirect to login, preserving the intended destination.
        if (!isAuthenticated) {
            console.log("ProfileRouteHandler: Not authenticated, redirecting to login.");
             localStorage.setItem("redirectAfterLogin", location.pathname + location.search); // Store full path
             navigate("/login", { replace: true }); // Use replace to prevent broken back button history
             setDrawerOpen(false); // Ensure drawer doesn't try to render
        } else {
            // If authenticated, ensure the drawer is set to open.
            // This handles cases where the user navigates here directly while logged in.
            setDrawerOpen(true);
        }
        // React to changes in authentication status
    }, [isAuthenticated, navigate, location.pathname, location.search]);


    const handleDrawerOpenChange = (open: boolean) => {
        setDrawerOpen(open);
        // When the drawer is closed *by the user*, navigate back to the previous page or home.
        if (!open) {
             console.log("ProfileRouteHandler: Drawer closed, navigating back or to '/'");
             // Check if there's history to go back to, otherwise go home
             if (window.history.length > 2) { // Check if there's more than just the current page and the pushed state
                navigate(-1); // Go back like a modal closing
             } else {
                navigate('/', { replace: true }); // Go home if no meaningful history
             }
        }
    };

    // If not authenticated, render nothing (redirect handled by useEffect)
    if (!isAuthenticated) {
        return null;
    }

    // If authenticated, render the Drawer. The Drawer component itself
    // (via useProfileService -> useUserProfileQuery) handles fetching profile data.
    return (
        <>
            <ProfileIndex
                open={drawerOpen}
                onOpenChange={handleDrawerOpenChange}
            />
            {/* The underlying route content isn't rendered here; this component controls the modal/drawer overlay */}
            {/* Consider adding a backdrop or ensuring the underlying page is visually obscured */}
        </>
    );
};

export default ProfileRouteHandler;