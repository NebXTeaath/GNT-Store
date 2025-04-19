// src/pages/Login/LoginModal.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react"; // Added useCallback
import { MailCheck, Loader2, AlertCircle } from "lucide-react";
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
import { supabase } from "@/lib/supabase";
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoginSuccess?: () => void;
}

// --- CheckEmailView Component ---
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
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
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
        setResendError(errorMsg);
        toast.error("Error", { description: errorMsg });
        return;
    }
    if (isResending) return;

    setResendError(null);
    setIsResending(true);
    isVerificationAttemptCompleteRef.current = false;

    if (!TurnstileSiteKey) {
        setResendError("Captcha configuration error.");
        toast.error("Configuration Error");
        setIsResending(false); isVerificationAttemptCompleteRef.current = true;
        return;
    }
    if (!verifyCaptchaRef.current) {
        setResendError("Captcha component not ready. Please refresh.");
        toast.error("Captcha Error");
        setIsResending(false); isVerificationAttemptCompleteRef.current = true;
        return;
    }

    console.log("[CheckEmailView] Executing Turnstile for resend...");
    try {
        verifyCaptchaRef.current.execute();
        console.log("[CheckEmailView] Turnstile execution requested.");
    } catch (err) {
        console.error("[CheckEmailView] Error executing Turnstile:", err);
        setResendError("Failed to start captcha verification. Please try again.");
        toast.error("Captcha Error", { description: "Could not start challenge." });
        setIsResending(false);
        resetVerifyCaptchaState();
    }
  };

  const onVerifyVerifyCaptcha = async (token: string) => {
    console.log("[CheckEmailView] Captcha verified, token received.");
     if (isVerificationAttemptCompleteRef.current) {
           console.warn(`[CheckEmailView] onVerify called, but verification attempt was already complete. Ignoring.`);
           return;
     }
      isVerificationAttemptCompleteRef.current = true;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
        const errorMsg = "Internal Error: Email address missing during verification callback.";
        console.error("[CheckEmailView]", errorMsg);
        setResendError(errorMsg);
        toast.error("Error", { description: "Could not resend email." });
        setIsResending(false); resetVerifyCaptchaState();
        return;
    }

    try {
       console.log(`[CheckEmailView] Calling supabase.auth.resend for ${email}`);
       const { error } = await supabase.auth.resend({
           type: 'signup',
           email: email,
           options: { captchaToken: token }
       });
        console.log(`[CheckEmailView] supabase.auth.resend completed. Error:`, error);
       if (error) throw error;
       toast.success("Verification email resent successfully!");
       setCanResend(false); setCountdown(60); setResendError(null); resetVerifyCaptchaState();
    } catch (error: any) {
       console.error("[CheckEmailView] Resend verification email error:", error);
       const message = error.message?.includes("For security purposes")
           ? "Too many requests. Please wait a minute and try again."
           : error.message?.toLowerCase().includes("captcha verification process failed")
           ? "Captcha verification failed. Please try again."
           : error.message || "An unknown error occurred.";
       setResendError(message);
       toast.error("Failed to resend email", { description: message });
        resetVerifyCaptchaState();
    } finally {
       setIsResending(false);
    }
  };

   const onErrorVerifyCaptcha = (errorCode: string) => {
       console.error("[CheckEmailView] Turnstile Error:", errorCode);
       setResendError(`Captcha challenge failed (${errorCode}). Please try again.`);
       toast.error("Captcha Error", { description: `Could not verify captcha. Error: ${errorCode}` });
       setIsResending(false);
       resetVerifyCaptchaState();
   };

   const onExpireVerifyCaptcha = () => {
       console.warn("[CheckEmailView] Turnstile token expired.");
       if (isResending) {
           setResendError("Captcha challenge expired. Please try again.");
           toast.warning("Captcha Expired", { description: "Please try resending again." });
       }
       setIsResending(false);
       resetVerifyCaptchaState();
   };

  return (
    <div className="p-6 text-center space-y-4">
       <MailCheck className="mx-auto h-12 w-12 text-green-500" />
       <h3 className="text-xl font-semibold text-white">Check Your Email</h3>
       <p className="text-gray-400"> We've sent a verification link to <strong className="text-white">{email}</strong>.</p>
       <p className="text-gray-400"> Please click the link in the email to activate your account. You can then log in. </p>
       {resendError && ( <p className="text-red-500 text-sm flex items-center justify-center"><AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" />{resendError}</p> )}
       <Button onClick={onClose} className="w-full mt-4 bg-[#5865f2] hover:bg-[#4752c4]" disabled={isResending}> OK </Button>
       <Button onClick={handleResendEmail} variant="outline" className="w-full mt-2 border-[#5865f2] text-[#5865f2] hover:bg-[#5865f2]/10 disabled:opacity-50 disabled:cursor-not-allowed" disabled={!canResend || isResending} > {isResending ? ( <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending... </> ) : canResend ? ( "Resend Verification Email" ) : ( `Resend available in ${countdown}s` )} </Button>
       <p className="text-xs text-gray-500 mt-1"> Didn't receive the email? Check your spam folder or wait for the timer to resend. </p>
       {TurnstileSiteKey ? ( <div style={{ height: 0, overflow: 'hidden' }}> <Turnstile ref={verifyCaptchaRef} siteKey={TurnstileSiteKey} onSuccess={onVerifyVerifyCaptcha} onError={onErrorVerifyCaptcha} onExpire={onExpireVerifyCaptcha} key={verifyCaptchaKey} options={{ theme: 'dark', size: 'invisible', execution: 'execute', responseField: false }} /> </div> ) : ( <p className="text-xs text-yellow-500 mt-2">Captcha not configured.</p> )}
    </div>
  );
};
// --- End CheckEmailView Component ---

// --- LoginModal Component ---
export default function LoginModal({ open, onOpenChange, onLoginSuccess }: LoginModalProps) {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<"login" | "register" | "forgot-password">("login");
  const [email, setEmail] = useState(""); // For password reset input CONTROLLED state
  const [resetSent, setResetSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Loading state for FP action
  const [error, setError] = useState(""); // FP error
  const { setIsLoadingProfile, setLoadingMessage } = useLoading();
  const { sendPasswordReset } = useAuth();
  const [showVerifyEmailView, setShowVerifyEmailView] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  const resetCaptchaRef = useRef<TurnstileInstance>(null);
  const [resetCaptchaKey, setResetCaptchaKey] = useState<string>(`reset-${Math.random().toString(36).substring(2, 15)}`);
  const TurnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITEKEY;

  // --- Ref to capture reset email ---
  const resetEmailCaptureRef = useRef<string>("");

  // --- Handlers & Effects ---
  const handleLoginSuccess = () => {
    setLoadingMessage("Logging in...");
    setIsLoadingProfile(true);
    onOpenChange(false);
    setTimeout(() => {
      toast.success("Login successful!");
      if (onLoginSuccess) onLoginSuccess();
      window.location.reload(); // Consider if this is truly needed vs. state updates
    }, 500);
  };

  const handleRegisterSuccess = (registeredEmailValue: string) => { // Renamed param for clarity
    setRegisteredEmail(registeredEmailValue);
    setShowVerifyEmailView(true); // Show the CheckEmailView
  };

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
      setResetCaptchaKey(`reset-${Math.random().toString(36).substring(2, 15)}`);
    }
  }, [open]);

  const handleTabChange = (tab: "login" | "register" | "forgot-password") => {
    setActiveTab(tab);
    setShowVerifyEmailView(false);
    setError("");
    setIsLoading(false);
    resetEmailCaptureRef.current = ""; // Clear captured email ref on tab change
    setResetCaptchaKey(`reset-${Math.random().toString(36).substring(2, 15)}`);
  };

  // --- MODIFIED Password Reset Handler: Capture email in Ref ---
  const handleResetPasswordRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // --- Capture email value from STATE into REF ---
    resetEmailCaptureRef.current = email;
    console.log(`[FP Submit] Captured email: ${resetEmailCaptureRef.current}`); // Log captured value

    // Check captured email BEFORE checking captcha
    if (!resetEmailCaptureRef.current || !resetEmailCaptureRef.current.includes('@')) {
        setError("Please enter a valid email address.");
        toast.error("Invalid Email");
        setIsLoading(false);
        return;
    }

    if (!TurnstileSiteKey || !resetCaptchaRef.current) {
       if (!TurnstileSiteKey) { setError("Captcha configuration error."); toast.error("Configuration Error"); setIsLoading(false); return; }
       if (!resetCaptchaRef.current) { setError("Captcha component not ready."); toast.error("Captcha Error"); setIsLoading(false); return; }
     }

    console.log("Executing Turnstile captcha for PASSWORD RESET action...");
    try {
        resetCaptchaRef.current.execute();
    } catch (err) {
         console.error("Error executing Turnstile for password reset:", err);
         setError("Failed to start captcha verification."); toast.error("Captcha Error"); setIsLoading(false);
         resetCaptchaRef.current?.reset(); setResetCaptchaKey(`reset-exec-fail-${Math.random().toString(36).substring(2, 15)}`);
     }
  };

  // --- MODIFIED: Turnstile Verification Handler for Reset Password - Use REF ---
  const onVerifyResetCaptcha = async (token: string) => {
      const capturedResetEmail = resetEmailCaptureRef.current; // Read from ref
      console.log(`[FP Verify] Captcha verified, using captured email: ${capturedResetEmail}, token received.`);

      // Use the captured email from the ref
      if (!capturedResetEmail) {
          console.error("[FP Verify] Captured email ref is empty!");
          setError("Internal error: Email missing.");
          toast.error("Error");
          setIsLoading(false);
          resetCaptchaRef.current?.reset(); setResetCaptchaKey(`reset-verify-fail-noemail-${Math.random().toString(36).substring(2, 15)}`);
          return;
      }

      try {
          // Call sendPasswordReset with the CAPTURED email from the REF
          const { error: resetError } = await sendPasswordReset(capturedResetEmail, token);

          if (resetError) {
               console.error("[FP Verify] Reset password error:", resetError);
               let errorMessage = resetError.message || "Failed to send reset email.";
               if (resetError.message.includes("captcha") || resetError.message.includes("challenge") || resetError.message.includes("already-seen-response")) {
                  errorMessage = "Captcha verification failed or expired. Please try again.";
               } else if (resetError.message.toLowerCase().includes("unable to validate email address")) {
                  errorMessage = "Invalid email address provided.";
               } else if (resetError.message.toLowerCase().includes("for security purposes")) {
                  errorMessage = "Too many requests. Please wait and try again.";
               }
               setError(errorMessage); toast.error("Password Reset Failed", { description: errorMessage });
               resetCaptchaRef.current?.reset(); setResetCaptchaKey(`reset-verify-fail-${Math.random().toString(36).substring(2, 15)}`);
           } else {
                setResetSent(true); setError(""); toast.success("Password reset email sent!");
            }
      } catch (err: any) {
           console.error("[FP Verify] Unexpected error:", err);
           setError(err.message || "An unexpected error occurred."); toast.error("Password Reset Error");
           resetCaptchaRef.current?.reset(); setResetCaptchaKey(`reset-catch-fail-${Math.random().toString(36).substring(2, 15)}`);
       } finally { setIsLoading(false); }
  };
  // --- End Modified Callback ---

  // --- Other FP Handlers (onError, onExpire - no change) ---
  const onErrorResetCaptcha = (errorCode: string) => {
      console.error("Turnstile Error (Password Reset):", errorCode);
      setError(`Captcha challenge failed (${errorCode}).`); toast.error("Captcha Error"); setIsLoading(false);
      setResetCaptchaKey(`reset-error-${errorCode}-${Math.random().toString(36).substring(2, 15)}`);
   };
  const onExpireResetCaptcha = () => {
      console.warn("Turnstile token expired (Password Reset).");
      setError("Captcha challenge expired."); toast.warning("Captcha Expired"); setIsLoading(false);
      setResetCaptchaKey(`reset-expire-${Math.random().toString(36).substring(2, 15)}`);
   };

  // --- Render Forgot Password Content ---
  const renderForgotPasswordContent = () => (
    <div className="space-y-4">
      {resetSent ? (
        <div className="text-center space-y-4">
          <p className="text-white">Password reset email sent!</p>
          <p className="text-gray-400">Please check your inbox for instructions.</p>
          <Button className="w-full bg-[#5865f2] hover:bg-[#4752c4]" onClick={() => handleTabChange("login")}> Back to Login </Button>
        </div>
      ) : (
        <form onSubmit={handleResetPasswordRequest} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-email" className="text-white">Email</Label>
            <Input id="reset-email" type="email" placeholder="your.email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-[#0f1115] border-[#2a2d36] text-white" disabled={isLoading} />
          </div>
          {error && ( <p className="text-red-500 text-sm flex items-center"><AlertCircle className="h-4 w-4 mr-1" />{error}</p> )}
          {TurnstileSiteKey && ( <Turnstile siteKey={TurnstileSiteKey} onSuccess={onVerifyResetCaptcha} onError={onErrorResetCaptcha} onExpire={onExpireResetCaptcha} ref={resetCaptchaRef} key={resetCaptchaKey} options={{ theme: 'dark', size: 'invisible', execution: 'execute', responseField: false }} /> )}
          <Button type="submit" className="w-full bg-[#5865f2] hover:bg-[#4752c4]" disabled={isLoading} > {isLoading ? ( <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</> ) : ( "Send Reset Link" )} </Button>
          <div className="text-center text-sm text-gray-400"> Remember password?{" "} <button type="button" className="text-[#5865f2] hover:text-[#4752c4]" onClick={() => handleTabChange("login")} disabled={isLoading}> Back to Login </button> </div>
        </form>
      )}
    </div>
  );

  // Title/Description logic
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
       case "forgot-password": return "Enter your email and we'll send you a link";
       default: return "Enter your credentials to access your account";
     }
  };

  // --- Main Content Rendering Logic ---
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
      onForgotPassword={() => handleTabChange("forgot-password")}
    />
  );

  const commonModalContent = <>{mainContent}</>;

  // --- Render Modal/Drawer ---
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
          <DialogTitle className="text-white">{getTitle()}</DialogTitle>
          <DialogDescription className="text-gray-400">
            {getDescription()}
          </DialogDescription>
        </DialogHeader>
         {commonModalContent}
      </DialogContent>
    </Dialog>
  );
}