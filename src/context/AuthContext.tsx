// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, Session } from '@/lib/supabase';
import { User, Provider, AuthError } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useLoading } from '@/components/global/Loading/LoadingContext';
import { useLocation, useNavigate } from 'react-router-dom';

interface AuthContextProps {
    isAuthenticated: boolean;
    user: User | null;
    session: Session | null;
    isLoadingAuth: boolean;
    // --- Login Modal State & Control ---
    isLoginModalOpen: boolean;
    openLoginModal: (redirectPath?: string) => void;
    closeLoginModal: () => void;
    redirectPathAfterLogin: string | null;
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
    const location = useLocation();
    const navigate = useNavigate();

    // --- IMPROVED Modal Control Functions ---
    const openLoginModal = useCallback((redirectTo?: string) => {
        // Only set redirect path if explicitly provided
        if (redirectTo !== undefined) {
            console.log('[AuthContext] Opening login modal with redirect to:', redirectTo);
            setRedirectPathAfterLogin(redirectTo);
        } else {
            console.log('[AuthContext] Opening login modal without redirect (stay on current page)');
            setRedirectPathAfterLogin(null);
        }
        setIsLoginModalOpen(true);
    }, []);

    const closeLoginModal = useCallback(() => {
        console.log('[AuthContext] Closing login modal.');
        setIsLoginModalOpen(false);
        // Don't clear redirect path when manually closed - user might reopen modal
        // setRedirectPathAfterLogin(null);
    }, []);

    // --- Handle successful login redirect ---
    const handleLoginSuccess = useCallback(() => {
        console.log('[AuthContext] Login successful. Redirect path:', redirectPathAfterLogin);
        
        // Close the modal first
        setIsLoginModalOpen(false);
        
        // Handle redirect logic
        if (redirectPathAfterLogin) {
            const currentPath = location.pathname + location.search;
            
            // Only redirect if the target path is different from current path
            if (redirectPathAfterLogin !== currentPath) {
                console.log('[AuthContext] Redirecting to:', redirectPathAfterLogin);
                navigate(redirectPathAfterLogin);
            } else {
                console.log('[AuthContext] Already on target page, no redirect needed');
            }
            
            // Clear the redirect path after handling
            setRedirectPathAfterLogin(null);
        } else {
            console.log('[AuthContext] No redirect path set, staying on current page');
        }
    }, [redirectPathAfterLogin, location.pathname, location.search, navigate]);
    // --- END IMPROVEMENT ---

    // --- Auth State Listener Effect (MODIFIED to handle login success) ---
    useEffect(() => {
        let isMounted = true;
        setIsLoadingAuth(true);
        
        supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
            if (!isMounted) return;
            if (error) {
                console.error("[Auth] Initial session error:", error);
            } else {
                console.log("[Auth] Initial session:", initialSession ? `User: ${initialSession.user.id}` : "None");
            }
            setSession(initialSession);
            setUser(initialSession?.user ?? null);
            setIsLoadingAuth(false);
        }).catch(err => {
            if (!isMounted) return;
            console.error("[Auth] Initial session catch:", err);
            setIsLoadingAuth(false);
        });

        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, newSession) => {
                if (!isMounted) return;
                
                const currentUser = newSession?.user ?? null;
                const previousUserId = user?.id;
                
                console.log(`[Auth] Event: ${event}, Session: ${!!newSession}, User: ${currentUser?.id ?? 'null'}`);
                
                setSession(newSession);
                setUser(currentUser);

                if (event === 'SIGNED_IN' && currentUser) {
                    queryClient.invalidateQueries({ queryKey: ['userProfile', currentUser.id] });
                    
                    // Handle redirect after successful login
                    handleLoginSuccess();
                    
                } else if (event === 'SIGNED_OUT') {
                    if (previousUserId) {
                        queryClient.removeQueries({ queryKey: ['userProfile', previousUserId] });
                    }
                    // Clear redirect path on sign out
                    setRedirectPathAfterLogin(null);
                } else if (event === 'USER_UPDATED' && currentUser) {
                    queryClient.invalidateQueries({ queryKey: ['userProfile', currentUser.id] });
                }
            }
        );

        return () => {
            isMounted = false;
            authListener?.subscription.unsubscribe();
        };
    }, [queryClient, handleLoginSuccess]);

    // --- Auth Action Functions (Unchanged) ---
    const signIn = useCallback(async (email: string, password: string) => {
        return supabase.auth.signInWithPassword({ email, password });
    }, []);

    const signUp = useCallback(async (name: string, email: string, password: string) => {
        return supabase.auth.signUp({
            email,
            password,
            options: { data: { name } }
        });
    }, []);

    const signOut = useCallback(async () => {
        setIsLoadingGlobal(true);
        setLoadingMessage("Logging out...");
        
        const { error } = await supabase.auth.signOut();
        
        setIsLoadingGlobal(false);
        
        if (error) {
            toast.error(error.message || "Sign out failed.");
        } else {
            toast.success("Logged out.");
            setUser(null);
            setSession(null);
        }
        
        return { error };
    }, [setIsLoadingGlobal, setLoadingMessage]);

    const sendPasswordReset = useCallback((email: string) => {
        const redirectUrl = import.meta.env.VITE_PASSWORD_RESET_REDIRECT_URL || `${window.location.origin}/reset-password`;
        return supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });
    }, []);

    const updateUserEmail = useCallback(async (newEmail: string) => {
        return supabase.auth.updateUser({ email: newEmail });
    }, []);

    const updateUserPassword = useCallback(async (newPassword: string) => {
        return supabase.auth.updateUser({ password: newPassword });
    }, []);

    const signInWithProvider = useCallback(async (provider: Provider) => {
        const redirectUrl = import.meta.env.VITE_OAUTH_REDIRECT_URL || window.location.origin;
        return supabase.auth.signInWithOAuth({
            provider,
            options: { redirectTo: redirectUrl }
        });
    }, []);

    const refreshSession = useCallback(async () => {
        await supabase.auth.refreshSession();
    }, []);

    const value: AuthContextProps = {
        isAuthenticated: !!session && !!user,
        user,
        session,
        isLoadingAuth,
        isLoginModalOpen,
        openLoginModal,
        closeLoginModal,
        redirectPathAfterLogin,
        signIn,
        signUp,
        signOut,
        sendPasswordReset,
        updateUserEmail,
        updateUserPassword,
        signInWithProvider,
        refreshSession
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};