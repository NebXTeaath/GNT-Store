// src/App.tsx
import React, { useEffect } from "react";
import { BrowserRouter as Router, useNavigate, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from 'sonner';
import { toast } from 'sonner';
import { HelmetProvider } from 'react-helmet-async';
import SEO from '@/components/seo/SEO';
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { LoadingProvider } from "@/components/global/Loading/LoadingContext";
import LoadingRouteListener from "@/components/global/Loading/LoadingRouteListener";
import useMiddleClickNavigation from "@/components/global/hooks/useMiddleClickNavigation.ts";
import AuthenticatedProviders from "@/components/providers/AuthenticatedProviders";
import LoginModal from "@/components/pages/Login/LoginModal.tsx";

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 300000, refetchOnWindowFocus: false, retry: 1 } } });

function MiddleClickNavigationProvider({ children }: { children: React.ReactNode }) {
    useMiddleClickNavigation();
    return <>{children}</>;
}

const AppWithAuthModal: React.FC = () => {
    const { isLoginModalOpen, closeLoginModal } = useAuth();

    return (
        <>
            <AuthenticatedProviders />
            <LoginModal
                open={isLoginModalOpen}
                onOpenChange={(open) => { if (!open) closeLoginModal(); }}
                onLoginSuccess={() => {}}
            />
        </>
    );
};

// Main App Content Structure now includes Router
const AppContent = () => {
    return (
        <Router>
            <AuthProvider>
                <MiddleClickNavigationProvider>
                    <LoadingRouteListener />
                    <Toaster position="top-center" toastOptions={{ className: "bg-[#5865f2] text-white" }} />
                    <AppWithAuthModal />
                </MiddleClickNavigationProvider>
            </AuthProvider>
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