// src/context/LoadingContext.tsx
import React, { createContext, useContext, useState } from "react";
import ReactDOM from "react-dom";
import LoadingScreen from "@/components/global/LoadingScreen";

interface LoadingContextType {
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  isLoadingProfile: boolean;
  setIsLoadingProfile: (isLoading: boolean) => void;
  isLoadingAuth: boolean;
  setIsLoadingAuth: (isLoadingAuth: boolean) => void;
  isLoadingProducts: boolean;
  setIsLoadingProducts: (isLoading: boolean) => void;
  loadingMessage: string;
  setLoadingMessage: (message: string) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return context;
};

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Loading...");

  return (
    <LoadingContext.Provider
      value={{
        isLoading,
        setIsLoading,
        isLoadingProfile,
        setIsLoadingProfile,
        isLoadingAuth,
        setIsLoadingAuth,
        isLoadingProducts,
        setIsLoadingProducts,
        loadingMessage,
        setLoadingMessage,
      }}
    >
      {children}
      {/* Display loading screen when any loading state is true */}
      {(isLoading || isLoadingProfile || isLoadingAuth || isLoadingProducts) &&
        ReactDOM.createPortal(
          <LoadingScreen message={loadingMessage} />,
          document.body
        )}
    </LoadingContext.Provider>
  );
};