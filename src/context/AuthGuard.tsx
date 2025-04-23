// src/context/AuthGuard.tsx
import React, { useEffect } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext'; // Adjust path if needed
import LoadingScreen from '@/components/global/Loading/LoadingScreen'; // Adjust path if needed

const AuthGuard: React.FC = () => {
    const { 
        isAuthenticated, 
        session, 
        isLoadingAuth, 
        aalData, 
        isLoadingAAL
        // Removed refreshAAL from destructuring as we don't need it anymore
    } = useAuth();
    
    const location = useLocation();
    const navigate = useNavigate();

    // *** IMPORTANT: Confirm these AAL values with your Supabase setup ***
    const REQUIRED_AAL_FOR_FULL_ACCESS = 'aal1'; // CHANGE if needed (e.g., 'aal2' for MFA)
    const RECOVERY_AAL = 'aal1'; // CHANGE if needed (likely 'aal1')

    useEffect(() => {
        // If we're still loading auth or AAL data, wait
        if (isLoadingAuth || isLoadingAAL) {
            console.log('[AuthGuard] Waiting for auth or AAL data...');
            return;
        }

        const currentPath = location.pathname;
        const isResetPasswordPath = currentPath === '/reset-password';

        // If not authenticated, redirect to login (except for login/reset pages)
        if (!isAuthenticated || !session) {
            if (currentPath !== '/login' && !isResetPasswordPath) {
                console.log('[AuthGuard] Not authenticated, redirecting to login.');
                localStorage.setItem("redirectAfterLogin", currentPath + location.search);
                navigate('/login', { replace: true });
            } else {
                console.log('[AuthGuard] Not authenticated, but already on login/reset page.');
            }
            return;
        }

        // Get the current AAL level from the context's aalData
        const currentAal = aalData?.currentLevel;
        const hasRequiredAal = currentAal === REQUIRED_AAL_FOR_FULL_ACCESS;
        const isRecoverySession = currentAal === RECOVERY_AAL;

        console.log(`[AuthGuard] Path: ${currentPath}, IsAuth: ${isAuthenticated}, AAL Current: ${currentAal}, HasRequiredAAL: ${hasRequiredAal}, IsRecovery: ${isRecoverySession}`);

        if (isRecoverySession) {
            if (!isResetPasswordPath) {
                console.warn(`[AuthGuard] User in recovery state (AAL: ${currentAal}) accessing protected route (${currentPath}). Redirecting to /reset-password.`);
                navigate('/reset-password', { replace: true });
            } else {
                console.log('[AuthGuard] Recovery user accessing /reset-password. Allowed.');
            }
            return;
        }

        if (hasRequiredAal) {
            if (isResetPasswordPath) {
                console.warn(`[AuthGuard] User with full session (AAL: ${currentAal}) on /reset-password. Redirecting home.`);
                navigate('/', { replace: true });
                return;
            } else {
                console.log(`[AuthGuard] User with full session (AAL: ${currentAal}) accessing allowed route (${currentPath}).`);
            }
        } else {
            // If AAL is neither the required full access level nor the recovery level
            console.error(`[AuthGuard] User authenticated but AAL (${currentAal}) is unexpected. Required: ${REQUIRED_AAL_FOR_FULL_ACCESS}, Recovery: ${RECOVERY_AAL}. Redirecting to login.`);
            localStorage.setItem("redirectAfterLogin", currentPath + location.search);
            navigate('/login', { replace: true });
            // Consider calling signOut() here if this state is truly invalid
            return;
        }

        console.log('[AuthGuard] Access checks passed.');

    }, [
        isLoadingAuth, 
        isLoadingAAL,
        isAuthenticated, 
        session, 
        aalData, 
        location.pathname, 
        location.search, 
        navigate
        // Removed refreshAAL from dependencies
    ]);

    // Show loading screen while checking auth and AAL
    if (isLoadingAuth || isLoadingAAL) {
        return <LoadingScreen message="Verifying access..." />;
    }

    // Render Outlet only if authenticated (basic check)
    // The useEffect handles finer-grained redirects
    return isAuthenticated ? <Outlet /> : null;
};

export default AuthGuard;