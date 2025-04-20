// --- File: /src/context/ResetPassword.tsx ---
"use client";

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, KeyRound } from "lucide-react";
import { useLoading } from "@/components/global/Loading/LoadingContext";

export default function ResetPassword() {
    const navigate = useNavigate();
    const { updateUserPassword, isLoadingAuth, session } = useAuth(); // Get session
    const { setIsLoading, setLoadingMessage } = useLoading();

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);

    // *** IMPORTANT: CONFIRM THESE WITH YOUR SUPABASE SETUP ***
    const REQUIRED_AAL_FOR_FULL_ACCESS = 'aal1'; // Example: Standard login level
    const RECOVERY_AAL_LEVEL = 'aal1';          // Example: Level during password reset

    // Effect to check the session state on mount
    useEffect(() => {
        // Don't run until auth state is confirmed
        if (isLoadingAuth) {
            return;
        }

        const currentAal = (session?.user as any)?.aal;
        console.log(`[ResetPassword] Auth loaded. Session: ${!!session}, AAL: ${currentAal}`);

        if (session) {
             // Scenario 1: User has the required AAL for full access. They shouldn't be here.
             if (currentAal === REQUIRED_AAL_FOR_FULL_ACCESS) {
                 // If the recovery level IS THE SAME as the full access level,
                 // we trust the AuthGuard to redirect them here *only* if they are in recovery.
                 // So, if they land here with the 'full access' AAL, show the form.
                 if (REQUIRED_AAL_FOR_FULL_ACCESS === RECOVERY_AAL_LEVEL) {
                      console.log("[ResetPassword] Ambiguous AAL detected, but on correct page. Showing form.");
                      setShowForm(true);
                 } else {
                      // If recovery AAL is DIFFERENT, and user has full access AAL, redirect away.
                      console.warn("[ResetPassword] User has full session, redirecting away.");
                      toast.info("You are already logged in and have full access.");
                      navigate('/', { replace: true });
                 }
             }
             // Scenario 2: User has the specific recovery AAL (if different from full access)
             else if (currentAal === RECOVERY_AAL_LEVEL && REQUIRED_AAL_FOR_FULL_ACCESS !== RECOVERY_AAL_LEVEL) {
                 console.log("[ResetPassword] Specific recovery session detected, showing form.");
                 setShowForm(true);
             }
              // Scenario 3: User has an unexpected AAL level
             else {
                 setError(`Invalid session state (AAL: ${currentAal}). Please log out and request a new reset link.`);
                 toast.error("Invalid session state.");
                 console.error(`[ResetPassword] Unexpected AAL (${currentAal}) found on password reset page.`);
                 setShowForm(false); // Ensure form is hidden
             }
        } else {
            // No session - Invalid link or user logged out during process
            setError("Invalid or expired recovery link. Please request a new one.");
            toast.error("Invalid or expired recovery link.");
            console.error(`[ResetPassword] No active session found on password reset page.`);
            setShowForm(false); // Ensure form is hidden
        }

    // Depend on session and isLoadingAuth
    }, [session, isLoadingAuth, navigate, REQUIRED_AAL_FOR_FULL_ACCESS, RECOVERY_AAL_LEVEL]); // Added constants to deps


    // --- navigateToHome function ---
    const navigateToHome = () => {
        setLoadingMessage("Taking you to the homepage...");
        setIsLoading(true);
        setTimeout(() => {
            navigate("/");
            setIsLoading(false);
            setLoadingMessage("");
        }, 300);
    };

    // --- handlePasswordUpdate function ---
     const handlePasswordUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null); // Clear previous errors

        if (newPassword.length < 6) {
          setError("Password must be at least 6 characters long.");
          toast.error("Password must be at least 6 characters long.");
          return;
        }
        if (newPassword !== confirmPassword) {
          setError("Passwords do not match");
          toast.error("Passwords do not match");
          return;
        }

        setIsUpdating(true);
        try {
          const { error: updateError } = await updateUserPassword(newPassword);
          if (updateError) {
              throw updateError;
          }
          toast.success("Password updated successfully! You now have full access.");
          // The AAL should update automatically via onAuthStateChange after password update
          // Navigate home after success
          navigateToHome();
        } catch (err: any) {
          console.error("Error updating password:", err);
          const message = err.message || "Failed to update password. Please try again.";
          setError(message);
          toast.error(message);
        } finally {
          setIsUpdating(false);
        }
      };

    // --- Loading Indicator ---
    // Show loader if Auth is loading OR if we are waiting for the effect to decide about showing the form
    if (isLoadingAuth || (!showForm && !error)) {
        return ( <div className="min-h-screen flex items-center justify-center bg-[#1a1c23]"> <Loader2 className="h-8 w-8 text-[#5865f2] animate-spin" /> </div> );
    }

    // --- Render Form or Error ---
     return (
        <div className="min-h-screen flex items-center justify-center bg-[#1a1c23] p-4">
          <div className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg p-6 w-full max-w-md text-white shadow-xl">
            <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <KeyRound className="h-6 w-6 text-[#5865f2]" /> Reset Your Password
            </h1>
            {showForm ? (
              <>
                <p className="text-gray-400 mb-6"> Enter and confirm your new password below. </p>
                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                  {/* Input fields */}
                  <div>
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input id="newPassword" type="password" placeholder="Enter new password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="bg-[#0f1115] border-[#2a2d36] text-white" disabled={isUpdating} minLength={6} />
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input id="confirmPassword" type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="bg-[#0f1115] border-[#2a2d36] text-white" disabled={isUpdating} />
                  </div>
                  {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                  <Button type="submit" className="w-full bg-[#5865f2] hover:bg-[#4752c4] mt-4" disabled={isUpdating}> {isUpdating ? ( <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating... </> ) : ( "Update Password" )} </Button>
                </form>
              </>
            ) : (
               // Error display when form shouldn't be shown
               <div className="text-center text-red-400 p-4 border border-red-600 rounded-lg bg-red-900/20">
                    {error || "Could not verify password reset link. It might be invalid or expired."}
                    <Button variant="link" onClick={navigateToHome} className="mt-4 text-[#5865f2]"> Go to Home </Button>
                </div>
            )}
          </div>
        </div>
      );
}