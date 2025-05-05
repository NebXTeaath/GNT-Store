// src/context/ResetPassword.tsx
"use client"; // Keep if using Next.js App Router, otherwise remove

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext"; // Import Supabase Auth context
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, KeyRound } from "lucide-react"; // Import icons
import { useLoading } from "@/components/global/Loading/LoadingContext";

export default function ResetPassword() {
  const navigate = useNavigate();
  // Use the updateUserPassword function from Supabase Auth context
  const { updateUserPassword, isLoadingAuth, session } = useAuth();
  const { setIsLoading, setLoadingMessage } = useLoading();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false); // State to control form visibility

  // Effect to check if the user is in the recovery state when the component mounts
  useEffect(() => {
      // The Supabase SDK handles the token from the URL fragment (#...) automatically
      // when onAuthStateChange runs after the user lands on this page.
      // We just need to check if a session exists *after* the SDK has processed the URL.
      // Give the AuthContext a moment to potentially process the recovery token.
      const timer = setTimeout(() => {
          if (!isLoadingAuth) { // Wait until auth state is resolved
              if (session) {
                  // A session exists, implying the recovery token was likely processed.
                  // You could potentially check session.user.aud === 'authenticated'
                  // or specifically look for signs of a recovery session if Supabase provided them,
                  // but usually, just having *a* session on this page means recovery is active.
                  setShowForm(true);
                  console.log("ResetPassword: Recovery session detected, showing form.");
              } else {
                  setError("Invalid or expired recovery link. Please request a new one.");
                  toast.error("Invalid or expired recovery link.");
                  console.error("ResetPassword: No active session found on password reset page.");
              }
          }
      }, 500); // Small delay to allow AuthContext to initialize

      return () => clearTimeout(timer);
  }, [session, isLoadingAuth, navigate]);

  const navigateToHome = () => {
    setLoadingMessage("Taking you to the homepage...");
    setIsLoading(true);
    
    setTimeout(() => {
      navigate("/");
      setIsLoading(false);
      setLoadingMessage("");
    }, 300);
  };

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
      // Call the function from AuthContext to update the password
      const { error: updateError } = await updateUserPassword(newPassword);

      if (updateError) {
          // Handle specific Supabase errors if needed
          throw updateError; // Let the catch block handle it
      }

      toast.success("Password updated successfully! Logged In...");
      // Navigate to homepage since the user is already logged in
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

  if (isLoadingAuth || (!showForm && !error)) {
      // Show loading indicator while checking auth state
      return (
          <div className="min-h-screen flex items-center justify-center bg-[#1a1c23]">
              <Loader2 className="h-8 w-8 text-[#5865f2] animate-spin" />
          </div>
      );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a1c23] p-4">
      <div className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg p-6 w-full max-w-md text-white shadow-xl">
        <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <KeyRound className="h-6 w-6 text-[#5865f2]" /> Reset Your Password
        </h1>

        {showForm ? (
          <>
            <p className="text-gray-400 mb-6">
              Enter and confirm your new password below.
            </p>
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="bg-[#0f1115] border-[#2a2d36] text-white"
                  disabled={isUpdating}
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="bg-[#0f1115] border-[#2a2d36] text-white"
                  disabled={isUpdating}
                />
              </div>

              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

              <Button
                type="submit"
                className="w-full bg-[#5865f2] hover:bg-[#4752c4] mt-4"
                disabled={isUpdating}
              >
                {isUpdating ? (
                   <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating... </>
                ) : (
                    "Update Password"
                )}
              </Button>
            </form>
          </>
        ) : (
          // Display error message if the form isn't shown due to an issue
           <div className="text-center text-red-400 p-4 border border-red-600 rounded-lg bg-red-900/20">
                {error || "Could not verify password reset link. It might be invalid or expired."}
                <Button variant="link" onClick={navigateToHome} className="mt-4 text-[#5865f2]">
                    Go to Home
                </Button>
            </div>
        )}
      </div>
    </div>
  );
}