
// src/components/pages/Login/LoginModal.tsx
import React, { useState, useEffect } from "react";
import { MailCheck, Loader2, AlertCircle, KeyRound, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import LoginForm from "@/components/pages/Login/login";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/components/global/Mobile/use-mobile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { useLoading } from "@/components/global/Loading/LoadingContext";
import { supabase } from "@/lib/supabase";

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
  const { setIsLoadingAuth, setLoadingMessage } = useLoading();

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

  const handleResendEmail = async () => {
    if (!email?.includes('@')) {
      setResendError("Invalid email.");
      toast.error("Error");
      return;
    }
    if (isResending) return;
    
    setResendError(null);
    setIsResending(true);
    
    // Set loading message and show global loading
    setLoadingMessage("Preparing verification email...");
    setIsLoadingAuth(true);
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      });
      
      if (error) throw error;
      
      toast.success("Verification email resent!");
      setCanResend(false);
      setCountdown(60);
      setResendError(null);
    } catch (error: any) {
      const msg = error.message?.includes("For security purposes") 
        ? "Too many requests." 
        : error.message || "Unknown error.";
        
      setResendError(msg);
      toast.error("Resend Failed", { description: msg });
    } finally {
      setIsResending(false);
      setIsLoadingAuth(false); // Hide loading regardless of outcome
    }
  };

  return (
    <div className="p-6 text-center space-y-4">
      {/* Close button for CheckEmailView */}
      <Button variant="ghost" size="icon" onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white hover:bg-gray-700/50">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </Button>
      <MailCheck className="mx-auto h-12 w-12 text-green-500" />
      <h3 className="text-xl font-semibold text-white">Check Your Email</h3>
      <p className="text-gray-400">Verification link sent to <strong className="text-white">{email}</strong>.</p>
      <p className="text-gray-400">Click the link to activate account, then log in.</p>
      {resendError && (
        <p className="text-red-500 text-sm flex items-center justify-center"><AlertCircle className="h-4 w-4 mr-1 shrink-0" />{resendError}</p>
      )}
      <Button onClick={onClose} className="w-full mt-4 bg-[#5865f2] hover:bg-[#4752c4]" disabled={isResending}>OK</Button>
      <Button 
        onClick={handleResendEmail} 
        variant="outline" 
        className="w-full mt-2 border-[#5865f2] text-[#5865f2] hover:bg-[#5865f2]/10 disabled:opacity-50 hover:text-white" 
        disabled={!canResend || isResending}
      >
        {isResending ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
        ) : canResend ? (
          "Resend Verification Email"
        ) : (
          `Resend in ${countdown}s`
        )}
      </Button>
      <p className="text-xs text-gray-500 mt-1">Check spam or wait for the timer.</p>
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { sendPasswordReset } = useAuth();
  const { setIsLoadingAuth, setLoadingMessage } = useLoading();
  const [showVerifyEmailView, setShowVerifyEmailView] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  // Callback from LoginForm when registration is successful
  const handleRegisterSuccess = (registeredEmailValue: string) => {
    setRegisteredEmail(registeredEmailValue);
    setShowVerifyEmailView(true);
  };

  // Reset internal states when the modal is closed from outside
  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        setShowVerifyEmailView(false);
        setRegisteredEmail("");
        setActiveTab("login");
        setResetSent(false);
        setEmail("");
        setError("");
        setIsLoading(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Reset state when tabs change
  const handleTabChange = (tab: "login" | "register" | "forgot-password") => {
    setActiveTab(tab);
    setShowVerifyEmailView(false);
    setError("");
    setIsLoading(false);
    setResetSent(false);
  };

  // --- Password Reset Handlers ---
  const handleResetPasswordRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    // Set loading message and show global loading
    setLoadingMessage("Preparing password reset...");
    setIsLoadingAuth(true);
    
    if (!email?.includes('@')) {
      setError("Invalid email.");
      toast.error("Invalid Email");
      setIsLoading(false);
      setIsLoadingAuth(false);
      return;
    }
    
    try {
      const { error: resetError } = await sendPasswordReset(email);
      
      if (resetError) {
        let errMsg = resetError.message || "Failed.";
        
        if (resetError.message?.includes("security"))
          errMsg = "Too many requests.";
          
        setError(errMsg);
        toast.error("Reset Failed", { description: errMsg });
      } else {
        setResetSent(true);
        setError("");
        toast.success("Password reset email sent!");
      }
    } catch (err: any) {
      setError(err.message || "Unexpected error.");
      toast.error("Error");
    } finally {
      setIsLoading(false);
      setIsLoadingAuth(false);
    }
  };

  // Render Forgot Password Content
  const renderForgotPasswordContent = () => (
    <div className="space-y-4">
      {resetSent ? (
        <div className="text-center space-y-4">
          <MailCheck className="mx-auto h-12 w-12 text-green-500" />
          <p className="text-white font-semibold">Reset email sent!</p>
          <p className="text-gray-400 text-sm">Check your inbox/spam.</p>
          <Button className="w-full bg-[#5865f2] hover:bg-[#4752c4]" onClick={() => handleTabChange("login")}>
            Back to Login
          </Button>
        </div>
      ) : (
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
              disabled={isLoading} 
            />
          </div>
          
          {error && (
            <p className="text-red-500 text-sm flex items-center"><AlertCircle className="h-4 w-4 mr-1" />{error}</p>
          )}
          
          <Button type="submit" className="w-full bg-[#5865f2] hover:bg-[#4752c4]" disabled={isLoading}>
            {isLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
            ) : (
              <> <KeyRound className="mr-2 h-4 w-4" /> Send Reset Link</>
            )}
          </Button>
          
          <div className="text-center text-sm text-gray-400">
            Remember password?{" "}
            <button 
              type="button" 
              className="text-[#5865f2] hover:text-[#4752c4]" 
              onClick={() => handleTabChange("login")} 
              disabled={isLoading}
            >
              Back to Login
            </button>
          </div>
        </form>
      )}
    </div>
  );

  // Title/Description Logic
  const getTitle = (): string => {
    if (showVerifyEmailView) return "Verify Your Email";
    switch (activeTab) {
      case "login": return "Login";
      case "register": return "Register";
      case "forgot-password": return "Reset Password";
      default: return "Welcome";
    }
  };

  const getDescription = (): string => {
    if (showVerifyEmailView) return "Click the link sent to activate your account.";
    switch (activeTab) {
      case "login": return "Access your account";
      case "register": return "Create a new account";
      case "forgot-password": return "Enter email for reset link";
      default: return "";
    }
  };

  // Main Content Switch
  const mainContent = showVerifyEmailView ? (
    <CheckEmailView email={registeredEmail} onClose={() => onOpenChange(false)} />
  ) : activeTab === "forgot-password" ? (
    renderForgotPasswordContent()
  ) : (
    <LoginForm 
      onSuccess={onLoginSuccess} 
      onRegisterSuccess={handleRegisterSuccess} 
      initialTab={activeTab as "login" | "register"} 
      onTabChange={handleTabChange} 
      onForgotPassword={() => handleTabChange("forgot-password")} 
    />
  );

  // Render Modal or Drawer
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} repositionInputs={false}>
        <DrawerContent className="bg-[#1a1c23] border-t border-[#2a2d36] text-white max-h-[90vh] flex flex-col">
          <DrawerHeader className="px-4 text-center pt-4">
            <DrawerTitle className="text-white">{getTitle()}</DrawerTitle>
            <DrawerDescription className="text-gray-400">{getDescription()}</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto flex-1 min-h-0" style={{ overscrollBehavior: 'contain' }}>
            {mainContent}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#1a1c23] border-[#2a2d36] text-white overflow-y-scroll max-h-screen">
        <DialogHeader className="text-center">
          <DialogTitle className="text-white">{getTitle()}</DialogTitle>
          <DialogDescription className="text-gray-400">{getDescription()}</DialogDescription>
        </DialogHeader>
        {mainContent}
      </DialogContent>
    </Dialog>
  );
}
