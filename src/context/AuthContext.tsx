// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, Session } from '@/lib/supabase';
import { User, Provider, AuthError } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useLoading } from '@/components/global/Loading/LoadingContext';

// Define an interface for the AAL data
interface AALData {
  currentLevel: 'aal1' | 'aal2' | null;
  nextLevel: 'aal1' | 'aal2' | null;
  currentAuthenticationMethods: Array<any>; // You can define a more specific type if needed
}

interface AuthContextProps {
    isAuthenticated: boolean;
    user: User | null;
    session: Session | null;
    isLoadingAuth: boolean;
    // Add AAL data to the context
    aalData: AALData | null;
    isLoadingAAL: boolean;
    // --- Login Modal State & Control ---
    isLoginModalOpen: boolean;
    openLoginModal: (redirectPath?: string) => void;
    closeLoginModal: () => void;
    redirectPathAfterLogin: string | null;
    clearRedirectPath: () => void;
    // --- Auth Functions ---
    signIn: (email: string, password: string, captchaToken: string | null) => Promise<{ data?: { user: User | null; session: Session | null; } | undefined; error: AuthError | null }>;
    signUp: (name: string, email: string, password: string, captchaToken: string | null) => Promise<{ data?: { user: User | null; session: Session | null; } | undefined; error: AuthError | null }>;
    signOut: () => Promise<{ error: AuthError | null }>;
    sendPasswordReset: (email: string, captchaToken: string | null) => Promise<{ error: AuthError | null }>;
    updateUserEmail: (newEmail: string) => Promise<{ error: AuthError | null }>;
    updateUserPassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
    signInWithProvider: (provider: Provider) => Promise<{ error: AuthError | null }>;
    refreshSession: () => Promise<void>;
    refreshAAL: () => Promise<AALData | null>; // New function to refresh AAL
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [redirectPathAfterLogin, setRedirectPathAfterLogin] = useState<string | null>(null);
    // Add state for AAL data
    const [aalData, setAALData] = useState<AALData | null>(null);
    const [isLoadingAAL, setIsLoadingAAL] = useState(false);
    const queryClient = useQueryClient();
    const { setIsLoading: setIsLoadingGlobal, setLoadingMessage } = useLoading();

    // --- Modal Control Functions ---
    const openLoginModal = useCallback((redirectPath: string = '/') => { 
        console.log('[AuthContext] Opening login modal, redirect:', redirectPath); 
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

    // --- Fetch AAL Data Function ---
    const fetchAALData = useCallback(async (): Promise<AALData | null> => {
        if (!session) return null;
        
        setIsLoadingAAL(true);
        try {
            const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
            if (error) {
                console.error('[Auth] Error fetching AAL data:', error);
                return null;
            }
            
            console.log('[Auth] AAL Data:', data);
            setAALData(data);
            return data;
        } catch (err) {
            console.error('[Auth] Exception fetching AAL data:', err);
            return null;
        } finally {
            setIsLoadingAAL(false);
        }
    }, [session]);

    // Exposed function to manually refresh AAL data
    const refreshAAL = useCallback(async (): Promise<AALData | null> => {
        console.log('[Auth] Manually refreshing AAL data');
        return fetchAALData();
    }, [fetchAALData]);

    // --- Auth State Listener Effect ---
    useEffect(() => {
        let isMounted = true;
        setIsLoadingAuth(true);
        
        supabase.auth.getSession().then(async ({ data: { session: initialSession }, error }) => { 
            if (!isMounted) return; 
            
            if (error) {
                console.error("[Auth] Initial session error:", error); 
            } else {
                console.log("[Auth] Initial session:", initialSession 
                    ? `User: ${initialSession.user.id}` 
                    : "None"); 
                
                setSession(initialSession); 
                setUser(initialSession?.user ?? null);
                
                // Fetch initial AAL data if we have a session
                if (initialSession) {
                    await fetchAALData();
                }
            }
            
            setIsLoadingAuth(false); 
        }).catch(err => { 
            if (!isMounted) return; 
            console.error("[Auth] Initial session catch:", err); 
            setIsLoadingAuth(false); 
        });
        
        const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, newSession) => { 
            if (!isMounted) return; 
            
            const currentUser = newSession?.user ?? null;
            console.log(`[Auth] Event: ${_event}, Session Exists: ${!!newSession}`);
            
            if (newSession && currentUser) {
                console.log('[Auth] Full User Object in Event:', currentUser);
                console.log(`[Auth] User ID: ${currentUser.id}`);
            } else {
                console.log('[Auth] No session/user in this event.');
            } 
            
            const previousUserId = user?.id; 
            console.log(`[Auth] Event: ${_event}, Session: ${!!newSession}, User: ${currentUser?.id ?? 'null'}`); 
            
            setSession(newSession); 
            setUser(currentUser); 
            
            // Fetch AAL data after auth state change if we have a session
            if (newSession) {
                try {
                    const aalData = await fetchAALData();
                    console.log('[Auth] Updated AAL data after auth event:', aalData);
                } catch (aalErr) {
                    console.error('[Auth] Failed to fetch AAL data after auth event:', aalErr);
                }
            } else {
                // Clear AAL data when no session
                setAALData(null);
            }
            
            if (_event === 'SIGNED_IN' && currentUser) { 
                queryClient.invalidateQueries({ queryKey: ['userProfile', currentUser.id] }); 
                /* invalidate others */ 
            } else if (_event === 'SIGNED_OUT') { 
                if (previousUserId) { 
                    queryClient.removeQueries({ queryKey: ['userProfile', previousUserId] }); 
                    /* remove others */ 
                } 
                queryClient.removeQueries({ queryKey: ['userProfile', null] }); 
                /* remove others */ 
            } else if (_event === 'USER_UPDATED' && currentUser) { 
                queryClient.invalidateQueries({ queryKey: ['userProfile', currentUser.id] }); 
            } 
        });
        
        return () => { 
            isMounted = false; 
            authListener?.subscription.unsubscribe(); 
        };
    }, [fetchAALData]); // Add fetchAALData as dependency

