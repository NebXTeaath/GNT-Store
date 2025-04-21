// src/pages/Login/LoginModal.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { MailCheck, Loader2, AlertCircle, KeyRound, X } from "lucide-react"; // Added X
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import LoginForm from "@/components/pages/Login/login";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/components/global/Mobile/use-mobile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoginSuccess: () => void;
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

    useEffect(() => { if (canResend || countdown <= 0) return; const interval = setInterval(() => { setCountdown((prev) => { if (prev <= 1) { clearInterval(interval); setCanResend(true); return 0; } return prev - 1; }); }, 1000); return () => clearInterval(interval); }, [canResend, countdown]);
    const resetVerifyCaptchaState = useCallback(() => { isVerificationAttemptCompleteRef.current = true; try { verifyCaptchaRef.current?.reset(); } catch (err) { console.warn(`[CheckEmailView] Captcha reset error:`, err); } setVerifyCaptchaKey(`verify-${Math.random().toString(36).substring(2, 10)}`); }, []);
    const handleResendEmail = () => { if (!email?.includes('@')) { setResendError("Invalid email."); toast.error("Error"); return; } if (isResending) return; setResendError(null); setIsResending(true); isVerificationAttemptCompleteRef.current = false; if (!TurnstileSiteKey || !verifyCaptchaRef.current) { setResendError(!TurnstileSiteKey ? "Captcha config error." : "Captcha not ready."); toast.error(!TurnstileSiteKey ? "Config Error" : "Captcha Error"); setIsResending(false); isVerificationAttemptCompleteRef.current = true; return; } try { verifyCaptchaRef.current.execute(); } catch (err) { setResendError("Captcha start failed."); toast.error("Captcha Error"); setIsResending(false); resetVerifyCaptchaState(); } };
    const onSuccessVerifyCaptcha = async (token: string) => { if (isVerificationAttemptCompleteRef.current) return; isVerificationAttemptCompleteRef.current = true; if (!email?.includes('@')) { setResendError("Internal Error: Email missing."); toast.error("Error"); setIsResending(false); resetVerifyCaptchaState(); return; } try { const { error } = await supabase.auth.resend({ type: 'signup', email: email, options: { captchaToken: token } }); if (error) throw error; toast.success("Verification email resent!"); setCanResend(false); setCountdown(60); setResendError(null); resetVerifyCaptchaState(); } catch (error: any) { const msg = error.message?.includes("For security purposes") ? "Too many requests." : error.message || "Unknown error."; setResendError(msg); toast.error("Resend Failed", { description: msg }); resetVerifyCaptchaState(); } finally { setIsResending(false); } };
    const onErrorVerifyCaptcha = (errorCode: string) => { setResendError(`Captcha failed (${errorCode}).`); toast.error("Captcha Error"); setIsResending(false); resetVerifyCaptchaState(); };
    const onExpireVerifyCaptcha = () => { if (isResending) { setResendError("Captcha expired."); toast.warning("Captcha Expired"); } setIsResending(false); resetVerifyCaptchaState(); };

    return (
        <div className="p-6 text-center space-y-4">
             {/* Close button for CheckEmailView */}
             <Button variant="ghost" size="icon" onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white hover:bg-gray-700/50"> <X className="h-4 w-4" /> <span className="sr-only">Close</span> </Button>
            <MailCheck className="mx-auto h-12 w-12 text-green-500" /> <h3 className="text-xl font-semibold text-white">Check Your Email</h3> <p className="text-gray-400">Verification link sent to <strong className="text-white">{email}</strong>.</p> <p className="text-gray-400">Click the link to activate account, then log in.</p>
            {resendError && ( <p className="text-red-500 text-sm flex items-center justify-center"><AlertCircle className="h-4 w-4 mr-1 shrink-0" />{resendError}</p> )}
            <Button onClick={onClose} className="w-full mt-4 bg-[#5865f2] hover:bg-[#4752c4]" disabled={isResending}>OK</Button>
            <Button onClick={handleResendEmail} variant="outline" className="w-full mt-2 border-[#5865f2] text-[#5865f2] hover:bg-[#5865f2]/10 disabled:opacity-50" disabled={!canResend || isResending}> {isResending ? ( <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</> ) : canResend ? ( "Resend Verification Email" ) : ( `Resend in ${countdown}s` )} </Button>
            <p className="text-xs text-gray-500 mt-1">Check spam or wait for the timer.</p>
            {TurnstileSiteKey ? ( <div style={{ height: 0, overflow: 'hidden' }}><Turnstile ref={verifyCaptchaRef} siteKey={TurnstileSiteKey} onSuccess={onSuccessVerifyCaptcha} onError={onErrorVerifyCaptcha} onExpire={onExpireVerifyCaptcha} key={verifyCaptchaKey} options={{ theme: 'dark', size: 'invisible', execution: 'execute', responseField: false }} /></div> ) : null }
        </div>
    );
};
// --- End CheckEmailView ---

