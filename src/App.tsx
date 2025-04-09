// src/App.tsx
import React, { useEffect } from "react";
import {BrowserRouter as Router } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from 'sonner';
// Import providers
import { AuthProvider } from "@/context/AuthContext";
import { LoadingProvider, useLoading } from "@/context/LoadingContext";
import LoadingScreen from "@/components/global/LoadingScreen";

// Import the middle click navigation hook
import useMiddleClickNavigation from "@/components/global/hooks/useMiddleClickNavigation.ts";

// Import the authenticated providers component
import AuthenticatedProviders from "@/components/providers/AuthenticatedProviders";

// Create a new QueryClient instance
const queryClient = new QueryClient();

// Create a wrapper component that applies the middle click navigation
function MiddleClickNavigationProvider({ children }: { children: React.ReactNode }) {
  useMiddleClickNavigation();
  return <>{children}</>;
}

// Separate component to use the loading context
const LoadingScreenWrapper = () => {
  const { isLoadingProfile, loadingMessage } = useLoading();
  return isLoadingProfile ? <LoadingScreen message={loadingMessage} /> : null;
};

// Create a wrapper component for the app content
const AppContent = () => {
  return (
    <Router>
      <MiddleClickNavigationProvider>
        <Toaster 
          position="top-center"
          toastOptions={{
            className: "bg-[#5865f2] text-white"
          }}
        />
        <AuthProvider>
          <AuthenticatedProviders />
        </AuthProvider>
        <LoadingScreenWrapper />
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
  
  return (
    <QueryClientProvider client={queryClient}>
      <LoadingProvider>
        <AppContent />
      </LoadingProvider>
    </QueryClientProvider>
  );
}

export default App;