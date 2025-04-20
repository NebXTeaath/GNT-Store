// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, Session } from '@/lib/supabase';
import { User, Provider, AuthError, WeakPassword } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useLoading } from '@/components/global/Loading/LoadingContext';

interface AuthContextProps {
    isAuthenticated: boolean;
    user: User | null;
    session: Session | null;
    isLoadingAuth: boolean;
    signIn: (email: string, password: string, captchaToken: string | null) => Promise<{ error: AuthError | null }>;
    signUp: (name: string, email: string, password: string, captchaToken: string | null) => Promise<{ error: AuthError | null }>;
    signOut: () => Promise<{ error: AuthError | null }>;
    // **** SIGNATURE MODIFIED ****
    sendPasswordReset: (email: string, captchaToken: string | null) => Promise<{ error: AuthError | null }>;
    updateUserEmail: (newEmail: string) => Promise<{ error: AuthError | null }>; // No captcha token needed here, server handles if enabled
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

    // useEffect for session and auth listener... (keep existing code)
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
                     queryClient.removeQueries({ queryKey: ['userProfile', null] });
                     queryClient.removeQueries({ queryKey: ['cart', null] });
                } else if (_event === 'USER_UPDATED' && currentUser) {
                     console.log(`[Auth] USER_UPDATED ${currentUser.id}. Invalidating profile.`);
                     queryClient.invalidateQueries({ queryKey: ['userProfile', currentUser.id] });
                } else if (_event === 'PASSWORD_RECOVERY') {
                    console.log("[Auth] PASSWORD_RECOVERY event detected.");
                    // No specific action needed here, ResetPassword component handles session presence
                }
            }
        );

        return () => {
            isMounted = false;
            authListener?.subscription.unsubscribe();
        };
    }, [queryClient, user?.id]); // Keep user?.id dependency


    // Centralized Auth Action Wrapper (kept for actions like OAuth, potentially others)
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
            return { error: { name: "UnexpectedError", message } as AuthError };
        } finally {
            setIsLoadingGlobal(false);
            setLoadingMessage("");
        }
    }, [setIsLoadingGlobal, setLoadingMessage]);

    // --- Sign In --- (No change needed)
    const signIn = useCallback(
        (email: string, password: string, captchaToken: string | null) => {
            const options: { captchaToken?: string } = {};
             if (captchaToken) {
                 options.captchaToken = captchaToken;
             } else {
                console.warn("Attempting signin without captcha token. Supabase might reject this if captcha is enabled.");
             }
            return supabase.auth.signInWithPassword({ email, password, options });
        },
        []
    );

    // --- Sign Up --- (No change needed)
    const signUp = useCallback(
        (name: string, email: string, password: string, captchaToken: string | null) => {
            const options: any = {
                data: { name }
            };
            if (captchaToken) {
                options.captchaToken = captchaToken;
            } else {
                console.warn("Attempting signup without captcha token");
            }
            return supabase.auth.signUp({
                email,
                password,
                options
            });
        },
        []
    );

    // --- Sign Out --- (No change needed)
    const signOut = useCallback(async () => {
        setIsLoadingGlobal(true); setLoadingMessage("Logging out...");
        const { error } = await supabase.auth.signOut();
        setIsLoadingGlobal(false); setLoadingMessage("");
        if (error) { console.error("Sign Out Error:", error); toast.error(error.message || "Sign out failed."); }
        else { toast.success("Successfully logged out."); }
        return { error };
    }, [setIsLoadingGlobal, setLoadingMessage]);

    // --- Send Password Reset --- **** MODIFIED ****
    const sendPasswordReset = useCallback(
        // Added captchaToken parameter
        (email: string, captchaToken: string | null) => {
            const redirectUrl = import.meta.env.VITE_PASSWORD_RESET_REDIRECT_URL || `${window.location.origin}/reset-password`;
            const options: { redirectTo?: string; captchaToken?: string } = { // Added captchaToken type
                redirectTo: redirectUrl,
            };

            // Add captcha token to options if provided
            if (captchaToken) {
                options.captchaToken = captchaToken;
            } else {
                // If captcha is required by Supabase but no token is provided,
                // Supabase will likely return an error.
                 console.warn("Attempting password reset without captcha token. Supabase might reject this if captcha is enabled.");
            }

            // Call supabase directly, let LoginModal handle loading/toast/errors
            console.log(`[AuthContext] Calling resetPasswordForEmail for ${email} with options:`, {redirectTo: options.redirectTo, captchaToken: options.captchaToken ? '***' : null});
            return supabase.auth.resetPasswordForEmail(email, options);
        },
        [] // Dependencies remain empty
    );

    // --- Update Email --- (No change needed - token handled server-side)
    // Note: The success toast is handled by the caller (EmailEditDialog) now
    const updateUserEmail = useCallback(
        async (newEmail: string) => {
            const { error } = await supabase.auth.updateUser({ email: newEmail });
            if (error) console.error("Email Update Error:", error);
            return { error };
        },
        [] // No dependency on performAuthAction
    );

    // --- Update Password --- (No change needed - called from ResetPassword page)
    const updateUserPassword = useCallback(
        async (newPassword: string) => {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) console.error("Password Update Error:", error);
            // Let ResetPassword handle success/error toasts
            return { error };
        },
        []
    );

    // --- Sign In With Provider (OAuth) --- (Kept performAuthAction for loading/redirect message)
    const signInWithProvider = useCallback(
        (provider: Provider) => {
             const redirectUrl = import.meta.env.VITE_OAUTH_REDIRECT_URL || window.location.origin;
             return performAuthAction(
                () => supabase.auth.signInWithOAuth({ provider, options: { redirectTo: redirectUrl } }),
                `Redirecting to ${provider}...`, "", `OAuth Sign In (${provider})`
            );
        },
        [performAuthAction]
    );

    // --- Refresh Session --- (No change needed)
    const refreshSession = useCallback(async () => {
        try {
            const { error } = await supabase.auth.refreshSession();
            if (error) console.error("Error refreshing session:", error);
        } catch (err) {
            console.error("Unexpected error during session refresh:", err);
        }
    }, []);

    const value: AuthContextProps = {
        isAuthenticated: !!user,
        user,
        session,
        isLoadingAuth,
        signIn,
        signUp,
        signOut,
        sendPasswordReset, // Ensure the modified sendPasswordReset is included
        updateUserEmail,
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

export type { User as SupabaseUser, Provider as SupabaseProvider, AuthError as SupabaseAuthError, WeakPassword as SupabaseWeakPassword } from '@supabase/supabase-js';