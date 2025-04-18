// src/pages/Login/login.tsx
import { useState, useEffect, useRef, useCallback } from "react"; // Import useRef and useCallback
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, LogIn, UserPlus, AlertCircle } from "lucide-react";
import HCaptcha from "@hcaptcha/react-hcaptcha"; // **** IMPORT HCAPTCHA ****

interface LoginFormProps {
  onSuccess?: () => void;
  onRegisterSuccess?: (email: string) => void;
  initialTab?: "login" | "register";
  onTabChange?: (tab: "login" | "register" | "forgot-password") => void;
  onForgotPassword?: () => void;
}

export default function LoginForm({
  onSuccess,
  onRegisterSuccess,
  initialTab = "login",
  onTabChange,
  onForgotPassword
}: LoginFormProps) {
  const { signIn: login, signUp: register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(initialTab);

  // **** HCAPTCHA State and Ref ****
  const captchaRef = useRef<HCaptcha>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const hCaptchaSiteKey = import.meta.env.VITE_HCAPTCHA_SITEKEY;
  // **** END HCAPTCHA ****

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleTabChange = (value: string) => {
    const tab = value as "login" | "register";
    setActiveTab(tab);
    setError("");
    setCaptchaToken(null); // Reset captcha token on tab change
    captchaRef.current?.resetCaptcha(); // Reset the visual captcha widget
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRegisterForm((prev) => ({ ...prev, [name]: value }));
  };

  // Login Handler (Unchanged)
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const result = await login(loginForm.email, loginForm.password);
      if (result.error) {
        setError(result.error.message || "Login failed. Please check credentials.");
        toast.error("Login failed", { description: result.error.message });
      } else {
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err: any) {
      console.error("Unexpected Login error in component:", err);
      const message = err.message || "An unexpected error occurred during login.";
      setError(message);
      toast.error("Login Error", { description: message });
    } finally {
      setIsLoading(false);
    }
  };

  // **** MODIFIED Registration Handler ****
  const handleRegister = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault(); // Prevent default form submission if event exists

    if (registerForm.password !== registerForm.confirmPassword) {
      setError("Passwords do not match");
      toast.error("Passwords do not match");
      return;
    }
    if (!hCaptchaSiteKey) {
        setError("Captcha configuration error. Please contact support.");
        toast.error("Configuration Error", {description: "Captcha site key is missing."});
        return;
    }

    setIsLoading(true);
    setError("");
    setCaptchaToken(null); // Reset token before execution

    // Execute the hCaptcha challenge
    captchaRef.current?.execute();
    // The actual registration logic will now run inside onVerifyCaptcha
  };

  // **** NEW: Captcha Verification Handler ****
  const onVerifyCaptcha = async (token: string) => {
    console.log("hCaptcha verified, token:", token);
    setCaptchaToken(token); // Store the token

    // Now proceed with registration using the obtained token
    try {
        // Pass the token to the register function in AuthContext
      const result = await register(registerForm.name, registerForm.email, registerForm.password, token);

      if (result.error) {
        let errorMessage = result.error.message || "Failed to create account.";
        if (result.error.message.includes("User already registered")) {
          errorMessage = "An account with this email already exists. Try logging in.";
        } else if (result.error.message.toLowerCase().includes("captcha verification failed")) {
            errorMessage = "Captcha verification failed. Please try again.";
        }
        setError(errorMessage);
        toast.error("Registration Failed", { description: errorMessage });
      } else {
        if (onRegisterSuccess) {
          onRegisterSuccess(registerForm.email);
        }
        // Reset form is handled by the modal logic now
      }
    } catch (err: any) {
      console.error("Unexpected Registration error in component:", err);
      const message = err.message || "An unexpected error occurred during registration.";
      setError(message);
      toast.error("Registration Error", { description: message });
    } finally {
      setIsLoading(false);
      setCaptchaToken(null); // Clear token after use
      captchaRef.current?.resetCaptcha(); // Reset hCaptcha widget
    }
  };

  // **** NEW: Captcha Error Handler ****
  const onErrorCaptcha = (err: string) => {
    console.error("hCaptcha Error:", err);
    setError("Captcha challenge failed. Please try again.");
    toast.error("Captcha Error", { description: "Could not verify captcha. Please try again." });
    setIsLoading(false); // Stop loading on captcha error
    setCaptchaToken(null);
  };

  // **** NEW: Captcha Expired Handler ****
   const onExpireCaptcha = () => {
     console.warn("hCaptcha token expired.");
     setError("Captcha challenge expired. Please try again.");
     toast("Captcha Expired", { description: "Please complete the captcha challenge again." });
     setCaptchaToken(null);
     // Don't stop loading here automatically, user might retry
   };
  // **** END HCAPTCHA ****

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    setError("");
    if (onForgotPassword) {
      onForgotPassword();
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger id="login-tab" value="login">
          Login
        </TabsTrigger>
        <TabsTrigger value="register">
          Register
        </TabsTrigger>
      </TabsList>

      {/* Login Tab Content (Unchanged) */}
      <TabsContent value="login">
        <form onSubmit={handleLogin} className="space-y-4">
           {/* Email */}
           <div className="space-y-2">
              <Label htmlFor="login-email" className="text-white">Email</Label>
              {isLoading && activeTab === 'login' ? ( <Skeleton className="h-10 w-full bg-[#2a2d36]" /> ) : (
                <Input id="login-email" name="email" type="email" placeholder="your.email@example.com" value={loginForm.email} onChange={handleLoginChange} required className="bg-[#0f1115] border-[#2a2d36] text-white" disabled={isLoading && activeTab === 'login'} />
              )}
           </div>
           {/* Password */}
           <div className="space-y-2">
              <Label htmlFor="login-password" className="text-white">Password</Label>
              {isLoading && activeTab === 'login' ? ( <Skeleton className="h-10 w-full bg-[#2a2d36]" /> ) : (
                <div className="relative">
                  <Input id="login-password" name="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={loginForm.password} onChange={handleLoginChange} required className="bg-[#0f1115] border-[#2a2d36] text-white" disabled={isLoading && activeTab === 'login'} />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" onClick={() => setShowPassword(!showPassword)} disabled={isLoading && activeTab === 'login'}>
                    {showPassword ? (<EyeOff className="h-4 w-4" />) : (<Eye className="h-4 w-4" />)}
                  </button>
                </div>
              )}
           </div>
           {error && activeTab === 'login' && <p className="text-red-500 text-sm flex items-center"><AlertCircle className="h-4 w-4 mr-1" />{error}</p>}
           <div className="flex justify-end">
             <button type="button" onClick={handleForgotPassword} className="text-sm text-[#5865f2] hover:text-[#4752c4]" disabled={isLoading}> Forgot password? </button>
           </div>
           <Button type="submit" className="w-full bg-[#5865f2] hover:bg-[#4752c4]" disabled={isLoading && activeTab === 'login'}>
              {isLoading && activeTab === 'login' ? ( <span className="flex items-center justify-center"> <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg> Logging in... </span> ) : ( <span className="flex items-center justify-center"> <LogIn className="mr-2 h-4 w-4" /> Login </span> )}
           </Button>
           <div className="text-center text-sm text-gray-400"> Don't have an account?{" "} <button type="button" className="text-[#5865f2] hover:text-[#4752c4]" onClick={() => handleTabChange("register")} disabled={isLoading}> Sign up </button> </div>
        </form>
      </TabsContent>

      {/* Registration Tab Content **** MODIFIED **** */}
      <TabsContent value="register">
        <form onSubmit={handleRegister} className="space-y-4">
           {/* Name */}
           <div className="space-y-2">
              <Label htmlFor="register-name" className="text-white">Full Name</Label>
              {isLoading && activeTab === 'register' ? ( <Skeleton className="h-10 w-full bg-[#2a2d36]" /> ) : (
                <Input id="register-name" name="name" placeholder="John Doe" value={registerForm.name} onChange={handleRegisterChange} required className="bg-[#0f1115] border-[#2a2d36] text-white" disabled={isLoading && activeTab === 'register'} />
              )}
           </div>
           {/* Email */}
           <div className="space-y-2">
              <Label htmlFor="register-email" className="text-white">Email</Label>
              {isLoading && activeTab === 'register' ? ( <Skeleton className="h-10 w-full bg-[#2a2d36]" /> ) : (
                <Input id="register-email" name="email" type="email" placeholder="your.email@example.com" value={registerForm.email} onChange={handleRegisterChange} required className="bg-[#0f1115] border-[#2a2d36] text-white" disabled={isLoading && activeTab === 'register'} />
              )}
           </div>
           {/* Password */}
           <div className="space-y-2">
              <Label htmlFor="register-password" className="text-white">Password</Label>
              {isLoading && activeTab === 'register' ? ( <Skeleton className="h-10 w-full bg-[#2a2d36]" /> ) : (
                <div className="relative">
                  <Input id="register-password" name="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={registerForm.password} onChange={handleRegisterChange} required className="bg-[#0f1115] border-[#2a2d36] text-white" disabled={isLoading && activeTab === 'register'} />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" onClick={() => setShowPassword(!showPassword)} disabled={isLoading && activeTab === 'register'}>
                     {showPassword ? (<EyeOff className="h-4 w-4" />) : (<Eye className="h-4 w-4" />)}
                  </button>
                </div>
              )}
           </div>
           {/* Confirm Password */}
           <div className="space-y-2">
              <Label htmlFor="register-confirm-password" className="text-white"> Confirm Password </Label>
              {isLoading && activeTab === 'register' ? ( <Skeleton className="h-10 w-full bg-[#2a2d36]" /> ) : (
                <Input id="register-confirm-password" name="confirmPassword" type="password" placeholder="••••••••" value={registerForm.confirmPassword} onChange={handleRegisterChange} required className="bg-[#0f1115] border-[#2a2d36] text-white" disabled={isLoading && activeTab === 'register'} />
              )}
           </div>

           {/* **** RENDER HCAPTCHA **** */}
           {hCaptchaSiteKey && (
             <div className="flex justify-center py-2"> {/* Center the captcha */}
               <HCaptcha
                  sitekey={hCaptchaSiteKey}
                  onVerify={onVerifyCaptcha}
                  onError={onErrorCaptcha}
                  onExpire={onExpireCaptcha}
                  ref={captchaRef}
                  size="invisible" // Make it invisible, trigger programmatically
               />
             </div>
           )}
           {/* **** END HCAPTCHA RENDER **** */}

           {error && activeTab === 'register' && <p className="text-red-500 text-sm flex items-center"><AlertCircle className="h-4 w-4 mr-1" />{error}</p>}

           <Button type="submit" className="w-full bg-[#5865f2] hover:bg-[#4752c4]" disabled={isLoading && activeTab === 'register'}>
              {isLoading && activeTab === 'register' ? ( <span className="flex items-center justify-center"> <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg> Creating account... </span> ) : ( <span className="flex items-center justify-center"> <UserPlus className="mr-2 h-4 w-4" /> Register </span> )}
           </Button>
           <div className="text-center text-sm text-gray-400"> Already have an account?{" "} <button type="button" className="text-[#5865f2] hover:text-[#4752c4]" onClick={() => handleTabChange("login")} disabled={isLoading}> Log in </button> </div>
        </form>
      </TabsContent>
    </Tabs>
  );
}