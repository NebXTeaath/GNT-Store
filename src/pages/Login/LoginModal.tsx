// src/pages/Login/LoginModal.tsx
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import LoginForm from "@/pages/Login/login";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/components/global/Mobile/use-mobile";
import { account } from "@/lib/appwrite";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLoading } from "@/context/LoadingContext"; // Import useLoading hook

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoginSuccess?: () => void;
}

export default function LoginModal({ open, onOpenChange, onLoginSuccess }: LoginModalProps) {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<"login" | "register" | "forgot-password">("login");
  const [email, setEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { setIsLoadingProfile, setLoadingMessage } = useLoading(); // Use the loading context

  const handleLoginSuccess = () => {
    // First set loading state with context
    setLoadingMessage("Logging in..."); 
    setIsLoadingProfile(true);
    
    // Then close the modal immediately
    onOpenChange(false);
    
    // Then handle the remaining operations with a delay
    setTimeout(() => {
      toast.success("Login successful!");
      if (onLoginSuccess) onLoginSuccess();
      window.location.reload(); // Trigger page reload after loading screen
    }, 500);
  };

  const handleTabChange = (tab: "login" | "register" | "forgot-password") => {
    setActiveTab(tab);
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Use AppWrite's password recovery
      const promise = await account.createRecovery(
        email,
        `${window.location.origin}/reset-password` // Redirect URL for recovery
      );

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
    switch (activeTab) {
      case "login": return "Login to your account";
      case "register": return "Create an account";
      case "forgot-password": return "Reset your password";
      default: return "Login to your account";
    }
  };

  const getDescription = () => {
    switch (activeTab) {
      case "login": return "Enter your credentials to access your account";
      case "register": return "Fill in your details to create a new account";
      case "forgot-password": return "We'll send you a link to reset your password";
      default: return "Enter your credentials to access your account";
    }
  };

  // If the device is mobile, render a Drawer instead of a Dialog
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
            {activeTab === "forgot-password" ? (
              renderForgotPasswordContent()
            ) : (
              <LoginForm
                onSuccess={handleLoginSuccess}
                initialTab={activeTab}
                onTabChange={handleTabChange}
                onForgotPassword={() => handleTabChange("forgot-password")}
              />
            )}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // For desktop devices, continue using the Dialog component
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#1a1c23] border-[#2a2d36] text-white">
        <DialogHeader>
          <DialogTitle className="text-white">{getTitle()}</DialogTitle>
          <DialogDescription className="text-gray-400">
            {getDescription()}
          </DialogDescription>
        </DialogHeader>
        {activeTab === "forgot-password" ? (
          renderForgotPasswordContent()
        ) : (
          <LoginForm
            onSuccess={handleLoginSuccess}
            initialTab={activeTab}
            onTabChange={handleTabChange}
            onForgotPassword={() => handleTabChange("forgot-password")}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}