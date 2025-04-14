// src/App.tsx
import React, { useEffect } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from 'sonner';
import { HelmetProvider } from 'react-helmet-async'; // Import HelmetProvider
import SEO from '@/components/seo/SEO'; // Import the new SEO component

// Import providers
import { AuthProvider } from "@/context/AuthContext";
import { LoadingProvider } from "@/components/global/Loading/LoadingContext";
import LoadingRouteListener from "@/components/global/Loading/LoadingRouteListener";

// Import the middle click navigation hook
import useMiddleClickNavigation from "@/components/global/hooks/useMiddleClickNavigation.ts";

// Import the authenticated providers component
import AuthenticatedProviders from "@/components/providers/AuthenticatedProviders";

// Create a new QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
      queries: {
          staleTime: 1000 * 60 * 5, // 5 minutes default stale time
          refetchOnWindowFocus: false,
          retry: 1, // Retry failed queries once
      },
  },
});

// Create a wrapper component that applies the middle click navigation
function MiddleClickNavigationProvider({ children }: { children: React.ReactNode }) {
  useMiddleClickNavigation();
  return <>{children}</>;
}

// Create a wrapper component for the app content
const AppContent = () => {
  return (
    <Router>
      <MiddleClickNavigationProvider>
      <LoadingRouteListener />
        <Toaster
          position="top-center"
          toastOptions={{
            className: "bg-[#5865f2] text-white"
          }}
        />
        <AuthProvider>
          <AuthenticatedProviders />
        </AuthProvider>
      </MiddleClickNavigationProvider>
    </Router>
  );
};

function App() {
  useEffect(() => {
    const removeSplash = () => {
      const splash = document.getElementById("initial-loading");
      if (splash) {
        splash.style.opacity = "0";
        setTimeout(() => splash.remove(), 150); // Match this to your CSS transition duration
      }
    };

    if (document.readyState === "complete") {
      removeSplash();
    } else {
      window.addEventListener("load", removeSplash);
      return () => window.removeEventListener("load", removeSplash);
    }
  }, []);

  // Get base URL for default canonical and OG URLs
  const siteUrl = window.location.origin;

  return (
    // Wrap the entire app with HelmetProvider
    <HelmetProvider>
        {/* Default SEO settings for the entire site */}
        <SEO
            title="GNT – Next-Gen Console & PC Marketplace"
            description="Explore the future of gaming tech with GNT – Your go-to marketplace for consoles, computers, and expert repair services."
            canonicalUrl={siteUrl} // Root canonical
            ogData={{
                title: "GNT – Next-Gen Console & PC Marketplace",
                description: "Explore the future of gaming tech with GNT – Your go-to marketplace for latest consoles, computers, and expert repair services.",
                type: 'website',
                image: `${siteUrl}/favicon/og-image.png`, // Ensure you have an og-image.png
                url: siteUrl
            }}
        />
      <QueryClientProvider client={queryClient}>
        <LoadingProvider>
          <AppContent />
        </LoadingProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;