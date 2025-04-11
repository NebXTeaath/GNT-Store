import React, { createContext, useState, useEffect, useContext, useCallback } from "react";
import { account } from "../lib/appwrite";
import { useLoading } from "./LoadingContext";
import { toast } from "sonner";
import { useUpdateProfileEmailMutation, useUserProfileQuery } from '@/components/global/hooks/useUserProfileData';

interface AuthContextProps {
  isAuthenticated: boolean;
  user: any; // Consider defining a stricter User type
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  refreshUserState: () => Promise<any>;
  updateEmail: (newEmail: string, password: string) => Promise<void>;
}

const USER_STORAGE_KEY = 'gnt_user_data'; // If still used? Tanstack might replace this need.

const AuthContext = createContext<AuthContextProps>({
  isAuthenticated: false,
  user: null,
  login: async () => {},
  logout: async () => {},
  register: async () => {},
  refreshUserState: async () => {},
  updateEmail: async () => {},
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const { 
    setIsLoading: setIsLoadingGlobal, 
    setLoadingMessage,
    setIsLoadingAuth,
    isLoadingAuth
  } = useLoading();

  // Use the mutation hook for updating the profile document's email
  const { mutate: updateProfileEmailMutation } = useUpdateProfileEmailMutation();
  
  // Use the query hook to get the profile data (specifically the documentId)
  // This query runs based on the userId state within the hook
  const { data: userProfileData } = useUserProfileQuery();

  const fetchUser = useCallback(async () => {
    try {
      const userData = await account.get();
      console.log("Fetched user data:", userData);
      setUser(userData);
      setIsAuthenticated(true);
      return userData;
    } catch (error) {
      console.log("No user data available:", error);
      setUser(null);
      setIsAuthenticated(false);
      return null;
    } finally {
      if (!isInitialized) {
        setIsInitialized(true);
        setIsLoadingAuth(false); // Turn off auth loading when initialization is complete
      }
    }
  }, [isInitialized, setIsLoadingAuth]);

  const refreshUserState = useCallback(async () => {
    return await fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    // Set loading state for authentication initialization
    setIsLoadingAuth(true);
    setLoadingMessage("Loading authentication...");
    
    fetchUser();
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoadingAuth(true);
    setLoadingMessage("Logging in...");
    
    try {
      await account.createEmailPasswordSession(email, password);
      console.log("Session created successfully, fetching user data...");
      const userData = await account.get();
      
      if (userData) {
        console.log("User data obtained after login:", userData);
        setUser(userData);
        setIsAuthenticated(true);
        await sleep(100); // Short delay might still be useful for state propagation
      } else {
        throw new Error("User data not available after login");
      }
    } catch (error) {
      console.error("Login error:", error);
      throw error; // Re-throw for component handling
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = async () => {
    setIsLoadingAuth(true);
    setLoadingMessage("Logging out...");
    
    try {
      console.log("Logout initiated: Deleting current session...");
      await account.deleteSession("current");
      console.log("Session deleted successfully. Clearing local auth state...");
      localStorage.removeItem(USER_STORAGE_KEY); // Clear any stored user data
      setUser(null);
      setIsAuthenticated(false);
      console.log("Local auth state cleared. User is now logged out.");
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoadingAuth(true);
    setLoadingMessage("Creating your account...");
    
    try {
      await account.create("unique()", email, password, name);
      // Immediately log in after successful registration
      await account.createEmailPasswordSession(email, password);
      console.log("Session created successfully after registration, fetching user data...");
      const userData = await account.get();
      
      if (userData) {
        console.log("User data obtained after registration:", userData);
        setUser(userData);
        setIsAuthenticated(true);
        await sleep(100);
      } else {
        throw new Error("User data not available after registration");
      }
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  /** 
   * Updates the email in Appwrite Auth, then triggers a mutation to update the email
   * in the corresponding Appwrite Database profile document.
   */
  const updateEmail = async (newEmail: string, password: string): Promise<void> => {
    setIsLoadingGlobal(true); // Use global loading state
    setLoadingMessage("Updating email...");
    
    try {
      // 1. Update email in Appwrite Authentication
      await account.updateEmail(newEmail, password);
      console.log("Appwrite Auth email updated successfully.");
      
      // Refresh user state locally after successful auth update
      const updatedUserData = await account.get();
      setUser(updatedUserData); // Update local user state
      console.log("Local auth user state refreshed:", updatedUserData);
      
      // 2. Update email in the profile document using the mutation hook
      const profileDocId = userProfileData?.profileDocId;
      if (profileDocId) {
        console.log(`Attempting to update profile document (${profileDocId}) email via mutation...`);
        setLoadingMessage("Syncing profile...");
        
        // Call the mutation - no need for await if not chaining further async actions here
        updateProfileEmailMutation(
          { documentId: profileDocId, email: newEmail },
          { 
            onSuccess: () => {
              // Toast is handled here or within the mutation hook itself
              toast.success("Email updated successfully in Authentication and Profile.");
              console.log("Profile email mutation successful.");
            },
            onError: (error) => {
              // Error toast/logging is handled within the mutation hook
              // Provide additional context if needed
              console.error("Profile email sync failed after auth update:", error);
              toast.warning("Email updated in authentication, but failed to sync with profile. Please refresh or try saving profile again.");
            },
            onSettled: () => {
              // This runs regardless of success/error
              setIsLoadingGlobal(false); // Turn off loading indicator
              setLoadingMessage("");
            }
          }
        );
      } else {
        // No profile document found, just finish loading
        console.warn("No profile document ID found in query data. Cannot sync email to profile document.");
        toast.info("Email updated in authentication, but no profile document was found to update.");
        setIsLoadingGlobal(false);
        setLoadingMessage("");
      }
    } catch (error: any) {
      // Catch errors primarily from account.updateEmail
      console.error("Email update process failed:", error);
      toast.error(error.message || "Failed to update email. Please check password.");
      setIsLoadingGlobal(false); // Ensure loading stops on auth error
      setLoadingMessage("");
      throw error; // Re-throw for component handling
    }
    // Removed finally block as onSettled handles loading state turn off
  };

  // No need for conditional rendering here as LoadingContext handles the display
  // of the LoadingScreen component when isLoadingAuth is true
  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        login,
        logout,
        register,
        updateEmail,
        refreshUserState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};