// src/pages/Login/LoginModal.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { MailCheck, Loader2, AlertCircle, KeyRound } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import LoginForm from "@/pages/Login/login"; // Assuming LoginForm is in the same folder or adjust path
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/components/global/Mobile/use-mobile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLoading } from "@/components/global/Loading/LoadingContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'; // Import Turnstile

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoginSuccess?: () => void;
}

// --- CheckEmailView Component (No Changes Needed Here) ---
const CheckEmailView = ({ email, onClose }: { email: string; onClose: () => void }) => {
    const [countdown, setCountdown] = useState(60);
    const [canResend, setCanResend] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [resendError, setResendError] = useState<string | null>(null);
    const verifyCaptchaRef = useRef<TurnstileInstance>(null);
    const [verifyCaptchaKey, setVerifyCaptchaKey] = useState<string>(`verify-${Math.random().toString(36).substring(2, 15)}`);
    const TurnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITEKEY;
    const isVerificationAttemptCompleteRef = useRef<boolean>(true);

    useEffect(() => {
        if (canResend || countdown <= 0) return;
        const interval = setInterval(() => { setCountdown((prev) => { if (prev <= 1) { clearInterval(interval); setCanResend(true); return 0; } return prev - 1; }); }, 1000);
        return () => clearInterval(interval);
    }, [canResend, countdown]);

    const resetVerifyCaptchaState = useCallback(() => {
        console.log(`[CheckEmailView] Resetting Captcha State`);
        isVerificationAttemptCompleteRef.current = true;
        try { if (verifyCaptchaRef.current) verifyCaptchaRef.current.reset(); }
        catch (err) { console.warn(`[CheckEmailView] Error resetting captcha:`, err); }
        setVerifyCaptchaKey(`verify-${Math.random().toString(36).substring(2, 10)}`);
    }, []);

    const handleResendEmail = () => {
        if (!email || typeof email !== 'string' || !email.includes('@')) {
            const errorMsg = "Cannot resend: Invalid email address provided.";
            console.error("[CheckEmailView]", errorMsg, "Received:", email);
            setResendError(errorMsg); // Set error state
            toast.error("Error", { description: errorMsg });
            return;
        }
        if (isResending) return;
        setResendError(null); setIsResending(true); isVerificationAttemptCompleteRef.current = false;
        if (!TurnstileSiteKey || !verifyCaptchaRef.current) {
            setResendError(!TurnstileSiteKey ? "Captcha configuration error." : "Captcha component not ready. Please refresh."); // Set specific error
            toast.error(!TurnstileSiteKey ? "Configuration Error" : "Captcha Error");
            setIsResending(false); isVerificationAttemptCompleteRef.current = true; return;
        }
        console.log("[CheckEmailView] Executing Turnstile for resend...");
        try { verifyCaptchaRef.current.execute(); console.log("[CheckEmailView] Turnstile execution requested."); }
        catch (err) {
            console.error("[CheckEmailView] Error executing Turnstile:", err);
            setResendError("Failed to start captcha verification. Please try again."); // Set error
            toast.error("Captcha Error", { description: "Could not start challenge." });
            setIsResending(false); resetVerifyCaptchaState();
        }
    };

    // Renamed onVerify to onSuccess
    const onSuccessVerifyCaptcha = async (token: string) => {
        console.log("[CheckEmailView] Captcha verified, token received.");
        if (isVerificationAttemptCompleteRef.current) { console.warn(`[CheckEmailView] onSuccess called, but verification attempt was already complete. Ignoring.`); return; }
        isVerificationAttemptCompleteRef.current = true;
        if (!email || typeof email !== 'string' || !email.includes('@')) {
             const errorMsg = "Internal Error: Email address missing during verification callback.";
             console.error("[CheckEmailView]", errorMsg);
             setResendError(errorMsg); // Set error
             toast.error("Error", { description: "Could not resend email." });
             setIsResending(false); resetVerifyCaptchaState(); return;
         }
        try {
            console.log(`[CheckEmailView] Calling supabase.auth.resend for ${email}`);
            const { error } = await supabase.auth.resend({ type: 'signup', email: email, options: { captchaToken: token } });
            console.log(`[CheckEmailView] supabase.auth.resend completed. Error:`, error);
            if (error) throw error;
            toast.success("Verification email resent successfully!"); setCanResend(false); setCountdown(60); setResendError(null); resetVerifyCaptchaState();
        } catch (error: any) {
             console.error("[CheckEmailView] Resend verification email error:", error);
             const message = error.message?.includes("For security purposes") ? "Too many requests. Please wait a minute and try again." : error.message?.toLowerCase().includes("captcha verification process failed") ? "Captcha verification failed. Please try again." : error.message || "An unknown error occurred.";
             setResendError(message); // Set error
             toast.error("Failed to resend email", { description: message });
             resetVerifyCaptchaState();
         }
        finally { setIsResending(false); }
    };

    const onErrorVerifyCaptcha = (errorCode: string) => {
        console.error("[CheckEmailView] Turnstile Error:", errorCode);
        setResendError(`Captcha challenge failed (${errorCode}). Please try again.`); // Set error
        toast.error("Captcha Error", { description: `Could not verify captcha. Error: ${errorCode}` });
        setIsResending(false); resetVerifyCaptchaState();
    };

    const onExpireVerifyCaptcha = () => {
        console.warn("[CheckEmailView] Turnstile token expired.");
        if (isResending) {
            setResendError("Captcha challenge expired. Please try again."); // Set error
            toast.warning("Captcha Expired", { description: "Please try resending again." });
        }
        setIsResending(false); resetVerifyCaptchaState();
    };

    return (
        <div className="p-6 text-center space-y-4">
            <MailCheck className="mx-auto h-12 w-12 text-green-500" />
            <h3 className="text-xl font-semibold text-white">Check Your Email</h3>
            <p className="text-gray-400"> We've sent a verification link to <strong className="text-white">{email}</strong>.</p>
            <p className="text-gray-400"> Please click the link in the email to activate your account. You can then log in. </p>
            {/* Display the resendError state */}
            {resendError && ( <p className="text-red-500 text-sm flex items-center justify-center"><AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" />{resendError}</p> )}
            <Button onClick={onClose} className="w-full mt-4 bg-[#5865f2] hover:bg-[#4752c4]" disabled={isResending}> OK </Button>
            {/* Use handleResendEmail for the button click */}
            <Button onClick={handleResendEmail} variant="outline" className="w-full mt-2 border-[#5865f2] text-[#5865f2] hover:bg-[#5865f2]/10 disabled:opacity-50 disabled:cursor-not-allowed" disabled={!canResend || isResending} > {isResending ? ( <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending... </> ) : canResend ? ( "Resend Verification Email" ) : ( `Resend available in ${countdown}s` )} </Button>
            <p className="text-xs text-gray-500 mt-1"> Didn't receive the email? Check your spam folder or wait for the timer to resend. </p>
            {/* Corrected Turnstile prop: onVerify -> onSuccess */}
            {TurnstileSiteKey ? (
                <div style={{ height: 0, overflow: 'hidden' }}>
                    <Turnstile
                        ref={verifyCaptchaRef}
                        siteKey={TurnstileSiteKey}
                        onSuccess={onSuccessVerifyCaptcha} // <-- FIX: Renamed prop
                        onError={onErrorVerifyCaptcha}
                        onExpire={onExpireVerifyCaptcha}
                        key={verifyCaptchaKey}
                        options={{ theme: 'dark', size: 'invisible', execution: 'execute', responseField: false }}
                    />
                </div>
            ) : ( <p className="text-xs text-yellow-500 mt-2">Captcha not configured.</p> )}
        </div>
    );
};
// --- End CheckEmailView Component ---


// --- LoginModal Component ---
export default function LoginModal({ open, onOpenChange, onLoginSuccess }: LoginModalProps) {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<"login" | "register" | "forgot-password">("login");
  const [email, setEmail] = useState(""); // Controlled state for FP email input
  const [resetSent, setResetSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Loading state for FP action
  const [error, setError] = useState(""); // FP error
  const { setIsLoadingProfile, setLoadingMessage } = useLoading();
  const { sendPasswordReset } = useAuth(); // Get the updated function
  const [showVerifyEmailView, setShowVerifyEmailView] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  // --- Turnstile state and refs for Reset Password ---
  const resetCaptchaRef = useRef<TurnstileInstance>(null);
  const [resetCaptchaKey, setResetCaptchaKey] = useState<string>(`reset-${Math.random().toString(36).substring(2, 15)}`);
  const TurnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITEKEY;
  const resetEmailCaptureRef = useRef<string>(""); // To hold email during captcha

  // --- Handlers & Effects ---
  const handleLoginSuccess = () => {
    setLoadingMessage("Logging in...");
    setIsLoadingProfile(true);
    onOpenChange(false);
    setTimeout(() => {
      toast.success("Login successful!");
      if (onLoginSuccess) onLoginSuccess();
      // Consider removing reload if app state updates correctly
      window.location.reload();
    }, 500);
  };

  const handleRegisterSuccess = (registeredEmailValue: string) => {
    setRegisteredEmail(registeredEmailValue);
    setShowVerifyEmailView(true); // Show CheckEmailView
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setShowVerifyEmailView(false);
      setRegisteredEmail("");
      setActiveTab("login");
      setResetSent(false);
      setEmail(""); // Reset controlled input
      setError("");
      setIsLoading(false); // Reset FP loading
      resetEmailCaptureRef.current = ""; // Clear captured email ref
      try { resetCaptchaRef.current?.reset(); } catch (e) { console.warn("Error resetting captcha on close:", e); }
      setResetCaptchaKey(`reset-close-${Math.random().toString(36).substring(2, 15)}`);
    }
  }, [open]);

  // Handle tab changes
  const handleTabChange = (tab: "login" | "register" | "forgot-password") => {
    setActiveTab(tab);
    setShowVerifyEmailView(false);
    setError("");
    setIsLoading(false);
    setResetSent(false);
    resetEmailCaptureRef.current = "";
    try { resetCaptchaRef.current?.reset(); } catch (e) { console.warn("Error resetting captcha on tab change:", e); }
    setResetCaptchaKey(`reset-tab-${tab}-${Math.random().toString(36).substring(2, 15)}`);
  };

  // --- Password Reset Request Handler ---
  const handleResetPasswordRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    resetEmailCaptureRef.current = email;

    if (!resetEmailCaptureRef.current || !resetEmailCaptureRef.current.includes('@')) {
      setError("Please enter a valid email address.");
      toast.error("Invalid Email");
      setIsLoading(false);
      return;
    }
    if (!TurnstileSiteKey || !resetCaptchaRef.current) {
       setError(!TurnstileSiteKey ? "Captcha configuration error." : "Captcha component not ready. Please wait or refresh.");
       toast.error(!TurnstileSiteKey ? "Configuration Error" : "Captcha Error");
       setIsLoading(false); return;
     }
    console.log("Executing Turnstile captcha for PASSWORD RESET action...");
    try {
      await resetCaptchaRef.current.execute();
      console.log("Turnstile execution requested for password reset.");
    } catch (err) {
      console.error("Error executing Turnstile for password reset:", err);
      setError("Failed to start captcha verification. Please try again.");
      toast.error("Captcha Error", { description: "Could not start challenge." });
      setIsLoading(false);
      resetCaptchaRef.current?.reset();
      setResetCaptchaKey(`reset-exec-fail-${Math.random().toString(36).substring(2, 15)}`);
    }
  };

  // --- Corrected Turnstile Callback for Reset Password ---
  // Renamed onVerify to onSuccess
  const onSuccessResetCaptcha = async (token: string) => {
      console.log("[FP Verify] Captcha verified, token received.");
      const capturedResetEmail = resetEmailCaptureRef.current;

      if (!capturedResetEmail) {
          console.error("[FP Verify] Captured email ref is empty!");
          setError("Internal error: Email missing during captcha verification.");
          toast.error("Error");
          setIsLoading(false);
          resetCaptchaRef.current?.reset();
          setResetCaptchaKey(`reset-verify-fail-noemail-${Math.random().toString(36).substring(2, 15)}`);
          return;
      }

      try {
          const { error: resetError } = await sendPasswordReset(capturedResetEmail, token);

          if (resetError) {
               console.error("[FP Verify] Reset password error:", resetError);
               let errorMessage = resetError.message || "Failed to send reset email.";
               if (resetError.message?.includes("For security purposes")) { errorMessage = "Too many requests. Please wait a minute and try again."; }
               else if (resetError.message?.toLowerCase().includes("captcha verification process failed") || resetError.message?.toLowerCase().includes("invalid token")) { errorMessage = "Captcha verification failed. Please try again."; }
               setError(errorMessage);
               toast.error("Password Reset Failed", { description: errorMessage });
               resetCaptchaRef.current?.reset(); // Reset captcha on API error
               setResetCaptchaKey(`reset-verify-fail-${Math.random().toString(36).substring(2, 15)}`);
           } else {
                setResetSent(true); // Show success view
                setError("");
                toast.success("Password reset email sent!");
            }
      } catch (err: any) {
           console.error("[FP Verify] Unexpected error:", err);
           setError(err.message || "An unexpected error occurred.");
           toast.error("Password Reset Error");
           resetCaptchaRef.current?.reset();
           setResetCaptchaKey(`reset-catch-fail-${Math.random().toString(36).substring(2, 15)}`);
       } finally {
           setIsLoading(false); // Stop loading indicator
           resetEmailCaptureRef.current = ""; // Clear captured email
       }
  };

  // --- Captcha Error/Expire Handlers for Reset (no change needed) ---
  const onErrorResetCaptcha = (errorCode: string) => { /* ... handle error ... */ setIsLoading(false); setResetCaptchaKey(`reset-error-${errorCode}-${Math.random().toString(36).substring(2, 15)}`); };
  const onExpireResetCaptcha = () => { /* ... handle expire ... */ setIsLoading(false); setResetCaptchaKey(`reset-expire-${Math.random().toString(36).substring(2, 15)}`); };

  // --- Render Forgot Password Content ---
  const renderForgotPasswordContent = () => (
    <div className="space-y-4">
      {resetSent ? (
        <div className="text-center space-y-4">
          <MailCheck className="mx-auto h-12 w-12 text-green-500" />
          <p className="text-white font-semibold">Password reset email sent!</p>
          <p className="text-gray-400 text-sm">Please check your inbox (and spam folder) for instructions to reset your password.</p>
          <Button className="w-full bg-[#5865f2] hover:bg-[#4752c4]" onClick={() => handleTabChange("login")}> Back to Login </Button>
        </div>
      ) : (
        <form onSubmit={handleResetPasswordRequest} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-email" className="text-white">Email</Label>
            <Input id="reset-email" type="email" placeholder="your.email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-[#0f1115] border-[#2a2d36] text-white" disabled={isLoading} />
          </div>
          {error && ( <p className="text-red-500 text-sm flex items-center"><AlertCircle className="h-4 w-4 mr-1" />{error}</p> )}

          {/* Corrected Turnstile Widget Prop: onVerify -> onSuccess */}
          {TurnstileSiteKey ? (
            <Turnstile
              siteKey={TurnstileSiteKey}
              onSuccess={onSuccessResetCaptcha} // <-- FIX: Renamed prop
              onError={onErrorResetCaptcha}
              onExpire={onExpireResetCaptcha}
              ref={resetCaptchaRef}
              key={resetCaptchaKey}
              options={{ theme: 'dark', size: 'invisible', execution: 'execute', responseField: false }}
            />
          ) : ( <p className="text-xs text-yellow-500 text-center mt-2">Captcha is not configured.</p> )}

          <Button type="submit" className="w-full bg-[#5865f2] hover:bg-[#4752c4]" disabled={isLoading} > {isLoading ? ( <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending Link...</> ) : ( <> <KeyRound className="mr-2 h-4 w-4" /> Send Reset Link</> )} </Button>
          <div className="text-center text-sm text-gray-400"> Remember password?{" "} <button type="button" className="text-[#5865f2] hover:text-[#4752c4]" onClick={() => handleTabChange("login")} disabled={isLoading}> Back to Login </button> </div>
        </form>
      )}
    </div>
  );

  // Title/Description logic
  const getTitle = (): string => { // <-- FIX: Added return type string
     if (showVerifyEmailView) return "Verify Your Email";
     switch (activeTab) {
       case "login": return "Login to your account";
       case "register": return "Create an account";
       case "forgot-password": return "Reset your password";
       default: return "Login to your account";
     }
  };
  const getDescription = (): string => { // <-- FIX: Added return type string
     if (showVerifyEmailView) return "Click the link sent to your email to activate your account.";
     switch (activeTab) {
       case "login": return "Enter your credentials to access your account";
       case "register": return "Fill in your details to create a new account";
       case "forgot-password": return "Enter your email and we'll send you a link";
       default: return "Enter your credentials to access your account";
     }
  };

  // Main Content Rendering Logic
  const mainContent = showVerifyEmailView ? (
    <CheckEmailView email={registeredEmail} onClose={() => onOpenChange(false)} />
  ) : activeTab === "forgot-password" ? (
    renderForgotPasswordContent()
  ) : (
    <LoginForm
      onSuccess={handleLoginSuccess}
      onRegisterSuccess={handleRegisterSuccess}
      initialTab={activeTab as "login" | "register"}
      onTabChange={handleTabChange}
      onForgotPassword={() => handleTabChange("forgot-password")} // Ensure this sets the tab correctly
    />
  );

  const commonModalContent = <>{mainContent}</>;

  // Render Modal/Drawer
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="bg-[#1a1c23] border-t border-[#2a2d36] text-white max-h-[90vh]">
          <DrawerHeader className="px-4">
             {/* Call the functions */}
            <DrawerTitle className="text-white">{getTitle()}</DrawerTitle>
            <DrawerDescription className="text-gray-400">{getDescription()}</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto">
            {commonModalContent}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#1a1c23] border-[#2a2d36] text-white">
        <DialogHeader>
            {/* Call the functions */}
          <DialogTitle className="text-white">{getTitle()}</DialogTitle>
          <DialogDescription className="text-gray-400">{getDescription()}</DialogDescription>
        </DialogHeader>
         {commonModalContent}
      </DialogContent>
    </Dialog>
  );
}