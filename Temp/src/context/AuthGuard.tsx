// src/context/AuthGuard.tsx (or src/components/guards/AuthGuard.tsx)
import React, { useEffect } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext'; // Adjust path if needed
import LoadingScreen from '@/components/global/Loading/LoadingScreen'; // Adjust path if needed

const AuthGuard: React.FC = () => {
    // Removed signOut from destructuring as it's unused
    const { isAuthenticated, session, isLoadingAuth } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    // *** IMPORTANT: Confirm these AAL values with your Supabase setup ***
    // Check Supabase logs during password login and after clicking a recovery link.
    const REQUIRED_AAL_FOR_FULL_ACCESS = 'aal1'; // CHANGE if needed (e.g., 'aal2' for MFA)
    const RECOVERY_AAL = 'aal1'; // CHANGE if needed (likely 'aal1')

    useEffect(() => {
        if (isLoadingAuth) {
            console.log('[AuthGuard] Waiting for auth state...');
            return;
        }

        const currentPath = location.pathname;
        const isResetPasswordPath = currentPath === '/reset-password';

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

        // *** Add type casting for AAL access ***
        const currentAal = (session.user as any)?.aal;
        const hasRequiredAal = currentAal === REQUIRED_AAL_FOR_FULL_ACCESS;
        const isRecoverySession = currentAal === RECOVERY_AAL;

        console.log(`[AuthGuard] Path: ${currentPath}, IsAuth: ${isAuthenticated}, Session AAL: ${currentAal}, HasRequiredAAL: ${hasRequiredAal}, IsRecovery: ${isRecoverySession}`);

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

    }, [isLoadingAuth, isAuthenticated, session, location.pathname, location.search, navigate]);

    if (isLoadingAuth) {
        return <LoadingScreen message="Verifying access..." />;
    }

    // Render Outlet only if authenticated (basic check), useEffect handles finer-grained redirects
    return isAuthenticated ? <Outlet /> : null;
};

export default AuthGuard;