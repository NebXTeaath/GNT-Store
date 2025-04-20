// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, Session } from '@/lib/supabase';
import { User, Provider, AuthError } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useLoading } from '@/components/global/Loading/LoadingContext';

interface AuthContextProps {
    isAuthenticated: boolean;
    user: User | null;
    session: Session | null; // Expose the full session object
    isLoadingAuth: boolean;
    // --- Login Modal State & Control ---
    isLoginModalOpen: boolean;
    openLoginModal: (redirectPath?: string) => void;
    closeLoginModal: () => void;
    redirectPathAfterLogin: string | null;
    clearRedirectPath: () => void;
    // --- Auth Functions ---
    // Adjusted return types to allow nulls within data for user/session, aligning better with Supabase potential returns on error/signup
    signIn: (email: string, password: string, captchaToken: string | null) => Promise<{ data?: { user: User | null; session: Session | null; } | undefined; error: AuthError | null }>;
    signUp: (name: string, email: string, password: string, captchaToken: string | null) => Promise<{ data?: { user: User | null; session: Session | null; } | undefined; error: AuthError | null }>;
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
    const [session, setSession] = useState<Session | null>(null);
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [redirectPathAfterLogin, setRedirectPathAfterLogin] = useState<string | null>(null);
    const queryClient = useQueryClient();
    const { setIsLoading: setIsLoadingGlobal, setLoadingMessage } = useLoading();

    // --- Modal Control Functions ---
    const openLoginModal = useCallback((redirectPath: string = '/') => {
        console.log('[AuthContext] Opening login modal, redirect path:', redirectPath);
        setRedirectPathAfterLogin(redirectPath);
        setIsLoginModalOpen(true);
    }, []);

    const closeLoginModal = useCallback(() => {
        console.log('[AuthContext] Closing login modal.');
        setIsLoginModalOpen(false);
    }, []);

    const clearRedirectPath = useCallback(() => {
        console.log('[AuthContext] Clearing redirect path.');
        setRedirectPathAfterLogin(null);
    }, []);

    // --- Auth State Listener Effect ---
    useEffect(() => {
        let isMounted = true;
        setIsLoadingAuth(true);
        console.log("[Auth Provider] Mounting: Fetching initial session...");
        supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
            if (!isMounted) return;
            if (error) console.error("[Auth Provider] Error fetching initial session:", error);
            else console.log("[Auth Provider] Initial session fetched:", initialSession ? `User: ${initialSession.user.id}, AAL: ${(initialSession.user as any)?.aal}` : "No session");
            setSession(initialSession);
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
                if (!isMounted) { console.log("[Auth Listener] Unmounted, ignoring event:", _event); return; }
                const currentUser = newSession?.user ?? null;
                const previousUserId = user?.id;

                console.log(`[Auth Listener] Event: ${_event}, New Session: ${!!newSession}, User: ${currentUser?.id ?? 'null'}, AAL: ${(newSession?.user as any)?.aal ?? 'N/A'}`);

                setSession(newSession);
                setUser(currentUser);

                 // Invalidate/remove queries based on auth events
                 if (_event === 'SIGNED_IN' && currentUser) {
                    console.log(`[Auth] SIGNED_IN ${currentUser.id} (AAL: ${(currentUser as any)?.aal}). Invalidating caches.`);
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
                     queryClient.removeQueries({ queryKey: ['wishlist', null] });
                     queryClient.removeQueries({ queryKey: ['orders', null] });
                     queryClient.removeQueries({ queryKey: ['repairrequests', null] });
                 } else if (_event === 'USER_UPDATED' && currentUser) {
                     console.log(`[Auth] USER_UPDATED ${currentUser.id}. Invalidating profile.`);
                     queryClient.invalidateQueries({ queryKey: ['userProfile', currentUser.id] });
                 } else if (_event === 'PASSWORD_RECOVERY') {
                    console.log("[Auth] PASSWORD_RECOVERY event detected. Session AAL:", (newSession?.user as any)?.aal);
                 } else if (_event === 'TOKEN_REFRESHED') {
                     console.log("[Auth] TOKEN_REFRESHED. Session AAL:", (newSession?.user as any)?.aal);
                 }
                 // Note: USER_DELETED block removed as it's not a standard event
            } // End of onAuthStateChange callback
        ); // End of supabase.auth.onAuthStateChange call

