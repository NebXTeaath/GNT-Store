// --- File: /src/context/AuthGuard.tsx ---
import React, { useEffect } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext'; // Adjust path if needed
import LoadingScreen from '@/components/global/Loading/LoadingScreen'; // Adjust path if needed
import { toast } from 'sonner'; // Import toast

const AuthGuard: React.FC = () => {
    // Include session in the destructuring
    const { isAuthenticated, session, isLoadingAuth, openLoginModal, signOut } = useAuth(); // Added signOut
    const location = useLocation();
    const navigate = useNavigate();

    // *** IMPORTANT: CONFIRM THESE WITH YOUR SUPABASE SETUP ***
    // Check Supabase logs/debugger during password login & after clicking recovery link.
    // These are placeholders - adjust based on your actual Supabase AAL configuration.
    const REQUIRED_AAL_FOR_FULL_ACCESS = 'aal1'; // Example: AAL after password is set/MFA done
    const RECOVERY_AAL_LEVEL = 'aal1';          // Example: AAL user gets *during* password reset

    useEffect(() => {
        if (isLoadingAuth) {
            console.log('[AuthGuard] Waiting for auth state...');
            return; // Wait until authentication state is resolved
        }

        const currentPath = location.pathname;
        const isResetPasswordPath = currentPath === '/reset-password';
        const isLoginPage = currentPath === '/login'; // Added check for login page

        // --- Scenario 1: Not Authenticated ---
        if (!isAuthenticated || !session) {
            // Allow access to login and reset password pages if not authenticated
            if (!isLoginPage && !isResetPasswordPath) {
                console.log(`[AuthGuard] Not authenticated, trying to access protected route (${currentPath}). Redirecting to login.`);
                // Store intended path BEFORE opening modal
                localStorage.setItem("redirectAfterLogin", currentPath + location.search);
                openLoginModal(currentPath + location.search); // Open modal and pass redirect path
            } else {
                console.log('[AuthGuard] Not authenticated, but on allowed public/auth page.');
            }
            return; // Stop further checks if not authenticated
        }

        // --- Scenario 2: Authenticated - Now check AAL and context ---
        // Use type assertion to access 'aal' if not directly typed
        const currentAal = (session.user as any)?.aal;
        console.log(`[AuthGuard] Path: ${currentPath}, IsAuth: ${isAuthenticated}, Session AAL: ${currentAal}`);

        // Check if the user is in the recovery state based on AAL level
        // If RECOVERY_AAL_LEVEL === REQUIRED_AAL_FOR_FULL_ACCESS, this simple check
        // isn't enough. You might need to combine it with checking if the session
        // was *just* created very recently, or if some other metadata exists.
        // Assuming for now they *can* be differentiated by AAL or a marker:
        const isInRecoveryState = currentAal === RECOVERY_AAL_LEVEL && REQUIRED_AAL_FOR_FULL_ACCESS !== RECOVERY_AAL_LEVEL; // More explicit check if levels differ

        // If levels are the same (e.g., both 'aal1'), we rely on the context of being on the reset page
        const mightBeInRecoveryDueToPath = currentAal === REQUIRED_AAL_FOR_FULL_ACCESS && isResetPasswordPath;


        // --- Rule 1: User is potentially in recovery state ---
        // Logic needs adjustment if RECOVERY_AAL_LEVEL is the same as REQUIRED_AAL_FOR_FULL_ACCESS
        if (isInRecoveryState) { // This branch only runs if AAL levels *differ*
             if (!isResetPasswordPath) {
                 // If in recovery state but trying to access anything other than reset page
                 console.warn(`[AuthGuard] User in recovery state (AAL: ${currentAal}) accessing protected route (${currentPath}). Redirecting to /reset-password.`);
                 toast.info("Please complete password reset to access this page.");
                 navigate('/reset-password', { replace: true });
             } else {
                 // In recovery state and on the correct page - allow access
                 console.log('[AuthGuard] Recovery user accessing /reset-password. Allowed.');
             }
             return; // Stop checks for recovery state
        }

        // --- Rule 2: User has full access AAL ---
        if (currentAal === REQUIRED_AAL_FOR_FULL_ACCESS) {
             if (isResetPasswordPath) {
                 // If fully authenticated but somehow on reset page, redirect away
                 // This might happen if they completed reset but didn't navigate away yet
                 console.warn(`[AuthGuard] Fully authenticated user (AAL: ${currentAal}) on /reset-password. Redirecting home.`);
                 navigate('/', { replace: true });
             } else {
                 // Fully authenticated and on a regular protected page - allow access
                 console.log(`[AuthGuard] User with full session (AAL: ${currentAal}) accessing allowed route (${currentPath}).`);
                 // Allow Outlet to render
             }
             return; // Stop checks for full access state
        }


         // --- Rule 3: Handling the ambiguous case (AAL is same for recovery and full) ---
         // This applies ONLY if REQUIRED_AAL_FOR_FULL_ACCESS === RECOVERY_AAL_LEVEL
         if (REQUIRED_AAL_FOR_FULL_ACCESS === RECOVERY_AAL_LEVEL && currentAal === REQUIRED_AAL_FOR_FULL_ACCESS) {
             if (!isResetPasswordPath) {
                 // AAL is 'aal1' (or similar), but they are NOT on the reset page.
                 // Assume this is a normal, fully authenticated user. Allow access.
                 console.log(`[AuthGuard] Ambiguous AAL (${currentAal}), but not on reset path. Assuming full access for route (${currentPath}).`);
                  // Allow Outlet to render
             } else {
                 // AAL is 'aal1' (or similar) AND they ARE on the reset page.
                 // Assume this is the recovery flow. Allow access TO the reset page ONLY.
                 console.log(`[AuthGuard] Ambiguous AAL (${currentAal}), but ON reset path. Assuming recovery flow. Allowing access.`);
                  // Allow Outlet to render (which will render the ResetPassword component)
             }
             return; // Stop checks
         }


        // --- Rule 4: Unexpected AAL or State ---
        // If authenticated but AAL is not recognized or doesn't match any expected scenario
        console.error(`[AuthGuard] User authenticated but AAL (${currentAal}) is unexpected or insufficient for (${currentPath}). Required: ${REQUIRED_AAL_FOR_FULL_ACCESS}, Recovery: ${RECOVERY_AAL_LEVEL}. Logging out and redirecting.`);
        toast.error("Your session is invalid. Please log in again.");
        localStorage.setItem("redirectAfterLogin", currentPath + location.search);
        // Sign out the user as the session state is confusing
        signOut().finally(() => {
             openLoginModal(currentPath + location.search); // Redirect to login after sign out attempt
        });

    }, [isLoadingAuth, isAuthenticated, session, location.pathname, location.search, navigate, openLoginModal, signOut, REQUIRED_AAL_FOR_FULL_ACCESS, RECOVERY_AAL_LEVEL]); // Added signOut

    // --- Render Loading or Outlet ---
    if (isLoadingAuth) {
        return <LoadingScreen message="Verifying access..." />;
    }

    // Render children (Outlet) only if authenticated.
    // The useEffect handles the fine-grained redirection based on AAL/state.
    // If the effect decides to redirect, this Outlet might render briefly before the redirect happens.
    return isAuthenticated ? <Outlet /> : null; // Render nothing if redirecting immediately
};

export default AuthGuard;