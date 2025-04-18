// src/pages/Login/LoginModal.tsx
"use client";

import { useState, useEffect, useRef } from "react"; // Add useRef
import { MailCheck, Loader2, AlertCircle } from "lucide-react"; // Import Loader2 and AlertCircle
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
import { supabase } from "@/lib/supabase"; // Import supabase client (already there)
import HCaptcha from "@hcaptcha/react-hcaptcha"; // Import HCaptcha

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoginSuccess?: () => void;
}

// --- CheckEmailView Component --- (Keep existing code)
const CheckEmailView = ({ email, onClose }: { email: string; onClose: () => void }) => {
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isResending, setIsResending] = useState(false);

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
  }, [canResend]);

  const handleResendEmail = async () => {
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });
      if (error) throw error;
      toast.success("Verification email resent successfully!");
      setCanResend(false);
      setCountdown(60);
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
      <Button onClick={onClose} className="w-full mt-4 bg-[#5865f2] hover:bg-[#4752c4]">
        OK
      </Button>
      <Button
        onClick={handleResendEmail}
        variant="outline"
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
  const [isLoading, setIsLoading] = useState(false); // General loading state (now used for reset too)
  const [error, setError] = useState(""); // Error state for reset password
  const { setIsLoadingProfile, setLoadingMessage } = useLoading();
  const { sendPasswordReset } = useAuth(); // Get the modified sendPasswordReset

  // --- Verification view state --- (Keep existing code)
  const [showVerifyEmailView, setShowVerifyEmailView] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  // --- HCAPTCHA State and Ref ---
  const captchaRef = useRef<HCaptcha>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const hCaptchaSiteKey = import.meta.env.VITE_HCAPTCHA_SITEKEY;
  // No need for captchaAction here, as this modal part only handles reset password captcha

  // Login success handler (Keep existing code)
  const handleLoginSuccess = () => {
    setLoadingMessage("Logging in...");
    setIsLoadingProfile(true);
    onOpenChange(false);
    setTimeout(() => {
      toast.success("Login successful!");
      if (onLoginSuccess) onLoginSuccess();
      window.location.reload();
    }, 500);
  };

  // Register success handler (Keep existing code)
  const handleRegisterSuccess = (email: string) => {
    setRegisteredEmail(email);
    setShowVerifyEmailView(true);
  };

  // Reset state on open/close (Keep existing code, add reset specific state)
  useEffect(() => {
     if (!open) {
        setShowVerifyEmailView(false);
        setRegisteredEmail("");
        setActiveTab("login");
        setResetSent(false);
        setEmail("");
        setError(""); // Reset error
        setIsLoading(false); // Reset loading
        setCaptchaToken(null); // Reset captcha token
        captchaRef.current?.resetCaptcha(); // Reset captcha widget
     }
   }, [open]);

  // Tab change handler (Keep existing code, reset captcha state)
  const handleTabChange = (tab: "login" | "register" | "forgot-password") => {
    setActiveTab(tab);
    setShowVerifyEmailView(false);
    setError(""); // Reset error on tab change
    setIsLoading(false); // Reset loading
    setCaptchaToken(null); // Reset captcha token
    captchaRef.current?.resetCaptcha(); // Reset captcha widget
  };

  // --- MODIFIED Password Reset Handler: Trigger Captcha ---
  const handleResetPasswordRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setCaptchaToken(null); // Reset previous token

    if (!hCaptchaSiteKey) {
        console.error("Reset Pwd Error: hCaptcha site key is not configured.");
        setError("Captcha configuration error. Please contact support.");
        toast.error("Configuration Error", {description: "Captcha site key is missing."});
        setIsLoading(false);
        return;
    }
    if (!captchaRef.current) {
        console.error("Reset Pwd Error: hCaptcha ref is not available.");
        setError("Captcha component failed to load. Please refresh.");
        toast.error("Captcha Error", { description: "Captcha component not ready." });
        setIsLoading(false);
        return;
    }

    console.log("Executing captcha for PASSWORD RESET action...");
    try {
        // Use executeAsync for potential promise-based handling, or just execute()
        captchaRef.current.execute(); // Trigger the invisible captcha challenge
        // The actual API call now happens in onVerifyCaptchaForReset
    } catch (err) {
        console.error("Error executing hCaptcha for password reset:", err);
        setError("Failed to start captcha verification. Please try again.");
        toast.error("Captcha Error", { description: "Could not start captcha challenge." });
        setIsLoading(false);
    }
  };

  // --- NEW: Captcha Verification Handler for Reset Password ---
  const onVerifyCaptchaForReset = async (token: string) => {
      console.log(`hCaptcha verified for password reset, token received.`);
      setCaptchaToken(token); // Store token

      // Proceed with the password reset API call
      try {
          const { error: resetError } = await sendPasswordReset(email, token); // Pass token
          if (resetError) {
              console.error("Reset password error (from AuthContext):", resetError);
              let errorMessage = resetError.message || "Failed to send reset email.";
              if (resetError.message.toLowerCase().includes("captcha verification failed")) {
                  errorMessage = "Captcha verification failed. Please try again.";
              } else if (resetError.message.toLowerCase().includes("unable to validate email address")) {
                  errorMessage = "Invalid email address provided.";
              } else if (resetError.message.toLowerCase().includes("for security purposes")) {
                  // Rate limit or similar error from Supabase
                  errorMessage = "Too many requests. Please wait and try again.";
              }
              setError(errorMessage);
              toast.error("Password Reset Failed", { description: errorMessage });
          } else {
              setResetSent(true); // Show success view
              setError(""); // Clear any previous errors
              toast.success("Password reset email sent! Please check your inbox.");
          }
      } catch (err: any) {
          console.error("Unexpected error during password reset:", err);
          const message = err.message || "An unexpected error occurred.";
          setError(message);
          toast.error("Password Reset Error", { description: message });
      } finally {
          setIsLoading(false); // Stop loading
          setCaptchaToken(null); // Clear token
          captchaRef.current?.resetCaptcha(); // Reset hCaptcha widget visual state
      }
  };

  // --- NEW: Captcha Error Handler for Reset Password ---
  const onErrorCaptchaForReset = (err: string) => {
      console.error("hCaptcha Error (Password Reset):", err);
      setError("Captcha challenge failed. Please try again.");
      toast.error("Captcha Error", { description: "Could not verify captcha. Please try again." });
      setIsLoading(false); // Stop loading
      setCaptchaToken(null);
  };

  // --- NEW: Captcha Expired Handler for Reset Password ---
  const onExpireCaptchaForReset = () => {
      console.warn("hCaptcha token expired (Password Reset).");
      setError("Captcha challenge expired. Please complete the challenge again.");
      toast.warning("Captcha Expired", { description: "Please complete the captcha challenge again." });
      setCaptchaToken(null);
      setIsLoading(false); // Stop loading as user needs to retry
  };
  // --- End HCAPTCHA Handlers ---

  // Render function for Forgot Password content (use new handler)
  const renderForgotPasswordContent = () => (
    <div className="space-y-4">
      {resetSent ? (
        <div className="text-center space-y-4">
          <p className="text-white">Password reset email sent!</p>
          <p className="text-gray-400">Please check your inbox for instructions to reset your password.</p>
          <Button
            className="w-full bg-[#5865f2] hover:bg-[#4752c4]"
            onClick={() => handleTabChange("login")} // Reset state implicitly via handleTabChange
          >
            Back to Login
          </Button>
        </div>
      ) : (
        // Use the new handler here
        <form onSubmit={handleResetPasswordRequest} className="space-y-4">
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
              disabled={isLoading} // Disable input while loading/verifying
            />
          </div>
          {/* Display error message */}
          {error && (
             <p className="text-red-500 text-sm flex items-center">
               <AlertCircle className="h-4 w-4 mr-1" />
               {error}
             </p>
          )}
          <Button
            type="submit"
            className="w-full bg-[#5865f2] hover:bg-[#4752c4]"
            disabled={isLoading} // Disable button when loading
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
             ) : (
                "Send Reset Link"
             )}
          </Button>
          <div className="text-center text-sm text-gray-400">
            Remember your password?{" "}
            <button
              type="button"
              className="text-[#5865f2] hover:text-[#4752c4]"
              onClick={() => handleTabChange("login")} // Reset state implicitly
              disabled={isLoading} // Disable link while loading
            >
              Back to Login
            </button>
          </div>
        </form>
      )}
    </div>
  );

  // Title/Description logic (Keep existing code)
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
      case "forgot-password": return "Enter your email and we'll send you a link to reset your password"; // Slightly updated
      default: return "Enter your credentials to access your account";
    }
  };

  // --- Content Rendering Logic (Keep existing code) ---
  const mainContent = showVerifyEmailView ? (
    <CheckEmailView email={registeredEmail} onClose={() => onOpenChange(false)} />
  ) : activeTab === "forgot-password" ? (
    renderForgotPasswordContent()
  ) : (
    <LoginForm
      onSuccess={handleLoginSuccess}
      onRegisterSuccess={handleRegisterSuccess}
      initialTab={activeTab as "login" | "register"} // Ensure type safety
      onTabChange={handleTabChange}
      onForgotPassword={() => handleTabChange("forgot-password")}
    />
  );

  const commonModalContent = (
      <>
         {mainContent}
         {/* **** RENDER HCAPTCHA FOR PASSWORD RESET **** */}
         {/* Render only when the modal is open and site key exists */}
         {/* Place it outside conditional rendering of mainContent so it's always mounted when modal is open */}
         {open && hCaptchaSiteKey && (
           <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}> {/* Hide visually but keep mounted */}
             <HCaptcha
                 sitekey={hCaptchaSiteKey}
                 onVerify={onVerifyCaptchaForReset} // Use the reset-specific handler
                 onError={onErrorCaptchaForReset}
                 onExpire={onExpireCaptchaForReset}
                 ref={captchaRef}
                 size="invisible"
             />
           </div>
         )}
         {/* **** END HCAPTCHA RENDER **** */}
      </>
  );


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
            {commonModalContent} {/* Render content + captcha */}
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
         {commonModalContent} {/* Render content + captcha */}
      </DialogContent>
    </Dialog>
  );
}