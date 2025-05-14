
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { useLoading } from "@/components/global/Loading/LoadingContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, LogIn, UserPlus, AlertCircle, Loader2, Send } from "lucide-react";

interface LoginFormProps {
  onSuccess: () => void;
  onRegisterSuccess: (email: string) => void;
  initialTab?: "login" | "register";
  onTabChange: (tab: "login" | "register") => void;
  onForgotPassword: () => void;
}

export default function LoginForm(props: LoginFormProps) {
  const { onSuccess, onRegisterSuccess, initialTab = "login", onTabChange, onForgotPassword } = props;
  const { signIn: login, signUp: register } = useAuth();
  const { setIsLoadingAuth, setLoadingMessage } = useLoading();
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showResendEmailButton, setShowResendEmailButton] = useState(false);

  // Form State
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: ""
  });
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleTabChangeInternal = (value: string) => {
    const tab = value as "login" | "register";
    setActiveTab(tab);
    setError("");
    setShowResendEmailButton(false);
    onTabChange(tab);
  };

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginForm((prev) => ({ ...prev, [name]: value }));
    if (error || showResendEmailButton) {
      setError("");
      setShowResendEmailButton(false);
    }
  };

  const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRegisterForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setShowResendEmailButton(false);
    
    if (!loginForm.email || !loginForm.password) {
      setError("Please fill all fields");
      return;
    }

    setIsLoading(true);
    setIsLoadingAuth(true);
    setLoadingMessage("Verifying your credentials...");

    try {
      const result = await login(loginForm.email, loginForm.password);
      
      if (result.error) {
        let msg = result.error.message || "Login failed";
        
        if (result.error.message?.includes("Invalid login")) {
          msg = "Invalid email or password";
        }
        else if (result.error.message?.includes("Email not confirmed")) {
          msg = "Email not confirmed";
          setShowResendEmailButton(true);
        }
        else if (result.error.status === 422) {
          msg = "Invalid data provided";
        }
        else if (result.error.message?.toLowerCase().includes("security")) {
          msg = "Too many requests. Please try again later";
        }
        
        setError(msg);
        toast.error("Login Failed", { description: msg });
      } else {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || "Unexpected error");
      toast.error("Login Error");
    } finally {
      setIsLoading(false);
      setIsLoadingAuth(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    
    if (!registerForm.name || !registerForm.email || !registerForm.password || !registerForm.confirmPassword) {
      setError("Please fill all fields");
      return;
    }
    
    if (registerForm.password !== registerForm.confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setIsLoading(true);
    setIsLoadingAuth(true);
    setLoadingMessage("Creating your account...");

    try {
      const result = await register(
        registerForm.name,
        registerForm.email,
        registerForm.password
      );
      
      if (result.error) {
        let msg = result.error.message || "Registration failed";
        
        if (result.error.message?.includes("already registered")) {
          msg = "An account with this email already exists";
        }
        else if (result.error.status === 422) {
          msg = "Invalid data provided";
        }
        else if (result.error.message?.toLowerCase().includes("security")) {
          msg = "Too many requests. Please try again later";
        }
        
        setError(msg);
        toast.error("Registration Failed", { description: msg });
      } else {
        toast.success("Registration Successful", { 
          description: "Please check your email to confirm your account", 
          duration: 7000 
        });
        onRegisterSuccess(registerForm.email);
      }
    } catch (err: any) {
      setError(err.message || "Unexpected error");
      toast.error("Registration Error");
    } finally {
      setIsLoading(false);
      setIsLoadingAuth(false);
    }
  };

  const handleResendVerificationEmail = async () => {
    if (!loginForm.email) {
      toast.error("Please enter your email address");
      return;
    }

    setIsResending(true);
    setIsLoadingAuth(true);
    setLoadingMessage("Resending verification email...");

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: loginForm.email
      });

      if (error) {
        let msg = error.message || "Failed to resend verification email";
        
        if (error.message?.toLowerCase().includes("security")) {
          msg = "Too many requests. Please try again later";
        }
        
        setError(msg);
        toast.error("Resend Failed", { description: msg });
      } else {
        toast.success("Verification Email Resent", { 
          description: `Check your inbox: ${loginForm.email}`, 
          duration: 7000 
        });
      }
    } catch (err: any) {
      setError(err.message || "Unexpected error");
      toast.error("Resend Error");
    } finally {
      setIsResending(false);
      setIsLoadingAuth(false);
    }
  };

  return (
    <>
      <Tabs value={activeTab} onValueChange={handleTabChangeInternal} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="login" disabled={isLoading || isResending}>Login</TabsTrigger>
          <TabsTrigger value="register" disabled={isLoading || isResending}>Register</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input id="login-email" name="email" type="email" value={loginForm.email} onChange={handleLoginChange} required className="bg-[#0f1115] border-[#2a2d36]" disabled={isLoading || isResending} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <div className="relative">
                <Input id="login-password" name="password" type={showPassword ? "text" : "password"} value={loginForm.password} onChange={handleLoginChange} required className="bg-[#0f1115] border-[#2a2d36]" disabled={isLoading || isResending} />
                <button type="button" aria-label={showPassword?"Hide":"Show"} className="absolute right-3 top-1/2 -translate-y-1/2" onClick={()=>setShowPassword(!showPassword)} disabled={isLoading||isResending}>
                  {showPassword?<EyeOff className="h-4 w-4"/>:<Eye className="h-4 w-4"/>}
                </button>
              </div>
            </div>
            {error && <p className="text-red-500 text-sm flex items-center"><AlertCircle className="h-4 w-4 mr-1"/>{error}</p>}
            {showResendEmailButton && (
              <Button type="button" variant="link" className="text-sm text-[#5865f2] p-0 h-auto" onClick={handleResendVerificationEmail} disabled={isLoading||isResending}>
                {isResending?(<><Loader2 className="mr-1 h-3 w-3 animate-spin"/>Sending...</>):(<><Send className="mr-1 h-3 w-3"/>Resend verification</>)}
              </Button>
            )}
            <div className="flex justify-end">
              <button type="button" onClick={onForgotPassword} className="text-sm text-[#5865f2]" disabled={isLoading||isResending}>
                Forgot password?
              </button>
            </div>
            <Button type="submit" className="w-full bg-[#5865f2]" disabled={isLoading||isResending}>
              {isLoading?(<><Loader2 className="animate-spin mr-2 h-4 w-4"/>Logging In...</>):(<><LogIn className="mr-2 h-4 w-4"/>Login</>)}
            </Button>
            <div className="text-center text-sm">
              Don't have account?{" "}
              <button type="button" className="text-[#5865f2]" onClick={()=>handleTabChangeInternal("register")} disabled={isLoading||isResending}>
                Sign up
              </button>
            </div>
          </form>
        </TabsContent>
        <TabsContent value="register">
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="register-name">Full Name</Label>
              <Input id="register-name" name="name" value={registerForm.name} onChange={handleRegisterChange} required className="bg-[#0f1115] border-[#2a2d36]" disabled={isLoading||isResending} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-email">Email</Label>
              <Input id="register-email" name="email" type="email" value={registerForm.email} onChange={handleRegisterChange} required className="bg-[#0f1115] border-[#2a2d36]" disabled={isLoading||isResending} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-password">Password</Label>
              <div className="relative">
                <Input id="register-password" name="password" type={showPassword?"text":"password"} placeholder="min. 6 chars" value={registerForm.password} onChange={handleRegisterChange} required className="bg-[#0f1115] border-[#2a2d36]" disabled={isLoading||isResending} minLength={6}/>
                <button type="button" aria-label={showPassword?"Hide":"Show"} className="absolute right-3 top-1/2 -translate-y-1/2" onClick={()=>setShowPassword(!showPassword)} disabled={isLoading||isResending}>
                  {showPassword?<EyeOff className="h-4 w-4"/>:<Eye className="h-4 w-4"/>}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-confirm-password">Confirm Password</Label>
              <Input id="register-confirm-password" name="confirmPassword" type="password" value={registerForm.confirmPassword} onChange={handleRegisterChange} required className="bg-[#0f1115] border-[#2a2d36]" disabled={isLoading||isResending} />
            </div>
            {error && <p className="text-red-500 text-sm flex items-center"><AlertCircle className="h-4 w-4 mr-1"/>{error}</p>}
            <Button type="submit" className="w-full bg-[#5865f2]" disabled={isLoading||isResending}>
              {isLoading?(<><Loader2 className="animate-spin mr-2 h-4 w-4"/>Registering...</>):(<><UserPlus className="mr-2 h-4 w-4"/>Register</>)}
            </Button>
            <div className="text-center text-sm">
              Already have account?{" "}
              <button type="button" className="text-[#5865f2]" onClick={()=>handleTabChangeInternal("login")} disabled={isLoading||isResending}>
                Log in
              </button>
            </div>
          </form>
        </TabsContent>
      </Tabs>
    </>
  );
}
