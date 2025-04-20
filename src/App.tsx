// --- File: /src/App.tsx ---
import React, { useEffect } from "react";
import { BrowserRouter as Router, useNavigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from 'sonner';
import { toast } from 'sonner';
import { HelmetProvider } from 'react-helmet-async';
import SEO from '@/components/seo/SEO';
// Import useAuth correctly
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { LoadingProvider } from "@/components/global/Loading/LoadingContext";
import LoadingRouteListener from "@/components/global/Loading/LoadingRouteListener";
import useMiddleClickNavigation from "@/components/global/hooks/useMiddleClickNavigation.ts";
import AuthenticatedProviders from "@/components/providers/AuthenticatedProviders";
import LoginModal from "@/pages/Login/LoginModal"; // Import LoginModal

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 300000, refetchOnWindowFocus: false, retry: 1 } } });

function MiddleClickNavigationProvider({ children }: { children: React.ReactNode }) {
    useMiddleClickNavigation();
    return <>{children}</>;
}

// Component to manage the globally controlled LoginModal
const AppWithAuthModal: React.FC = () => {
    // Ensure useAuth is called within AuthProvider context
    const authContext = useAuth(); // Get the whole context
    const navigate = useNavigate();

    // Check if context exists before destructuring
    if (!authContext) {
        // This should technically not happen if structure is correct, but good practice
        console.error("useAuth() called outside of AuthProvider!");
        return <p>Error: Auth context not found.</p>;
    }

    const { isLoginModalOpen, closeLoginModal, redirectPathAfterLogin, clearRedirectPath } = authContext;


    const handleLoginSuccess = () => {
        const pathToGo = redirectPathAfterLogin || "/";
        console.log("[AppWithAuthModal] Login Success. Closing modal and navigating to:", pathToGo);
        closeLoginModal(); // Close the modal via context
        clearRedirectPath(); // Clear the path *after* closing modal but *before* navigating
        toast.success("Login successful!");

        navigate(pathToGo, { replace: true }); // Navigate
    };

    return (
        <>
            <AuthenticatedProviders />
            {/* Pass context values to LoginModal */}
            <LoginModal
                open={isLoginModalOpen}
                onOpenChange={(open) => { if (!open) closeLoginModal(); }}
                onLoginSuccess={handleLoginSuccess}
                // Removed onForgotPassword prop if not needed here globally
            />
        </>
    );
}

// Main App Content Structure
const AppContent = () => {
    return (
        <Router>
            <MiddleClickNavigationProvider>
                <LoadingRouteListener />
                <Toaster position="top-center" toastOptions={{ className: "bg-[#5865f2] text-white" }} />
                 {/* AuthProvider wraps the component that uses useAuth */}
                 <AuthProvider>
                    <AppWithAuthModal />
                 </AuthProvider>
            </MiddleClickNavigationProvider>
        </Router>
    );
};

// Root App Component
function App() {
    useEffect(() => { const splash = document.getElementById("initial-loading"); if (splash) { splash.style.opacity = "0"; setTimeout(() => splash.remove(), 150); } }, []);
    const siteUrl = window.location.origin;
    return (
        <HelmetProvider>
            <SEO
                title="GNT – Next-Gen Console & PC Marketplace"
                description="Your go-to marketplace for consoles, computers, and expert repair services."
                canonicalUrl={siteUrl}
                ogData={{ title: "GNT Marketplace", description: "Your go-to marketplace for consoles, computers, and expert repair services.", type: 'website', image: `${siteUrl}/favicon/og-image.png`, url: siteUrl }} />
            <QueryClientProvider client={queryClient}>
                <LoadingProvider>
                    <AppContent />
                </LoadingProvider>
            </QueryClientProvider>
        </HelmetProvider>
     );
}
export default App;