        return () => {
            isMounted = false;
            console.log("[Auth Provider] Unmounting: Unsubscribing auth listener.");
            authListener?.subscription.unsubscribe();
        };
    }, []); // Empty dependency array is correct


    // --- Auth Action Functions ---
    const performAuthAction = useCallback(async <T extends { error: AuthError | null }>( action: () => Promise<T>, loadingMsg: string, successMsg: string, errorMsgPrefix: string ): Promise<{ error: AuthError | null }> => {
         setIsLoadingGlobal(true); setLoadingMessage(loadingMsg);
         try { const { error } = await action(); if (error) { console.error(`${errorMsgPrefix} Error:`, error); toast.error(`${errorMsgPrefix} Failed`, { description: error.message }); return { error }; } if (successMsg) toast.success(successMsg); return { error: null }; }
         catch (error: any) { console.error(`Unexpected ${errorMsgPrefix} Error:`, error); const message = error.message || `Unexpected error.`; toast.error(`${errorMsgPrefix} Error`, { description: message }); return { error: { name: "UnexpectedError", message } as AuthError }; }
         finally { setIsLoadingGlobal(false); setLoadingMessage(""); }
    }, [setIsLoadingGlobal, setLoadingMessage]);

    const signIn = useCallback( async (email: string, password: string, captchaToken: string | null) => { const options: { captchaToken?: string } = {}; if (captchaToken) options.captchaToken = captchaToken; else console.warn("Signin no captcha."); const { data, error } = await supabase.auth.signInWithPassword({ email, password, options }); return { data: data ? { user: data.user, session: data.session } : undefined, error }; }, [] );
    const signUp = useCallback( async (name: string, email: string, password: string, captchaToken: string | null) => { const options: any = { data: { name } }; if (captchaToken) options.captchaToken = captchaToken; else console.warn("Signup no captcha."); const { data, error } = await supabase.auth.signUp({ email, password, options }); return { data: data ? { user: data.user, session: data.session } : undefined, error }; }, [] );
    const signOut = useCallback(async () => { setIsLoadingGlobal(true); setLoadingMessage("Logging out..."); const { error } = await supabase.auth.signOut(); setIsLoadingGlobal(false); setLoadingMessage(""); if (error) { console.error("Sign Out Error:", error); toast.error(error.message || "Sign out failed."); } else { toast.success("Successfully logged out."); setUser(null); setSession(null); } return { error }; }, [setIsLoadingGlobal, setLoadingMessage]);
    const sendPasswordReset = useCallback( (email: string, captchaToken: string | null) => { const redirectUrl = import.meta.env.VITE_PASSWORD_RESET_REDIRECT_URL || `${window.location.origin}/reset-password`; const options: { redirectTo?: string; captchaToken?: string } = { redirectTo: redirectUrl }; if (captchaToken) options.captchaToken = captchaToken; else console.warn("Password reset no captcha."); console.log(`[AuthContext] Calling resetPasswordForEmail for ${email}...`); return supabase.auth.resetPasswordForEmail(email, options); }, [] );
    const updateUserEmail = useCallback( async (newEmail: string) => { const { error } = await supabase.auth.updateUser({ email: newEmail }); if (error) console.error("Email Update Error:", error); return { error }; }, [] );
    const updateUserPassword = useCallback( async (newPassword: string) => { const { error } = await supabase.auth.updateUser({ password: newPassword }); if (error) console.error("Password Update Error:", error); return { error }; }, [] );
    const signInWithProvider = useCallback( (provider: Provider) => { const redirectUrl = import.meta.env.VITE_OAUTH_REDIRECT_URL || window.location.origin; return performAuthAction( () => supabase.auth.signInWithOAuth({ provider, options: { redirectTo: redirectUrl } }), `Redirecting to ${provider}...`, "", `OAuth Sign In (${provider})` ); }, [performAuthAction] );
    const refreshSession = useCallback(async () => { console.log("[Auth Provider] Refreshing session..."); try { const { data, error } = await supabase.auth.refreshSession(); if (error) { console.error("[Auth Provider] Error refreshing session:", error); if (error.status === 401 || error.status === 403) { console.warn("[Auth Provider] Session refresh failed, signing out."); await signOut(); } } else { console.log("[Auth Provider] Session refreshed. New AAL:", (data.session?.user as any)?.aal); } } catch (err) { console.error("[Auth Provider] Unexpected error during session refresh:", err); await signOut(); } }, [signOut]); // signOut dependency is correct

    const value: AuthContextProps = {
        isAuthenticated: !!session && !!user,
        user,
        session,
        isLoadingAuth,
        isLoginModalOpen,
        openLoginModal,
        closeLoginModal,
        redirectPathAfterLogin,
        clearRedirectPath,
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
export type { User as SupabaseUser, Provider as SupabaseProvider, AuthError as SupabaseAuthError, Session as SupabaseSession } from '@supabase/supabase-js';