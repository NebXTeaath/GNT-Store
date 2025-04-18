// src/pages/Login/login.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, LogIn, UserPlus } from "lucide-react"; // Removed MailCheck - not needed here

interface LoginFormProps {
  onSuccess?: () => void; // Keep for login success
  onRegisterSuccess?: (email: string) => void; // <-- ADDED PROP for registration success
  initialTab?: "login" | "register";
  onTabChange?: (tab: "login" | "register" | "forgot-password") => void;
  onForgotPassword?: () => void;
}

export default function LoginForm({
  onSuccess,
  onRegisterSuccess, // <-- Destructure the new prop
  initialTab = "login",
  onTabChange,
  onForgotPassword
}: LoginFormProps) {
  const { signIn: login, signUp: register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(initialTab);

  // State for login form fields
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  // State for registration form fields
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // Update the tab if initialTab changes (controlled from parent component)
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Handle tab change
  const handleTabChange = (value: string) => {
    const tab = value as "login" | "register";
    setActiveTab(tab);
    setError(""); // Clear errors on tab switch
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  // Update login form state on input change
  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginForm((prev) => ({ ...prev, [name]: value }));
  };

  // Update registration form state on input change
  const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRegisterForm((prev) => ({ ...prev, [name]: value }));
  };

  // Handle login form submission
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await login(loginForm.email, loginForm.password); // Use await

       // Check if the login itself had an error reported by the context function
      if (result.error) {
        setError(result.error.message || "Login failed. Please check credentials.");
        toast.error("Login failed", { description: result.error.message });
      } else {
        // Only call onSuccess if there was no error from the context
        if (onSuccess) {
          onSuccess(); // Called on successful login
        }
        // Success toast is likely handled within useAuth, no need to repeat here unless specific context needed
      }
    } catch (err: any) { // Catch unexpected errors during the call itself
      console.error("Unexpected Login error in component:", err);
      const message = err.message || "An unexpected error occurred during login.";
      setError(message);
      toast.error("Login Error", { description: message });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle registration form submission
  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (registerForm.password !== registerForm.confirmPassword) {
      setError("Passwords do not match");
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Call the register function from useAuth
      const result = await register(registerForm.name, registerForm.email, registerForm.password);

       // Check if the signup call itself reported an error (e.g., email already exists)
       if (result.error) {
         let errorMessage = result.error.message || "Failed to create account.";
         // Customize message for common errors if needed
         if (result.error.message.includes("User already registered")) {
             errorMessage = "An account with this email already exists. Try logging in.";
         }
         setError(errorMessage);
         toast.error("Registration Failed", { description: errorMessage });
       } else {
          // NEW: Call onRegisterSuccess instead of onSuccess for registration
          if (onRegisterSuccess) {
            onRegisterSuccess(registerForm.email); // Pass the registered email
          }
          // Reset form state is now handled by the modal on close/success display
           // setRegisterForm({ name: "", email: "", password: "", confirmPassword: "" });
          // REMOVED: The generic onSuccess() call and page reload are handled by LoginModal now
       }

    } catch (err: any) { // Catch unexpected errors during the call
      console.error("Unexpected Registration error in component:", err);
      const message = err.message || "An unexpected error occurred during registration.";
      setError(message);
      toast.error("Registration Error", { description: message });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle forgot password link click
  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    setError(""); // Clear errors when switching to forgot password
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

      {/* Login Tab Content */}
      <TabsContent value="login">
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login-email" className="text-white">Email</Label>
            {isLoading ? (
              <Skeleton className="h-10 w-full bg-[#2a2d36]" />
            ) : (
              <Input
                id="login-email"
                name="email"
                type="email"
                placeholder="your.email@example.com"
                value={loginForm.email}
                onChange={handleLoginChange}
                required
                className="bg-[#0f1115] border-[#2a2d36] text-white"
              />
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-password" className="text-white">Password</Label>
            {isLoading ? (
              <Skeleton className="h-10 w-full bg-[#2a2d36]" />
            ) : (
              <div className="relative">
                <Input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={loginForm.password}
                  onChange={handleLoginChange}
                  required
                  className="bg-[#0f1115] border-[#2a2d36] text-white"
                />
                {/* Toggle password visibility */}
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            )}
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-sm text-[#5865f2] hover:text-[#4752c4]"
            >
              Forgot password?
            </button>
          </div>
          <Button
            type="submit"
            className="w-full bg-[#5865f2] hover:bg-[#4752c4]"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Logging in...
              </span>
            ) : (
              <span className="flex items-center justify-center">
                <LogIn className="mr-2 h-4 w-4" /> Login
              </span>
            )}
          </Button>
          <div className="text-center text-sm text-gray-400">
            Don't have an account?{" "}
            <button
              type="button"
              className="text-[#5865f2] hover:text-[#4752c4]"
              onClick={() => handleTabChange("register")}
            >
              Sign up
            </button>
          </div>
        </form>
      </TabsContent>

      {/* Registration Tab Content */}
      <TabsContent value="register">
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="register-name" className="text-white">Full Name</Label>
            {isLoading ? (
              <Skeleton className="h-10 w-full bg-[#2a2d36]" />
            ) : (
              <Input
                id="register-name"
                name="name"
                placeholder="John Doe"
                value={registerForm.name}
                onChange={handleRegisterChange}
                required
                className="bg-[#0f1115] border-[#2a2d36] text-white"
              />
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="register-email" className="text-white">Email</Label>
            {isLoading ? (
              <Skeleton className="h-10 w-full bg-[#2a2d36]" />
            ) : (
              <Input
                id="register-email"
                name="email"
                type="email"
                placeholder="your.email@example.com"
                value={registerForm.email}
                onChange={handleRegisterChange}
                required
                className="bg-[#0f1115] border-[#2a2d36] text-white"
              />
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="register-password" className="text-white">Password</Label>
            {isLoading ? (
              <Skeleton className="h-10 w-full bg-[#2a2d36]" />
            ) : (
              <div className="relative">
                <Input
                  id="register-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={registerForm.password}
                  onChange={handleRegisterChange}
                  required
                  className="bg-[#0f1115] border-[#2a2d36] text-white"
                />
                {/* Toggle password visibility */}
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="register-confirm-password" className="text-white">
              Confirm Password
            </Label>
            {isLoading ? (
              <Skeleton className="h-10 w-full bg-[#2a2d36]" />
            ) : (
              <Input
                id="register-confirm-password"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={registerForm.confirmPassword}
                onChange={handleRegisterChange}
                required
                className="bg-[#0f1115] border-[#2a2d36] text-white"
              />
            )}
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button
            type="submit"
            className="w-full bg-[#5865f2] hover:bg-[#4752c4]"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Creating account...
              </span>
            ) : (
              <span className="flex items-center justify-center">
                <UserPlus className="mr-2 h-4 w-4" /> Register
              </span>
            )}
          </Button>
          <div className="text-center text-sm text-gray-400">
            Already have an account?{" "}
            <button
              type="button"
              className="text-[#5865f2] hover:text-[#4752c4]"
              onClick={() => handleTabChange("login")}
            >
              Log in
            </button>
          </div>
        </form>
      </TabsContent>
    </Tabs>
  );
}