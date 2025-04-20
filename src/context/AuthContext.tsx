// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, Session } from '@/lib/supabase';
import { User, Provider, AuthError } from '@supabase/supabase-js'; // Removed WeakPassword import if unused
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useLoading } from '@/components/global/Loading/LoadingContext';

interface AuthContextProps {
    isAuthenticated: boolean;
    user: User | null;
    session: Session | null; // Expose the full session object
    isLoadingAuth: boolean;
    signIn: (email: string, password: string, captchaToken: string | null) => Promise<{ error: AuthError | null }>;
    signUp: (name: string, email: string, password: string, captchaToken: string | null) => Promise<{ error: AuthError | null }>;
    signOut: () => Promise<{ error: AuthError | null }>;
    sendPasswordReset: (email: string, captchaToken: string | null) => Promise<{ error: AuthError | null }>;
    updateUserEmail: (newEmail: string) => Promise<{ error: AuthError | null }>;
    updateUserPassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
    signInWithProvider: (provider: Provider) => Promise<{ error: AuthError | null }>;
    refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null); // State for session
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);
    const queryClient = useQueryClient();
    const { setIsLoading: setIsLoadingGlobal, setLoadingMessage } = useLoading();

    useEffect(() => {
        let isMounted = true;
        setIsLoadingAuth(true);
        console.log("[Auth Provider] Mounting: Fetching initial session...");
        supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
            if (!isMounted) return;
            if (error) console.error("[Auth Provider] Error fetching initial session:", error);
            else console.log("[Auth Provider] Initial session fetched:", initialSession ? `User: ${initialSession.user.id}, AAL: ${(initialSession.user as any)?.aal}` : "No session"); // Added type cast for AAL log
            setSession(initialSession); // Set initial session state
            setUser(initialSession?.user ?? null);
            setIsLoadingAuth(false);
        }).catch(err => {
             if (!isMounted) return;
             console.error("[Auth Provider] Catch block: Error fetching initial session:", err);
             setIsLoadingAuth(false);
         });

        console.log("[Auth Provider] Setting up auth state listener...");
        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (_event, newSession) => {
                if (!isMounted) {
                    console.log("[Auth Listener] Unmounted, ignoring event:", _event);
                    return;
                }
                const currentUser = newSession?.user ?? null;
                const previousUserId = user?.id; // Capture previous user ID *before* state update

                // Log with type casting for AAL
                console.log(`[Auth Listener] Event: ${_event}, New Session: ${!!newSession}, User: ${currentUser?.id ?? 'null'}, AAL: ${(newSession?.user as any)?.aal ?? 'N/A'}`);

                setSession(newSession); // Update session state
                setUser(currentUser);   // Update user state

                // Only set loading false *after* processing the event state
                // setIsLoadingAuth(false); // Usually rely on initial load setting this

                 // Invalidate/remove queries based on auth events
                 if (_event === 'SIGNED_IN' && currentUser) {
                    console.log(`[Auth] SIGNED_IN ${currentUser.id} (AAL: ${(currentUser as any)?.aal}). Invalidating caches.`); // Cast for logging
                    queryClient.invalidateQueries({ queryKey: ['userProfile', currentUser.id] });
                    queryClient.invalidateQueries({ queryKey: ['cart', currentUser.id] });
                    queryClient.invalidateQueries({ queryKey: ['wishlist', currentUser.id] });
                    queryClient.invalidateQueries({ queryKey: ['orders', currentUser.id] });
                    queryClient.invalidateQueries({ queryKey: ['repairrequests', currentUser.id] });
                 } else if (_event === 'SIGNED_OUT') {
                     console.log(`[Auth] SIGNED_OUT (was ${previousUserId}). Removing caches.`);
                     if (previousUserId) {
                         queryClient.removeQueries({ queryKey: ['userProfile', previousUserId] });
                         queryClient.removeQueries({ queryKey: ['cart', previousUserId] });
                         queryClient.removeQueries({ queryKey: ['wishlist', previousUserId] });
                         queryClient.removeQueries({ queryKey: ['orders', previousUserId] });
                         queryClient.removeQueries({ queryKey: ['repairrequests', previousUserId] });
                     }
                      // Clear any potential profile/cart data tied to a null user ID
                     queryClient.removeQueries({ queryKey: ['userProfile', null] });
                     queryClient.removeQueries({ queryKey: ['cart', null] });
                     queryClient.removeQueries({ queryKey: ['wishlist', null] });
                     queryClient.removeQueries({ queryKey: ['orders', null] });
                     queryClient.removeQueries({ queryKey: ['repairrequests', null] });
                 } else if (_event === 'USER_UPDATED' && currentUser) {
                     console.log(`[Auth] USER_UPDATED ${currentUser.id}. Invalidating profile.`);
                     queryClient.invalidateQueries({ queryKey: ['userProfile', currentUser.id] });
                 } else if (_event === 'PASSWORD_RECOVERY') {
                    console.log("[Auth] PASSWORD_RECOVERY event detected. Session AAL:", (newSession?.user as any)?.aal); // Cast for logging
                 } else if (_event === 'TOKEN_REFRESHED') {
                     console.log("[Auth] TOKEN_REFRESHED. Session AAL:", (newSession?.user as any)?.aal); // Cast for logging
                 } // <-- *** FIXED: Added missing closing brace ***
            }
        );

        return () => {
            isMounted = false;
            console.log("[Auth Provider] Unmounting: Unsubscribing auth listener.");
            authListener?.subscription.unsubscribe();
        };
    }, []); // Empty dependency array is correct here


    // Centralized Auth Action Wrapper (Optional - kept for OAuth)
    const performAuthAction = useCallback(async <T extends { error: AuthError | null }>(
        action: () => Promise<T>,
        loadingMsg: string,
        successMsg: string,
        errorMsgPrefix: string
    ): Promise<{ error: AuthError | null }> => {
        setIsLoadingGlobal(true);
        setLoadingMessage(loadingMsg);
        try {
            const { error } = await action();
            if (error) {
                console.error(`${errorMsgPrefix} Error:`, error);
                toast.error(`${errorMsgPrefix} Failed`, { description: error.message });
                return { error };
            }
            if (successMsg) toast.success(successMsg);
            return { error: null };
        } catch (error: any) {
            console.error(`Unexpected ${errorMsgPrefix} Error:`, error);
            const message = error.message || `An unexpected error occurred.`;
            toast.error(`${errorMsgPrefix} Unexpected Error`, { description: message });
            return { error: { name: "UnexpectedError", message } as AuthError }; // Ensure cast to AuthError
        } finally {
            setIsLoadingGlobal(false);
            setLoadingMessage("");
        }
    }, [setIsLoadingGlobal, setLoadingMessage]);

    // --- Sign In ---
    const signIn = useCallback(
        (email: string, password: string, captchaToken: string | null) => {
            const options: { captchaToken?: string } = {};
             if (captchaToken) { options.captchaToken = captchaToken; }
             else { console.warn("Signin attempt without captcha token."); }
            return supabase.auth.signInWithPassword({ email, password, options });
        },
        []
    );

    // --- Sign Up ---
    const signUp = useCallback(
        (name: string, email: string, password: string, captchaToken: string | null) => {
            const options: any = { data: { name } };
            if (captchaToken) { options.captchaToken = captchaToken; }
            else { console.warn("Signup attempt without captcha token."); }
            return supabase.auth.signUp({ email, password, options });
        },
        []
    );

    // --- Sign Out ---
    const signOut = useCallback(async () => {
        setIsLoadingGlobal(true); setLoadingMessage("Logging out...");
        const { error } = await supabase.auth.signOut();
        setIsLoadingGlobal(false); setLoadingMessage("");
        if (error) { console.error("Sign Out Error:", error); toast.error(error.message || "Sign out failed."); }
        else {
            toast.success("Successfully logged out.");
            // Explicitly clear local state as well, although listener should catch it
            setUser(null);
            setSession(null);
        }
        return { error };
    }, [setIsLoadingGlobal, setLoadingMessage]); // queryClient removed as dependency

    // --- Send Password Reset ---
    const sendPasswordReset = useCallback(
        (email: string, captchaToken: string | null) => {
            const redirectUrl = import.meta.env.VITE_PASSWORD_RESET_REDIRECT_URL || `${window.location.origin}/reset-password`;
            const options: { redirectTo?: string; captchaToken?: string } = { redirectTo: redirectUrl };
            if (captchaToken) { options.captchaToken = captchaToken; }
            else { console.warn("Password reset attempt without captcha token."); }
            console.log(`[AuthContext] Calling resetPasswordForEmail for ${email} with options:`, {redirectTo: options.redirectTo, captchaToken: options.captchaToken ? '***' : null});
            return supabase.auth.resetPasswordForEmail(email, options);
        },
        []
    );

    // --- Update Email ---
    const updateUserEmail = useCallback(
        async (newEmail: string) => {
            // Server-side captcha check assumed if enabled in Supabase settings
            const { error } = await supabase.auth.updateUser({ email: newEmail });
            if (error) console.error("Email Update Error:", error);
            // Caller (EmailEditDialog) handles success/error toasts
            return { error };
        },
        []
    );

    // --- Update Password ---
    const updateUserPassword = useCallback(
        async (newPassword: string) => {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) console.error("Password Update Error:", error);
            // Caller (ResetPassword) handles success/error toasts
            return { error };
        },
        []
    );

    // --- Sign In With Provider (OAuth) ---
    const signInWithProvider = useCallback(
        (provider: Provider) => {
             const redirectUrl = import.meta.env.VITE_OAUTH_REDIRECT_URL || window.location.origin;
             // Use performAuthAction for the redirect message
             return performAuthAction(
                () => supabase.auth.signInWithOAuth({ provider, options: { redirectTo: redirectUrl } }),
                `Redirecting to ${provider}...`, "", `OAuth Sign In (${provider})`
            );
        },
        [performAuthAction]
    );

    // --- Refresh Session ---
    const refreshSession = useCallback(async () => {
        console.log("[Auth Provider] Refreshing session...");
        try {
            const { data, error } = await supabase.auth.refreshSession();
            if (error) {
                console.error("[Auth Provider] Error refreshing session:", error);
                if (error.status === 401 || error.status === 403) {
                    console.warn("[Auth Provider] Session refresh failed, signing out.");
                    await signOut(); // Assuming signOut is available in scope
                }
            } else {
                 // Log with type casting for AAL
                 console.log("[Auth Provider] Session refreshed successfully. New AAL:", (data.session?.user as any)?.aal);
            }
        } catch (err) {
            console.error("[Auth Provider] Unexpected error during session refresh:", err);
             // Sign out on unexpected errors too
             await signOut(); // Assuming signOut is available in scope
        }
    // Add signOut to dependency array if it wasn't already inherited
    }, [signOut, setIsLoadingGlobal, setLoadingMessage]); // Ensure signOut is a dependency

    const value: AuthContextProps = {
        isAuthenticated: !!session && !!user,
        user,
        session, // Provide session object
        isLoadingAuth,
        signIn,
        signUp,
        signOut,
        sendPasswordReset,
        updateUserEmail,
        updateUserPassword,
        signInWithProvider,
        refreshSession,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// --- useAuth Hook ---
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// --- Type Exports ---
export type { User as SupabaseUser, Provider as SupabaseProvider, AuthError as SupabaseAuthError, WeakPassword as SupabaseWeakPassword, Session as SupabaseSession } from '@supabase/supabase-js'; // Export Session type