    // --- Auth Action Functions ---
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
                toast.error(`${errorMsgPrefix} Failed`, { description: error.message }); 
                return { error }; 
            } 
            if (successMsg) toast.success(successMsg); 
            return { error: null }; 
        } catch (error: any) { 
            toast.error(`${errorMsgPrefix} Error`, { description: error.message || `Unexpected error.` }); 
            return { error: { name: "UnexpectedError", message: error.message } as AuthError }; 
        } finally { 
            setIsLoadingGlobal(false); 
            setLoadingMessage(""); 
        } 
    }, [setIsLoadingGlobal, setLoadingMessage]);
    
    const signIn = useCallback(async (email: string, password: string, captchaToken: string | null) => { 
        const opts = captchaToken ? { captchaToken } : {}; 
        const { data, error } = await supabase.auth.signInWithPassword({ email, password, options: opts }); 
        return { data: data ?? undefined, error }; 
    }, []);
    
    const signUp = useCallback(async (name: string, email: string, password: string, captchaToken: string | null) => { 
        const opts: any = { data: { name } }; 
        if (captchaToken) opts.captchaToken = captchaToken; 
        const { data, error } = await supabase.auth.signUp({ email, password, options: opts }); 
        return { data: data ?? undefined, error }; 
    }, []);
    
    const signOut = useCallback(async () => { 
        setIsLoadingGlobal(true); 
        setLoadingMessage("Logging out..."); 
        const { error } = await supabase.auth.signOut(); 
        setIsLoadingGlobal(false); 
        setLoadingMessage(""); 
        if (error) { 
            toast.error(error.message || "Sign out failed."); 
        } else { 
            toast.success("Logged out."); 
            setUser(null); 
            setSession(null); 
            setAALData(null); // Clear AAL data on signout
        } 
        return { error }; 
    }, [setIsLoadingGlobal, setLoadingMessage]);
    
    const sendPasswordReset = useCallback((email: string, captchaToken: string | null) => { 
        const redirectUrl = import.meta.env.VITE_PASSWORD_RESET_REDIRECT_URL || `${window.location.origin}/reset-password`; 
        const opts = { redirectTo: redirectUrl, ...(captchaToken && { captchaToken })}; 
        return supabase.auth.resetPasswordForEmail(email, opts); 
    }, []);
    
    const updateUserEmail = useCallback(async (newEmail: string) => { 
        const { error } = await supabase.auth.updateUser({ email: newEmail }); 
        return { error }; 
    }, []);
    
    const updateUserPassword = useCallback(async (newPassword: string) => { 
        const { error } = await supabase.auth.updateUser({ password: newPassword }); 
        return { error }; 
    }, []);
    
    const signInWithProvider = useCallback((provider: Provider) => { 
        const redirectUrl = import.meta.env.VITE_OAUTH_REDIRECT_URL || window.location.origin; 
        return performAuthAction(
            () => supabase.auth.signInWithOAuth({ provider, options: { redirectTo: redirectUrl } }), 
            `Redirecting...`, 
            "", 
            `OAuth Sign In` 
        ); 
    }, [performAuthAction]);
    
    const refreshSession = useCallback(async () => { 
        console.log("[Auth] Refreshing session..."); 
        try { 
            const { data, error } = await supabase.auth.refreshSession(); 
            if (error) { 
                if (error.status === 401 || error.status === 403) { 
                    await signOut(); 
                } 
            } else { 
                console.log("[Auth] Session refreshed.");
                // Also refresh AAL data when refreshing session
                await fetchAALData();
            } 
        } catch (err) { 
            await signOut(); 
        } 
    }, [signOut, fetchAALData]);

    const value: AuthContextProps = { 
        isAuthenticated: !!session && !!user, 
        user, 
        session, 
        isLoadingAuth,
        aalData,
        isLoadingAAL,
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
        refreshAAL
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => { 
    const context = useContext(AuthContext); 
    if (!context) throw new Error('useAuth must be used within AuthProvider'); 
    return context; 
};

export type { User as SupabaseUser, Provider as SupabaseProvider, AuthError as SupabaseAuthError, Session as SupabaseSession } from '@supabase/supabase-js';