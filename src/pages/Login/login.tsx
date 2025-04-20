// src/pages/Login/login.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, LogIn, UserPlus, AlertCircle, Loader2, Send } from "lucide-react";
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';

interface LoginFormProps {
    onSuccess?: () => void;
    onRegisterSuccess?: (email: string) => void;
    initialTab?: "login" | "register";
    onTabChange?: (tab: "login" | "register" | "forgot-password") => void;
    onForgotPassword?: () => void;
}

type CapturedSubmitData = {
    email: string;
    password?: string;
    name?: string;
} | null;

type ActionType = 'login' | 'register' | 'resend';

export default function LoginForm(props: LoginFormProps) {
    const {
        onSuccess,
        onRegisterSuccess,
        initialTab = "login",
        onTabChange,
        onForgotPassword
    } = props;

    const { signIn: login, signUp: register } = useAuth();
    const [isLoading, setIsLoading] = useState(false); // For login/register
    const [isResending, setIsResending] = useState(false); // For resend button
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [activeTab, setActiveTab] = useState(initialTab);
    const [showResendEmailButton, setShowResendEmailButton] = useState(false);

    const captchaRef = useRef<TurnstileInstance>(null);
    const [captchaKey, setCaptchaKey] = useState<string>(() => `init-${Math.random().toString(36).substring(2, 15)}`);
    const TurnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITEKEY;

    const actionRef = useRef<ActionType | null>(null);
    const capturedSubmitDataRef = useRef<CapturedSubmitData>(null);
    const isVerificationAttemptCompleteRef = useRef<boolean>(true);

    const [loginForm, setLoginForm] = useState({ email: "", password: "" });
    const [registerForm, setRegisterForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });

    useEffect(() => { setActiveTab(initialTab); }, [initialTab]);

    const handleTabChange = (value: string) => {
        const tab = value as "login" | "register";
        setActiveTab(tab);
        setError("");
        setShowResendEmailButton(false);
        isVerificationAttemptCompleteRef.current = true;
        console.log(`[${new Date().toISOString()}] Tab changed to ${tab}. Resetting captcha state.`);
        resetCaptchaState();
        if (onTabChange) { onTabChange(tab); }
    };

    const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target; setLoginForm((prev) => ({ ...prev, [name]: value }));
        if (error || showResendEmailButton) { setError(""); setShowResendEmailButton(false); }
    };
    const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target; setRegisterForm((prev) => ({ ...prev, [name]: value }));
    };

    // Centralized Reset Function
    const resetCaptchaState = useCallback((reason: string = "unknown") => { // Added reason for logging
        console.log(`[${new Date().toISOString()}] --- Resetting Captcha State (Reason: ${reason}) ---`);
        actionRef.current = null;
        capturedSubmitDataRef.current = null;
        isVerificationAttemptCompleteRef.current = true; // Ensure it's reset
        setShowResendEmailButton(false);

        try {
            if (captchaRef.current) {
                captchaRef.current.reset();
                console.log(`[${new Date().toISOString()}] Explicit captchaRef.current.reset() called.`);
            } else {
                console.warn(`[${new Date().toISOString()}] captchaRef.current is null, cannot call reset().`);
            }
        } catch (err) {
            console.warn(`[${new Date().toISOString()}] Error calling captchaRef.current.reset():`, err);
        }
        // Force re-render *after* attempting reset
        setCaptchaKey(prev => `k-${Math.random().toString(36).substring(2, 10)}`); // Ensure new key
        console.log(`[${new Date().toISOString()}] --- Captcha State Reset Complete (Key Updated) ---`);
    }, []); // Dependency array is empty


    // Unified submit trigger
    const initiateActionWithCaptcha = async (actionType: ActionType) => {
        if (isLoading || isResending) {
             console.log(`[${new Date().toISOString()}] Action ${actionType} initiated, but already loading (isLoading: ${isLoading}, isResending: ${isResending}). Ignoring.`);
             return;
         }

        console.log(`[${new Date().toISOString()}] Initiating action: ${actionType}`);
        setError("");
        setShowResendEmailButton(false);

        // --- Validate Inputs & Capture Data ---
        let dataToSubmit: CapturedSubmitData = null;
        if (actionType === 'login') {
            if (!loginForm.email || !loginForm.password) { setError("Please fill in all fields."); toast.error("Missing information"); return; }
            dataToSubmit = { email: loginForm.email, password: loginForm.password };
        } else if (actionType === 'register') {
            if (!registerForm.name || !registerForm.email || !registerForm.password || !registerForm.confirmPassword) { setError("Please fill in all fields."); toast.error("Missing information"); return; }
            if (registerForm.password !== registerForm.confirmPassword) { setError("Passwords do not match."); toast.error("Passwords do not match"); return; }
            dataToSubmit = { name: registerForm.name, email: registerForm.email, password: registerForm.password };
        } else { // resend
            if (!loginForm.email) { toast.error("Please enter your email first.", { id: "resend-no-email" }); return; }
            dataToSubmit = { email: loginForm.email };
        }

        // --- Check Captcha Readiness ---
        if (!TurnstileSiteKey) { setError("Captcha configuration error."); toast.error("Configuration Error"); return; }
        if (!captchaRef.current) { setError("Captcha component not ready. Please wait."); toast.error("Captcha Error"); return; }

        // --- Set State Before Execution ---
        actionRef.current = actionType;
        capturedSubmitDataRef.current = dataToSubmit;
        isVerificationAttemptCompleteRef.current = false; // Mark attempt as started
        console.log(`[${new Date().toISOString()}] Captured data for submission:`, dataToSubmit ? {...dataToSubmit, password: dataToSubmit.password ? '***' : undefined} : null);

        // Set SPECIFIC Loading State
        if (actionType === 'resend') {
            setIsResending(true);
        } else {
            setIsLoading(true);
        }

        // --- Execute Captcha ---
        console.log(`[${new Date().toISOString()}] Executing Turnstile for ${actionType}...`);
        try {
            if (captchaRef.current) {
                await captchaRef.current.execute();
                 console.log(`[${new Date().toISOString()}] Turnstile execution requested for ${actionType}. Waiting for callback...`);
            } else {
                 throw new Error("Captcha reference is not available.");
            }
        } catch (err) {
            console.error(`[${new Date().toISOString()}] Error *executing* Turnstile for ${actionType}:`, err);
            setError(`Failed to start captcha challenge for ${actionType}. Please try again.`);
            toast.error("Captcha Error", { description: "Could not start challenge." });
            if (actionType === 'resend') setIsResending(false); else setIsLoading(false);
            resetCaptchaState(`execute_error_${actionType}`); // Pass reason
        }
    };

    // --- Specific Action Handlers ---
    const handleLogin = (e?: React.FormEvent<HTMLFormElement>) => { if (e) e.preventDefault(); initiateActionWithCaptcha('login'); };
    const handleRegister = (e?: React.FormEvent<HTMLFormElement>) => { if (e) e.preventDefault(); initiateActionWithCaptcha('register'); };
    const handleResendVerificationEmail = () => {
        console.log(`[${new Date().toISOString()}] Resend button clicked. Resetting captcha first.`);
        resetCaptchaState('resend_click'); // Pass reason
        // Small delay to allow state update and potential widget reset before executing again
        setTimeout(() => {
            console.log(`[${new Date().toISOString()}] Initiating resend action after reset.`);
            initiateActionWithCaptcha('resend');
        }, 50); // Short delay
    };
    const handleForgotPassword = (e: React.MouseEvent) => { e.preventDefault(); setError(""); setShowResendEmailButton(false); isVerificationAttemptCompleteRef.current = true; if (onForgotPassword) onForgotPassword(); };


    // --- Captcha Verification Callback ---
    const onVerifyCaptcha = async (token: string) => {
        const actionBeingVerified = actionRef.current;
        const capturedData = capturedSubmitDataRef.current;

        console.log(`[${new Date().toISOString()}] ===> onVerifyCaptcha ENTERED. Action: ${actionBeingVerified}, Token Start: ${token.substring(0, 5)}...`);

        if (isVerificationAttemptCompleteRef.current) {
            console.warn(`[${new Date().toISOString()}] onVerifyCaptcha for ${actionBeingVerified} called, but verification attempt was already complete. Ignoring potentially duplicate callback.`);
            return;
        }
         isVerificationAttemptCompleteRef.current = true; // Mark as complete EARLY
         console.log(`[${new Date().toISOString()}] Verification attempt for ${actionBeingVerified} marked as complete.`);

        // Check actionRef and capturedData immediately after marking complete
        if (!actionBeingVerified) {
            console.warn(`[${new Date().toISOString()}] onVerifyCaptcha: No actionRef found after marking complete. Resetting.`);
            resetCaptchaState('no_action_ref');
            setIsLoading(false); setIsResending(false); // Reset both loading states
            return;
        }
        if (!capturedData || !capturedData.email) {
            console.error(`[${new Date().toISOString()}] CRITICAL: Captcha verified for ${actionBeingVerified}, but captured data ref is null or missing email!`);
            setError("An internal error occurred (missing submit data). Please try again.");
            setIsLoading(false); setIsResending(false); // Reset both loading states
            resetCaptchaState('missing_captured_data');
            return;
        }

        const emailForApi = capturedData.email;
        let apiError: any = null;
        let apiSuccess = false;
        let shouldShowResendBtnAgain = false;

        // Wrap the entire API interaction logic in a try/finally to ensure loading state reset
        try {
            console.log(`[${new Date().toISOString()}] Calling Supabase API for ${actionBeingVerified} with token starting ${token.substring(0,5)}...`);
            // --- API Calls ---
            if (actionBeingVerified === 'login') {
                 if (!capturedData.password) throw new Error("Missing password for login.");
                 const result = await login(emailForApi, capturedData.password, token);
                 if (result.error) throw result.error; // Throw error to be caught
                 else apiSuccess = true;
            } else if (actionBeingVerified === 'register') {
                 if (typeof capturedData.name !== 'string' || !capturedData.password) throw new Error("Missing data for registration.");
                 const result = await register(capturedData.name, emailForApi, capturedData.password, token);
                 if (result.error) throw result.error; // Throw error
                 else apiSuccess = true;
            } else if (actionBeingVerified === 'resend') {
                const { error: resendError } = await supabase.auth.resend({ type: 'signup', email: emailForApi, options: { captchaToken: token } });
                if (resendError) throw resendError; // Throw error
                else apiSuccess = true;
            }
            console.log(`[${new Date().toISOString()}] Supabase API call for ${actionBeingVerified} completed successfully.`);

            // --- Handle Success ---
            setError("");
            setShowResendEmailButton(false);
            const successMessage = actionBeingVerified === 'login' ? "Login successful!"
                                 : actionBeingVerified === 'register' ? "Registration successful!"
                                 : "Verification email resent successfully!";
            toast.success(successMessage, {
                description: actionBeingVerified === 'resend' ? `Check your inbox at ${emailForApi}` : undefined,
                duration: actionBeingVerified === 'resend' ? 7000 : undefined,
            });
            if (actionBeingVerified === 'login' && onSuccess) onSuccess();
            if (actionBeingVerified === 'register' && onRegisterSuccess) onRegisterSuccess(emailForApi); // Use emailForApi

        } catch (caughtError: any) {
            // --- Handle ALL Errors (API or Catch block) ---
            apiError = caughtError; // Assign caught error
            console.error(`[${new Date().toISOString()}] ${actionBeingVerified} API Error/Catch Block:`, apiError);
            let errorMessage = apiError.message || `An unexpected error occurred during ${actionBeingVerified}.`;

            // --- Specific error message tailoring ---
             if (apiError.message?.includes("timeout") || apiError.message?.includes("duplicate") || apiError.message?.includes("already-seen-response")) {
                 errorMessage = "Captcha timed out or was already used. Please try submitting again.";
             } else if (apiError.message?.includes("Captcha") || apiError.message?.includes("verification failed")) {
                 errorMessage = "Captcha verification failed or token was invalid. Please try again.";
             } else if (apiError.message?.includes("Invalid login credentials")) {
                 errorMessage = "Invalid email or password.";
             } else if (apiError.message?.includes("User already registered")) {
                 errorMessage = "An account with this email already exists.";
             } else if (apiError.message?.includes("Email not confirmed")) {
                 errorMessage = "Email not confirmed. Check your inbox or resend the verification email.";
                 shouldShowResendBtnAgain = (actionBeingVerified === 'login');
             } else if (apiError.status === 422 || apiError.message?.includes("Anonymous sign-ins are disabled")) {
                 errorMessage = "Submitted data was invalid. Please check details and try again.";
             } else if (apiError.message?.toLowerCase().includes("for security purposes")) {
                 errorMessage = "Too many requests. Please wait a minute and try again.";
                 shouldShowResendBtnAgain = true; // Allow retry after rate limit
             }
            // --- End specific error tailoring ---

            setError(errorMessage);
            toast.error(`${actionBeingVerified === 'login' ? 'Login' : actionBeingVerified === 'register' ? 'Registration' : 'Resend'} Failed`, { description: errorMessage });
            setShowResendEmailButton(shouldShowResendBtnAgain);

        } finally {
            // --- GUARANTEED Cleanup ---
            console.log(`---> FINALLY sequence for action ${actionBeingVerified}: Stopping loading state.`);
            if (actionBeingVerified === 'resend') {
                setIsResending(false);
            } else {
                setIsLoading(false);
            }

            // Reset captcha UNLESS we need to show the resend button
            if (!shouldShowResendBtnAgain) {
                console.log(`---> FINALLY sequence: Performing standard captcha reset.`);
                resetCaptchaState(`finally_${actionBeingVerified}_${apiSuccess ? 'success' : 'error'}`);
            } else {
                console.log(`---> FINALLY sequence: Not resetting captcha widget (showing Resend button), but clearing action refs.`);
                // Clear action/data refs to prevent reuse on next click, but keep widget state
                actionRef.current = null;
                capturedSubmitDataRef.current = null;
                // isVerificationAttemptCompleteRef is already true here
            }
            console.log(`[${new Date().toISOString()}] ===> onVerifyCaptcha EXIT. Action: ${actionBeingVerified}`);
        }
    };
    // --- End onVerifyCaptcha ---

    // --- Captcha Error/Expire Handlers ---
    const onErrorCaptcha = (errorCode: string) => {
        console.error("Turnstile Widget Error:", errorCode);
        setError(`Captcha challenge failed (${errorCode}). Please try again.`);
        toast.error("Captcha Error", { description: `Could not verify captcha. Error: ${errorCode}` });
        setIsLoading(false);
        setIsResending(false);
        resetCaptchaState('onError'); // Reset captcha fully
    };
    const onExpireCaptcha = () => {
        console.warn("Turnstile token expired.");
        const currentActionInProgress = isLoading || isResending;
        if (currentActionInProgress) {
            setError("Captcha challenge expired before completion. Please try again.");
            toast.warning("Captcha Expired", { description: "Please try submitting again." });
        }
        setIsLoading(false);
        setIsResending(false);
        resetCaptchaState('onExpire'); // Reset captcha fully
    };
    // --- End Captcha Handlers ---

    // --- JSX Rendering ---
    return (
        <>
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger id="login-tab" value="login" disabled={isLoading || isResending}>Login</TabsTrigger>
                    <TabsTrigger value="register" disabled={isLoading || isResending}>Register</TabsTrigger>
                </TabsList>

                {/* Login Form */}
                <TabsContent value="login">
                    <form onSubmit={handleLogin} className="space-y-4">
                        {/* Inputs */}
                        <div className="space-y-2">
                            <Label htmlFor="login-email" className="text-white">Email</Label>
                            <Input id="login-email" name="email" type="email" placeholder="your.email@example.com" value={loginForm.email} onChange={handleLoginChange} required className="bg-[#0f1115] border-[#2a2d36] text-white" disabled={isLoading || isResending} />
                        </div>
                        <div className="space-y-2">
                             <Label htmlFor="login-password" className="text-white">Password</Label>
                             <div className="relative">
                                 <Input id="login-password" name="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={loginForm.password} onChange={handleLoginChange} required className="bg-[#0f1115] border-[#2a2d36] text-white" disabled={isLoading || isResending} />
                                 <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" onClick={() => setShowPassword(!showPassword)} disabled={isLoading || isResending} aria-label={showPassword ? "Hide password" : "Show password"}>
                                     {showPassword ? (<EyeOff className="h-4 w-4" />) : (<Eye className="h-4 w-4" />)}
                                 </button>
                             </div>
                        </div>
                        {/* Error */}
                        {error && <p className="text-red-500 text-sm flex items-center"><AlertCircle className="h-4 w-4 mr-1" />{error}</p>}
                        {/* Resend Button */}
                        {showResendEmailButton && (
                            <Button type="button" variant="link" className="text-sm text-[#5865f2] hover:text-[#4752c4] p-0 h-auto mt-1 self-start flex items-center justify-start" onClick={handleResendVerificationEmail} disabled={isLoading || isResending} >
                                {isResending ? ( <> <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Sending... </> ) : ( <> <Send className="mr-1 h-3 w-3"/> Resend verification email </> )}
                            </Button>
                        )}
                        {/* Forgot Password */}
                        <div className="flex justify-end"> <button type="button" onClick={handleForgotPassword} className="text-sm text-[#5865f2] hover:text-[#4752c4]" disabled={isLoading || isResending}> Forgot password? </button> </div>
                        {/* Submit Button */}
                        <Button type="submit" className="w-full bg-[#5865f2] hover:bg-[#4752c4]" disabled={isLoading || isResending}>
                            {(isLoading || isResending) ? (
                                <span className="flex items-center justify-center">
                                    <Loader2 className="animate-spin mr-2 h-4 w-4"/>
                                    {/* Determine text based on which state is true */}
                                    {isLoading ? 'Logging In...' : 'Processing...'}
                                </span>
                             ) : (
                                <span className="flex items-center justify-center"> <LogIn className="mr-2 h-4 w-4" /> Login </span>
                             )}
                        </Button>
                        {/* Switch to Register */}
                        <div className="text-center text-sm text-gray-400"> Don't have an account?{" "} <button type="button" className="text-[#5865f2] hover:text-[#4752c4]" onClick={() => handleTabChange("register")} disabled={isLoading || isResending}> Sign up </button> </div>
                    </form>
                </TabsContent>

                {/* Register Form */}
                <TabsContent value="register">
                     <form onSubmit={handleRegister} className="space-y-4">
                          {/* Inputs */}
                          <div className="space-y-2">
                             <Label htmlFor="register-name" className="text-white">Full Name</Label>
                             <Input id="register-name" name="name" placeholder="John Doe" value={registerForm.name} onChange={handleRegisterChange} required className="bg-[#0f1115] border-[#2a2d36] text-white" disabled={isLoading || isResending} />
                          </div>
                          <div className="space-y-2">
                             <Label htmlFor="register-email" className="text-white">Email</Label>
                             <Input id="register-email" name="email" type="email" placeholder="your.email@example.com" value={registerForm.email} onChange={handleRegisterChange} required className="bg-[#0f1115] border-[#2a2d36] text-white" disabled={isLoading || isResending} />
                          </div>
                          <div className="space-y-2">
                             <Label htmlFor="register-password" className="text-white">Password</Label>
                             <div className="relative">
                                 <Input id="register-password" name="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={registerForm.password} onChange={handleRegisterChange} required className="bg-[#0f1115] border-[#2a2d36] text-white" disabled={isLoading || isResending} />
                                 <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" onClick={() => setShowPassword(!showPassword)} disabled={isLoading || isResending} aria-label={showPassword ? "Hide password" : "Show password"}>
                                     {showPassword ? (<EyeOff className="h-4 w-4" />) : (<Eye className="h-4 w-4" />)}
                                 </button>
                             </div>
                          </div>
                          <div className="space-y-2">
                             <Label htmlFor="register-confirm-password" className="text-white"> Confirm Password </Label>
                              <Input id="register-confirm-password" name="confirmPassword" type="password" placeholder="••••••••" value={registerForm.confirmPassword} onChange={handleRegisterChange} required className="bg-[#0f1115] border-[#2a2d36] text-white" disabled={isLoading || isResending} />
                          </div>
                        {/* Error */}
                        {error && <p className="text-red-500 text-sm flex items-center"><AlertCircle className="h-4 w-4 mr-1" />{error}</p>}
                        {/* Submit Button */}
                        <Button type="submit" className="w-full bg-[#5865f2] hover:bg-[#4752c4]" disabled={isLoading || isResending}>
                            {isLoading ? ( <span className="flex items-center justify-center"> <Loader2 className="animate-spin mr-2 h-4 w-4"/> Verifying... </span> ) : ( <span className="flex items-center justify-center"> <UserPlus className="mr-2 h-4 w-4" /> Register </span> )}
                        </Button>
                        {/* Switch to Login */}
                        <div className="text-center text-sm text-gray-400"> Already have an account?{" "} <button type="button" className="text-[#5865f2] hover:text-[#4752c4]" onClick={() => handleTabChange("login")} disabled={isLoading || isResending}> Log in </button> </div>
                    </form>
                </TabsContent>
            </Tabs>

            {/* Turnstile Widget */}
            {TurnstileSiteKey ? ( <Turnstile ref={captchaRef} siteKey={TurnstileSiteKey} onSuccess={onVerifyCaptcha} onError={onErrorCaptcha} onExpire={onExpireCaptcha} key={captchaKey} options={{ theme: 'dark', size: 'invisible', execution: 'execute', responseField: false }} /> ) : ( <p className="text-xs text-yellow-500 text-center mt-2">Captcha is not configured.</p> )}
        </>
    );
}