// --- LoginModal ---
export default function LoginModal({ open, onOpenChange, onLoginSuccess }: LoginModalProps) {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<"login" | "register" | "forgot-password">("login");
  const [email, setEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // ONLY for Forgot Password action
  const [error, setError] = useState(""); // Error ONLY for Forgot Password action
  const { sendPasswordReset } = useAuth();
  const [showVerifyEmailView, setShowVerifyEmailView] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  const resetCaptchaRef = useRef<TurnstileInstance>(null);
  const [resetCaptchaKey, setResetCaptchaKey] = useState<string>(`reset-${Math.random().toString(36).substring(2, 15)}`);
  const TurnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITEKEY;
  const resetEmailCaptureRef = useRef<string>("");

  // Callback from LoginForm when registration is successful
  const handleRegisterSuccess = (registeredEmailValue: string) => {
    setRegisteredEmail(registeredEmailValue);
    setShowVerifyEmailView(true); // Show the CheckEmailView
  };

  // Reset internal states when the modal is closed from outside
  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        setShowVerifyEmailView(false); setRegisteredEmail(""); setActiveTab("login"); setResetSent(false); setEmail(""); setError(""); setIsLoading(false); resetEmailCaptureRef.current = "";
        try { resetCaptchaRef.current?.reset(); } catch (e) { console.warn("Captcha reset error on close:", e); }
        setResetCaptchaKey(`reset-close-${Math.random().toString(36).substring(2, 15)}`);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Reset state when tabs change
  const handleTabChange = (tab: "login" | "register" | "forgot-password") => {
    setActiveTab(tab); setShowVerifyEmailView(false); setError(""); setIsLoading(false); setResetSent(false); resetEmailCaptureRef.current = "";
    try { resetCaptchaRef.current?.reset(); } catch (e) { console.warn("Captcha reset error on tab change:", e); }
    setResetCaptchaKey(`reset-tab-${tab}-${Math.random().toString(36).substring(2, 15)}`);
  };

  // --- Password Reset Handlers ---
  const handleResetPasswordRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setIsLoading(true); setError(""); resetEmailCaptureRef.current = email;
    if (!resetEmailCaptureRef.current?.includes('@')) { setError("Invalid email."); toast.error("Invalid Email"); setIsLoading(false); return; }
    if (!TurnstileSiteKey || !resetCaptchaRef.current) { setError(!TurnstileSiteKey ? "Captcha config error." : "Captcha not ready."); toast.error(!TurnstileSiteKey ? "Config Error" : "Captcha Error"); setIsLoading(false); return; }
    try { await resetCaptchaRef.current.execute(); }
    catch (err) { setError("Failed to start captcha."); toast.error("Captcha Error"); setIsLoading(false); resetCaptchaRef.current?.reset(); setResetCaptchaKey(`reset-exec-fail-${Math.random().toString(36).substring(2, 15)}`); }
  };
  const onSuccessResetCaptcha = async (token: string) => {
    const capturedEmail = resetEmailCaptureRef.current;
    if (!capturedEmail) { setError("Internal error: Email missing."); toast.error("Error"); setIsLoading(false); resetCaptchaRef.current?.reset(); setResetCaptchaKey(`reset-verify-fail-noemail-${Math.random().toString(36).substring(2, 15)}`); return; }
    try {
      const { error: resetError } = await sendPasswordReset(capturedEmail, token);
      if (resetError) { let errMsg = resetError.message || "Failed."; if (resetError.message?.includes("security")) errMsg = "Too many requests."; else if (resetError.message?.toLowerCase().includes("captcha") || resetError.message?.toLowerCase().includes("invalid token")) errMsg = "Captcha failed."; setError(errMsg); toast.error("Reset Failed", { description: errMsg }); resetCaptchaRef.current?.reset(); setResetCaptchaKey(`reset-verify-fail-${Math.random().toString(36).substring(2, 15)}`); }
      else { setResetSent(true); setError(""); toast.success("Password reset email sent!"); }
    } catch (err: any) { setError(err.message || "Unexpected error."); toast.error("Error"); resetCaptchaRef.current?.reset(); setResetCaptchaKey(`reset-catch-fail-${Math.random().toString(36).substring(2, 15)}`); }
    finally { setIsLoading(false); resetEmailCaptureRef.current = ""; }
  };
  const onErrorResetCaptcha = (errorCode: string) => { setError(`Captcha failed (${errorCode}).`); toast.error("Captcha Error"); setIsLoading(false); setResetCaptchaKey(`reset-error-${errorCode}-${Math.random().toString(36).substring(2, 15)}`); };
  const onExpireResetCaptcha = () => { if (isLoading) { setError("Captcha expired."); toast.warning("Captcha Expired"); } setIsLoading(false); setResetCaptchaKey(`reset-expire-${Math.random().toString(36).substring(2, 15)}`); };

  // Render Forgot Password Content
  const renderForgotPasswordContent = () => (
    <div className="space-y-4">
      {resetSent ? ( <div className="text-center space-y-4"> <MailCheck className="mx-auto h-12 w-12 text-green-500" /> <p className="text-white font-semibold">Reset email sent!</p> <p className="text-gray-400 text-sm">Check your inbox/spam.</p> <Button className="w-full bg-[#5865f2] hover:bg-[#4752c4]" onClick={() => handleTabChange("login")}> Back to Login </Button> </div> ) : (
        <form onSubmit={handleResetPasswordRequest} className="space-y-4">
          <div className="space-y-2"> <Label htmlFor="reset-email" className="text-white">Email</Label> <Input id="reset-email" type="email" placeholder="your.email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-[#0f1115] border-[#2a2d36] text-white" disabled={isLoading} /> </div>
          {error && ( <p className="text-red-500 text-sm flex items-center"><AlertCircle className="h-4 w-4 mr-1" />{error}</p> )}
          {TurnstileSiteKey ? ( <Turnstile siteKey={TurnstileSiteKey} onSuccess={onSuccessResetCaptcha} onError={onErrorResetCaptcha} onExpire={onExpireResetCaptcha} ref={resetCaptchaRef} key={resetCaptchaKey} options={{ theme: 'dark', size: 'invisible', execution: 'execute', responseField: false }} /> ) : ( <p className="text-xs text-yellow-500 text-center mt-2">Captcha not configured.</p> ) }
          <Button type="submit" className="w-full bg-[#5865f2] hover:bg-[#4752c4]" disabled={isLoading} > {isLoading ? ( <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</> ) : ( <> <KeyRound className="mr-2 h-4 w-4" /> Send Reset Link</> )} </Button>
          <div className="text-center text-sm text-gray-400"> Remember password?{" "} <button type="button" className="text-[#5865f2] hover:text-[#4752c4]" onClick={() => handleTabChange("login")} disabled={isLoading}> Back to Login </button> </div>
        </form>
      )}
    </div>
  );

  // Title/Description Logic
  const getTitle = (): string => { if (showVerifyEmailView) return "Verify Your Email"; switch (activeTab) { case "login": return "Login"; case "register": return "Register"; case "forgot-password": return "Reset Password"; default: return "Welcome"; } };
  const getDescription = (): string => { if (showVerifyEmailView) return "Click the link sent to activate your account."; switch (activeTab) { case "login": return "Access your account"; case "register": return "Create a new account"; case "forgot-password": return "Enter email for reset link"; default: return ""; } };

  // Main Content Switch
  const mainContent = showVerifyEmailView ? ( <CheckEmailView email={registeredEmail} onClose={() => onOpenChange(false)} /> ) :
                      activeTab === "forgot-password" ? ( renderForgotPasswordContent() ) :
                      ( <LoginForm onSuccess={onLoginSuccess} onRegisterSuccess={handleRegisterSuccess} initialTab={activeTab as "login" | "register"} onTabChange={handleTabChange} onForgotPassword={() => handleTabChange("forgot-password")} /> );

  // Render Modal or Drawer
  if (isMobile) {
    return ( <Drawer open={open} onOpenChange={onOpenChange}> <DrawerContent className="bg-[#1a1c23] border-t border-[#2a2d36] text-white max-h-[90vh]"> <DrawerHeader className="px-4 text-center pt-4"> <DrawerTitle className="text-white">{getTitle()}</DrawerTitle> <DrawerDescription className="text-gray-400">{getDescription()}</DrawerDescription> </DrawerHeader> <div className="px-4 pb-6 overflow-y-auto">{mainContent}</div> </DrawerContent> </Drawer> );
  }
  return ( <Dialog open={open} onOpenChange={onOpenChange}> <DialogContent className="sm:max-w-md bg-[#1a1c23] border-[#2a2d36] text-white"> <DialogHeader className="text-center"> <DialogTitle className="text-white">{getTitle()}</DialogTitle> <DialogDescription className="text-gray-400">{getDescription()}</DialogDescription> </DialogHeader> {mainContent} </DialogContent> </Dialog> );
}