// src/pages/Login/LoginModal.tsx
"use client";

import { useState, useEffect } from "react";
import { MailCheck, Loader2 } from "lucide-react"; // Import Loader2 icon
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import LoginForm from "@/pages/Login/login";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/components/global/Mobile/use-mobile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLoading } from "@/components/global/Loading/LoadingContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase"; // Import supabase client

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoginSuccess?: () => void;
}

// --- Enhanced CheckEmailView Component ---
const CheckEmailView = ({ email, onClose }: { email: string; onClose: () => void }) => {
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Timer Effect
  useEffect(() => {
    if (canResend || countdown <= 0) return; // Stop if already enabled or timer finished

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true); // Enable resend button
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Cleanup interval on component unmount or if canResend becomes true early
    return () => clearInterval(interval);
  }, [canResend]); // Rerun effect if canResend state changes (e.g., after successful resend)

  const handleResendEmail = async () => {
    setIsResending(true);
    try {
      // Use Supabase's resend functionality
      const { error } = await supabase.auth.resend({
        type: 'signup', // Specify the type of email to resend
        email: email,
      });

      if (error) {
        // Handle specific errors if needed (e.g., rate limits)
        throw error;
      }

      toast.success("Verification email resent successfully!");
      setCanResend(false); // Disable button again
      setCountdown(60); // Reset timer
    } catch (error: any) {
      console.error("Resend verification email error:", error);
      toast.error("Failed to resend email", { description: error.message || "Please try again later." });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="p-6 text-center space-y-4">
      <MailCheck className="mx-auto h-12 w-12 text-green-500" />
      <h3 className="text-xl font-semibold text-white">Check Your Email</h3>
      <p className="text-gray-400">
        We've sent a verification link to <strong className="text-white">{email}</strong>.
      </p>
      <p className="text-gray-400">
        Please click the link in the email to activate your account. You can then log in.
      </p>
      {/* Main "OK" Button */}
      <Button onClick={onClose} className="w-full mt-4 bg-[#5865f2] hover:bg-[#4752c4]">
        OK
      </Button>
      {/* Resend Button */}
      <Button
        onClick={handleResendEmail}
        variant="outline" // Use outline style for secondary action
        className="w-full mt-2 border-[#5865f2] text-[#5865f2] hover:bg-[#5865f2]/10 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={!canResend || isResending}
      >
        {isResending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Resending...
          </>
        ) : canResend ? (
          "Resend Verification Email"
        ) : (
          `Resend available in ${countdown}s`
        )}
      </Button>
       <p className="text-xs text-gray-500 mt-1">
         Didn't receive the email? Check your spam folder or wait for the timer to resend.
       </p>
    </div>
  );
};
// --- End CheckEmailView Component ---

export default function LoginModal({ open, onOpenChange, onLoginSuccess }: LoginModalProps) {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<"login" | "register" | "forgot-password">("login");
  const [email, setEmail] = useState(""); // For password reset
  const [resetSent, setResetSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // For password reset loading
  const { setIsLoadingProfile, setLoadingMessage } = useLoading();
  const { sendPasswordReset } = useAuth(); // Get sendPasswordReset from useAuth

  // --- Add state for verification view ---
  const [showVerifyEmailView, setShowVerifyEmailView] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  // --- End verification view state ---

  // This handler is now ONLY for successful LOGIN
  const handleLoginSuccess = () => {
    setLoadingMessage("Logging in...");
    setIsLoadingProfile(true);
    onOpenChange(false); // Close modal on successful login
    setTimeout(() => {
      toast.success("Login successful!");
      if (onLoginSuccess) onLoginSuccess();
      window.location.reload();
    }, 500);
  };

  // --- Handler for successful REGISTRATION ---
  const handleRegisterSuccess = (email: string) => {
    setRegisteredEmail(email);
    setShowVerifyEmailView(true);
  };
  // --- End registration success handler ---

   // Reset verification view state when modal closes or opens
   useEffect(() => {
     if (!open) {
        setShowVerifyEmailView(false);
        setRegisteredEmail("");
        setActiveTab("login");
        setResetSent(false);
        setEmail("");
     }
   }, [open]);


  const handleTabChange = (tab: "login" | "register" | "forgot-password") => {
    setActiveTab(tab);
    setShowVerifyEmailView(false); // Ensure verification view hides if user switches tabs
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await sendPasswordReset(email);
      if (error) {
        throw error;
      }
      setResetSent(true);
      toast.success("Password reset email sent! Please check your inbox.");
    } catch (error: any) {
      console.error("Reset password error:", error);
      toast.error(error.message || "Failed to send reset email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderForgotPasswordContent = () => (
    <div className="space-y-4">
      {resetSent ? (
        <div className="text-center space-y-4">
          <p className="text-white">Password reset email sent!</p>
          <p className="text-gray-400">Please check your inbox for instructions to reset your password.</p>
          <Button
            className="w-full bg-[#5865f2] hover:bg-[#4752c4]"
            onClick={() => handleTabChange("login")}
          >
            Back to Login
          </Button>
        </div>
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-email" className="text-white">Email</Label>
            <Input
              id="reset-email"
              type="email"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-[#0f1115] border-[#2a2d36] text-white"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-[#5865f2] hover:bg-[#4752c4]"
            disabled={isLoading}
          >
            {isLoading ? "Sending..." : "Send Reset Link"}
          </Button>
          <div className="text-center text-sm text-gray-400">
            Remember your password?{" "}
            <button
              type="button"
              className="text-[#5865f2] hover:text-[#4752c4]"
              onClick={() => handleTabChange("login")}
            >
              Back to Login
            </button>
          </div>
        </form>
      )}
    </div>
  );

  const getTitle = () => {
    if (showVerifyEmailView) return "Verify Your Email";
    switch (activeTab) {
      case "login": return "Login to your account";
      case "register": return "Create an account";
      case "forgot-password": return "Reset your password";
      default: return "Login to your account";
    }
  };

  const getDescription = () => {
    if (showVerifyEmailView) return "Click the link sent to your email to activate your account.";
    switch (activeTab) {
      case "login": return "Enter your credentials to access your account";
      case "register": return "Fill in your details to create a new account";
      case "forgot-password": return "We'll send you a link to reset your password";
      default: return "Enter your credentials to access your account";
    }
  };

  // --- Content Rendering Logic ---
  const mainContent = showVerifyEmailView ? (
    <CheckEmailView email={registeredEmail} onClose={() => onOpenChange(false)} />
  ) : activeTab === "forgot-password" ? (
    renderForgotPasswordContent()
  ) : (
    <LoginForm
      onSuccess={handleLoginSuccess}
      onRegisterSuccess={handleRegisterSuccess}
      initialTab={activeTab}
      onTabChange={handleTabChange}
      onForgotPassword={() => handleTabChange("forgot-password")}
    />
  );
  // --- End Content Rendering Logic ---

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="bg-[#1a1c23] border-t border-[#2a2d36] text-white max-h-[90vh]">
          <DrawerHeader className="px-4">
            <DrawerTitle className="text-white">{getTitle()}</DrawerTitle>
            <DrawerDescription className="text-gray-400">
              {getDescription()}
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto">
            {mainContent}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#1a1c23] border-[#2a2d36] text-white">
        <DialogHeader>
          <DialogTitle className="text-white">{getTitle()}</DialogTitle>
          <DialogDescription className="text-gray-400">
            {getDescription()}
          </DialogDescription>
        </DialogHeader>
        {mainContent}
      </DialogContent>
    </Dialog>
  );
}