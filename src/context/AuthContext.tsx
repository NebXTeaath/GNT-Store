
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
    signIn: (email: string, password: string) => Promise<{ data?: { user: User | null; session: Session | null; } | undefined; error: AuthError | null }>;
    signUp: (name: string, email: string, password: string) => Promise<{ data?: { user: User | null; session: Session | null; } | undefined; error: AuthError | null }>;
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
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [redirectPathAfterLogin, setRedirectPathAfterLogin] = useState<string | null>(null);
    const queryClient = useQueryClient();
    const { setIsLoading: setIsLoadingGlobal, setLoadingMessage } = useLoading();

    // --- Modal Control Functions ---
    const openLoginModal = useCallback((redirectPath: string = '/') => { console.log('[AuthContext] Opening login modal, redirect:', redirectPath); setRedirectPathAfterLogin(redirectPath); setIsLoginModalOpen(true); }, []);
    const closeLoginModal = useCallback(() => { console.log('[AuthContext] Closing login modal.'); setIsLoginModalOpen(false); }, []);
    const clearRedirectPath = useCallback(() => { console.log('[AuthContext] Clearing redirect path.'); setRedirectPathAfterLogin(null); }, []);

    // --- Auth State Listener Effect ---
    useEffect(() => {
        let isMounted = true;
        setIsLoadingAuth(true);
        supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => { if (!isMounted) return; if (error) console.error("[Auth] Initial session error:", error); else console.log("[Auth] Initial session:", initialSession ? `User: ${initialSession.user.id}, AAL: ${(initialSession.user as any)?.aal}` : "None"); setSession(initialSession); setUser(initialSession?.user ?? null); setIsLoadingAuth(false); }).catch(err => { if (!isMounted) return; console.error("[Auth] Initial session catch:", err); setIsLoadingAuth(false); });
        const { data: authListener } = supabase.auth.onAuthStateChange( async (_event, newSession) => { if (!isMounted) return; const currentUser = newSession?.user ?? null; const previousUserId = user?.id; console.log(`[Auth] Event: ${_event}, Session: ${!!newSession}, User: ${currentUser?.id ?? 'null'}, AAL: ${(newSession?.user as any)?.aal ?? 'N/A'}`); setSession(newSession); setUser(currentUser); if (_event === 'SIGNED_IN' && currentUser) { queryClient.invalidateQueries({ queryKey: ['userProfile', currentUser.id] }); /* invalidate others */ } else if (_event === 'SIGNED_OUT') { if (previousUserId) { queryClient.removeQueries({ queryKey: ['userProfile', previousUserId] }); /* remove others */ } queryClient.removeQueries({ queryKey: ['userProfile', null] }); /* remove others */ } else if (_event === 'USER_UPDATED' && currentUser) { queryClient.invalidateQueries({ queryKey: ['userProfile', currentUser.id] }); } /* other events */ } );
        return () => { isMounted = false; authListener?.subscription.unsubscribe(); };
    }, []); // Empty deps is correct


    // --- Auth Action Functions ---
    const performAuthAction = useCallback(async <T extends { error: AuthError | null }>( action: () => Promise<T>, loadingMsg: string, successMsg: string, errorMsgPrefix: string ): Promise<{ error: AuthError | null }> => { setIsLoadingGlobal(true); setLoadingMessage(loadingMsg); try { const { error } = await action(); if (error) { toast.error(`${errorMsgPrefix} Failed`, { description: error.message }); return { error }; } if (successMsg) toast.success(successMsg); return { error: null }; } catch (error: any) { toast.error(`${errorMsgPrefix} Error`, { description: error.message || `Unexpected error.` }); return { error: { name: "UnexpectedError", message: error.message } as AuthError }; } finally { setIsLoadingGlobal(false); setLoadingMessage(""); } }, [setIsLoadingGlobal, setLoadingMessage]);
    
    const signIn = useCallback(
      async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({ 
          email, 
          password 
        });
        return { data: data ?? undefined, error };
      }, 
    []); 
    
    const signUp = useCallback(
      async (name: string, email: string, password: string) => {
        const opts: any = { data: { name } };
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password, 
          options: opts 
        });
        return { data: data ?? undefined, error };
      }, 
    []);
    
    const signOut = useCallback(async () => { setIsLoadingGlobal(true); setLoadingMessage("Logging out..."); const { error } = await supabase.auth.signOut(); setIsLoadingGlobal(false); setLoadingMessage(""); if (error) { toast.error(error.message || "Sign out failed."); } else { toast.success("Logged out."); setUser(null); setSession(null); } return { error }; }, [setIsLoadingGlobal, setLoadingMessage]);
    
    const sendPasswordReset = useCallback((email: string) => {
      const redirectUrl = import.meta.env.VITE_PASSWORD_RESET_REDIRECT_URL || 
        `${window.location.origin}/reset-password`;
      return supabase.auth.resetPasswordForEmail(email, { 
        redirectTo: redirectUrl 
      });
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
        () => supabase.auth.signInWithOAuth({ 
          provider, 
          options: { redirectTo: redirectUrl } 
        }),
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
          console.log("[Auth] Session refreshed. AAL:", (data.session?.user as any)?.aal);
        }
      } catch (err) {
        await signOut();
      }
    }, [signOut]);

    const value: AuthContextProps = { isAuthenticated: !!session && !!user, user, session, isLoadingAuth, isLoginModalOpen, openLoginModal, closeLoginModal, redirectPathAfterLogin, clearRedirectPath, signIn, signUp, signOut, sendPasswordReset, updateUserEmail, updateUserPassword, signInWithProvider, refreshSession };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => { const context = useContext(AuthContext); if (!context) throw new Error('useAuth must be used within AuthProvider'); return context; };
export type { User as SupabaseUser, Provider as SupabaseProvider, AuthError as SupabaseAuthError, Session as SupabaseSession } from '@supabase/supabase-js';
