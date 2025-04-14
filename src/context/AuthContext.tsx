// src\context\AuthContext.tsx
import React, { createContext, useContext, useCallback } from "react";
import { useQuery, useQueryClient } from '@tanstack/react-query';
// Removed unused imports: APPWRITE_DATABASE_ID, databases
import { account } from "../lib/appwrite";
import { getCurrentUserSafe } from "../lib/authHelpers";
import { useLoading } from "../components/global/Loading/LoadingContext";
import { toast } from "sonner";
import { useUpdateProfileEmailMutation, useUserProfileQuery } from '@/components/global/hooks/useUserProfileData';
import { ID, Models } from "appwrite"; // Import ID and Models

// Query Key for current user
const CURRENT_USER_QUERY_KEY = ['currentUser'];

// Type for Appwrite User object
type AppwriteUser = Models.User<Models.Preferences>;

interface AuthContextProps {
  isAuthenticated: boolean;
  user: AppwriteUser | null; // Use specific type
  isLoadingAuth: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  refreshUserState: () => Promise<AppwriteUser | null>; // Updated return type
  updateEmail: (newEmail: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const { setIsLoading: setIsLoadingGlobal, setLoadingMessage } = useLoading();

  // --- Use useQuery to fetch and cache the user ---
  const {
    data: user,
    isLoading: isQueryLoading,
    // Removed: isQueryFetching (if unused)
    // Removed: isQueryError (if unused)
    refetch: refetchUserQuery,
  } = useQuery<AppwriteUser | null, Error>({ // Use specific type here
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: getCurrentUserSafe,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Derived authentication state
  const isAuthenticated = !!user;
  const isLoadingAuth = isQueryLoading;

  // Hooks for profile mutations/queries
  const { mutate: updateProfileEmailMutation } = useUpdateProfileEmailMutation();
  // FIX: Call useUserProfileQuery WITHOUT the argument.
  // The hook should internally use useAuth() to get the user ID if needed.
  const { data: userProfileData } = useUserProfileQuery();

  // --- Modified Auth Actions ---

  const login = async (email: string, password: string) => {
    setIsLoadingGlobal(true);
    setLoadingMessage("Logging in...");
    try {
      await account.createEmailPasswordSession(email, password);
      await queryClient.refetchQueries({ queryKey: CURRENT_USER_QUERY_KEY });
      toast.success("Login successful!");
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.message || "Failed to log in. Please check your credentials.");
      throw error;
    } finally {
      setIsLoadingGlobal(false);
      setLoadingMessage("");
    }
  };

  const logout = async () => {
    setIsLoadingGlobal(true);
    setLoadingMessage("Logging out...");
    try {
      await account.deleteSession("current");
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, null);
      queryClient.removeQueries({ queryKey: ['cart'], exact: false });
      queryClient.removeQueries({ queryKey: ['wishlist'], exact: false });
      queryClient.removeQueries({ queryKey: ['userProfile'], exact: false });
      await queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
      toast.success("Successfully logged out");
      setTimeout(() => { window.location.href = '/'; }, 300);
    } catch (error: any) {
      console.error("Logout error:", error);
      toast.error(error.message || "Failed to log out.");
      setIsLoadingGlobal(false);
      setLoadingMessage("");
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoadingGlobal(true);
    setLoadingMessage("Creating your account...");
    try {
      // FIX: Removed unused 'newUserAccount' variable assignment
      await account.create(ID.unique(), email, password, name);
      await account.createEmailPasswordSession(email, password);
      // TODO: Optional - Create user profile document here using the newUserAccount.$id if needed
      await queryClient.refetchQueries({ queryKey: CURRENT_USER_QUERY_KEY });
      toast.success("Registration successful! Welcome!");
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.message || "Failed to create account. Please try again.");
      throw error;
    } finally {
      setIsLoadingGlobal(false);
      setLoadingMessage("");
    }
  };

  const updateEmail = async (newEmail: string, password: string): Promise<void> => {
    setIsLoadingGlobal(true);
    setLoadingMessage("Updating email...");
    try {
      await account.updateEmail(newEmail, password);
      console.log("Appwrite Auth email updated successfully.");
      await queryClient.refetchQueries({ queryKey: CURRENT_USER_QUERY_KEY });

      // FIX: Ensure user?.$id is passed correctly if useUserProfileQuery relies on it,
      // BUT the error suggests the hook doesn't take an argument, so relying on internal useAuth is likely correct.
      // const profileDocId = userProfileData?.profileDocId; // Assuming useUserProfileQuery returns this structure
      const profileDocId = userProfileData?.profileDocId;

      if (profileDocId) {
        console.log(`Attempting to update profile document (${profileDocId}) email via mutation...`);
        setLoadingMessage("Syncing profile...");
        updateProfileEmailMutation(
          { documentId: profileDocId, email: newEmail },
          {
            onSuccess: async () => {
              // Pass the user ID to invalidate the specific profile query
              await queryClient.invalidateQueries({ queryKey: ['userProfile', user?.$id] });
              toast.success("Email updated successfully in Authentication and Profile.");
              console.log("Profile email mutation successful.");
              setIsLoadingGlobal(false);
              setLoadingMessage("");
            },
            onError: (error) => {
              console.error("Profile email sync failed after auth update:", error);
              toast.warning("Auth email updated, but profile sync failed.");
              setIsLoadingGlobal(false);
              setLoadingMessage("");
            },
          }
        );
      } else {
        console.warn("No profile document ID found in query data. Cannot sync email to profile document.");
        toast.info("Authentication email updated, but no profile document was found to update.");
        setIsLoadingGlobal(false);
        setLoadingMessage("");
      }
    } catch (error: any) {
      console.error("Email update process failed:", error);
      toast.error(error.message || "Failed to update email. Please check password.");
      setIsLoadingGlobal(false);
      setLoadingMessage("");
      throw error;
    }
  };

  const refreshUserState = useCallback(async (): Promise<AppwriteUser | null> => { // Update return type
    setIsLoadingGlobal(true);
    setLoadingMessage("Refreshing user state...");
    try {
      const refreshedResult = await refetchUserQuery(); // Use result structure
      return refreshedResult.data ?? null; // Return data property
    } catch (error) {
      console.error("Failed to refresh user state:", error);
      toast.error("Could not refresh user session.");
      return null;
    } finally {
      setIsLoadingGlobal(false);
      setLoadingMessage("");
    }
  }, [refetchUserQuery, setIsLoadingGlobal, setLoadingMessage]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user: user ?? null,
        isLoadingAuth,
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