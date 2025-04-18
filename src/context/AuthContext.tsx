// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, Session } from '@/lib/supabase';
// FIX: Import AuthError instead of ApiError. User and Provider are likely correct.
import { User, Provider, AuthError, WeakPassword } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useLoading } from '@/components/global/Loading/LoadingContext';

// FIX: Use AuthError in the interface
interface AuthContextProps {
    isAuthenticated: boolean;
    user: User | null;
    session: Session | null;
    isLoadingAuth: boolean;
    signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
    signUp: (name: string, email: string, password: string) => Promise<{ error: AuthError | null }>;
    signOut: () => Promise<{ error: AuthError | null }>;
    sendPasswordReset: (email: string) => Promise<{ error: AuthError | null }>;
    updateUserEmail: (newEmail: string) => Promise<{ error: AuthError | null }>;
    updateUserPassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
    signInWithProvider: (provider: Provider) => Promise<{ error: AuthError | null }>;
    refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);
    const queryClient = useQueryClient();
    const { setIsLoading: setIsLoadingGlobal, setLoadingMessage } = useLoading();

    useEffect(() => {
        let isMounted = true;
        setIsLoadingAuth(true);
        supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
            if (!isMounted) return;
            if (error) console.error("Error fetching initial session:", error);
            setSession(initialSession);
            setUser(initialSession?.user ?? null);
            setIsLoadingAuth(false);
        }).catch(err => {
            if (!isMounted) return;
            console.error("Catch block: Error fetching initial session:", err);
            setIsLoadingAuth(false);
        });

        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (_event, newSession) => {
                if (!isMounted) return;
                const currentUser = newSession?.user ?? null;
                const previousUserId = user?.id;

                setSession(newSession);
                setUser(currentUser);
                setIsLoadingAuth(false); // Update loading state on change

                // Invalidate/remove queries based on auth events
                if (_event === 'SIGNED_IN' && currentUser) {
                    console.log(`[Auth] SIGNED_IN ${currentUser.id}. Invalidating caches.`);
                    // Invalidate relevant user-specific queries
                    queryClient.invalidateQueries({ queryKey: ['userProfile', currentUser.id] });
                    queryClient.invalidateQueries({ queryKey: ['cart', currentUser.id] });
                    queryClient.invalidateQueries({ queryKey: ['wishlist', currentUser.id] });
                    queryClient.invalidateQueries({ queryKey: ['orders', currentUser.id] });
                    queryClient.invalidateQueries({ queryKey: ['repairrequests', currentUser.id] });
                } else if (_event === 'SIGNED_OUT') {
                     console.log(`[Auth] SIGNED_OUT (was ${previousUserId}). Removing caches.`);
                     // Remove user-specific data on sign out
                     if (previousUserId) {
                         queryClient.removeQueries({ queryKey: ['userProfile', previousUserId] });
                         queryClient.removeQueries({ queryKey: ['cart', previousUserId] });
                         queryClient.removeQueries({ queryKey: ['wishlist', previousUserId] });
                         queryClient.removeQueries({ queryKey: ['orders', previousUserId] });
                         queryClient.removeQueries({ queryKey: ['repairrequests', previousUserId] });
                     }
                     // Also clear potentially cached data for 'null' user if applicable
                     queryClient.removeQueries({ queryKey: ['userProfile', null] });
                     queryClient.removeQueries({ queryKey: ['cart', null] });
                     // etc.
                } else if (_event === 'USER_UPDATED' && currentUser) {
                     console.log(`[Auth] USER_UPDATED ${currentUser.id}. Invalidating profile.`);
                     // Just invalidate profile on update
                     queryClient.invalidateQueries({ queryKey: ['userProfile', currentUser.id] });
                }
                // Optionally handle TOKEN_REFRESHED, PASSWORD_RECOVERY events if needed
            }
        );

        return () => {
            isMounted = false;
            authListener?.subscription.unsubscribe();
        };
    }, [queryClient, user?.id]); // Depend on user.id to re-run if user changes

    // FIX: Adjust performAuthAction return type and error handling
    const performAuthAction = useCallback(async <T extends { error: AuthError | null }>(
        action: () => Promise<T>,
        loadingMsg: string,
        successMsg: string,
        errorMsgPrefix: string
    ): Promise<{ error: AuthError | null }> => { // Simplified return: only error matters for callers here
        setIsLoadingGlobal(true);
        setLoadingMessage(loadingMsg);
        try {
            const { error } = await action(); // Destructure only the error
            if (error) {
                console.error(`${errorMsgPrefix} Error:`, error);
                toast.error(error.message || `${errorMsgPrefix} failed.`);
                return { error }; // Return the AuthError object
            }
            if (successMsg) toast.success(successMsg);
            return { error: null }; // Success case
        } catch (error: any) {
            console.error(`Unexpected ${errorMsgPrefix} Error:`, error);
            const message = error.message || `An unexpected error occurred.`;
            toast.error(message);
             // Construct a basic AuthError-like object for consistency if possible
            return { error: { name: "UnexpectedError", message } as AuthError };
        } finally {
            setIsLoadingGlobal(false);
            setLoadingMessage("");
        }
    }, [setIsLoadingGlobal, setLoadingMessage]);

    // --- Updated Auth Action Callbacks ---
    // These now directly use performAuthAction without needing explicit return type matching issues
    const signIn = useCallback(
        (email: string, password: string) => performAuthAction(
            () => supabase.auth.signInWithPassword({ email, password }),
            "Logging in...", "Login successful!", "Sign In"
        ),
        [performAuthAction]
    );

    const signUp = useCallback(
        (name: string, email: string, password: string) => performAuthAction(
            () => supabase.auth.signUp({ email, password, options: { data: { name: name } } }),
            "Creating account...", "Registration successful! Check email for verification if enabled.", "Sign Up"
        ),
        [performAuthAction]
    );

    const signOut = useCallback(async () => {
        setIsLoadingGlobal(true); setLoadingMessage("Logging out...");
        const { error } = await supabase.auth.signOut();
        setIsLoadingGlobal(false); setLoadingMessage("");
        if (error) { console.error("Sign Out Error:", error); toast.error(error.message || "Sign out failed."); }
        else { toast.success("Successfully logged out."); }
        return { error };
    }, [setIsLoadingGlobal, setLoadingMessage]);

    const sendPasswordReset = useCallback(
        (email: string) => {
            const redirectUrl = import.meta.env.VITE_PASSWORD_RESET_REDIRECT_URL || `${window.location.origin}/reset-password`; // Ensure correct path for Supabase
            return performAuthAction(
                () => supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl }),
                "Sending reset link...", "Password reset email sent. Check your inbox.", "Password Reset"
            );
        },
        [performAuthAction]
    );

    const updateUserEmail = useCallback(
        (newEmail: string) => performAuthAction(
            () => supabase.auth.updateUser({ email: newEmail }),
            "Requesting email change...", "Email change request sent. Check both email inboxes.", "Email Update"
        ),
        [performAuthAction]
    );

     // Password update needs confirmation, often handled differently (e.g., requires re-auth or comes from reset flow)
     // This function assumes user is authenticated and updates directly.
    const updateUserPassword = useCallback(
        (newPassword: string) => performAuthAction(
            () => supabase.auth.updateUser({ password: newPassword }),
            "Updating password...", "Password updated successfully.", "Password Update"
        ),
        [performAuthAction]
    );

    const signInWithProvider = useCallback(
        (provider: Provider) => {
             const redirectUrl = import.meta.env.VITE_OAUTH_REDIRECT_URL || window.location.origin; // Base URL for redirect
             return performAuthAction(
                () => supabase.auth.signInWithOAuth({ provider, options: { redirectTo: redirectUrl } }),
                `Redirecting to ${provider}...`, "", `OAuth Sign In (${provider})`
            );
        },
        [performAuthAction]
    );

    const refreshSession = useCallback(async () => {
        // Removed explicit loading state management here; onAuthStateChange handles session updates
        try {
            const { error } = await supabase.auth.refreshSession();
            if (error) console.error("Error refreshing session:", error);
        } catch (err) {
            console.error("Unexpected error during session refresh:", err);
        }
        // No need to setIsLoadingAuth(false) here; onAuthStateChange updates state.
    }, []);

    const value: AuthContextProps = {
        isAuthenticated: !!user,
        user,
        session,
        isLoadingAuth,
        signIn,
        signUp,
        signOut,
        sendPasswordReset,
        updateUserEmail, // Expose the correct function name
        updateUserPassword,
        signInWithProvider,
        refreshSession,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// Re-export necessary types
export type { User as SupabaseUser, Provider as SupabaseProvider, AuthError as SupabaseAuthError, WeakPassword as SupabaseWeakPassword } from '@supabase/supabase-js';