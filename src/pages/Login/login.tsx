// src/pages/Login/login.tsx
import React, { useState, useRef, useCallback, useEffect } from "react"; // Added useEffect
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
    onSuccess: () => void; // Called on successful LOGIN
    onRegisterSuccess: (email: string) => void; // Called on successful REGISTRATION
    initialTab?: "login" | "register";
    onTabChange: (tab: "login" | "register") => void;
    onForgotPassword: () => void; // Callback to parent to switch view
}

type CapturedSubmitData = { email: string; password?: string; name?: string; } | null;
type ActionType = 'login' | 'register' | 'resend';

export default function LoginForm(props: LoginFormProps) {
    const { onSuccess, onRegisterSuccess, initialTab = "login", onTabChange, onForgotPassword } = props;
    const { signIn: login, signUp: register } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [activeTab, setActiveTab] = useState(initialTab);
    const [showResendEmailButton, setShowResendEmailButton] = useState(false);

    // Turnstile
    const captchaRef = useRef<TurnstileInstance>(null);
    const [captchaKey, setCaptchaKey] = useState<string>(() => `form-${Math.random().toString(36).substring(2, 15)}`);
    const TurnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITEKEY;
    const actionRef = useRef<ActionType | null>(null);
    const capturedSubmitDataRef = useRef<CapturedSubmitData>(null);
    const isVerificationAttemptCompleteRef = useRef<boolean>(true);

    // Form State
    const [loginForm, setLoginForm] = useState({ email: "", password: "" });
    const [registerForm, setRegisterForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });

    useEffect(() => { setActiveTab(initialTab); }, [initialTab]);

    const handleTabChangeInternal = (value: string) => {
        const tab = value as "login" | "register";
        setActiveTab(tab); setError(""); setShowResendEmailButton(false);
        isVerificationAttemptCompleteRef.current = true;
        resetCaptchaState(`tab_change_${tab}`);
        onTabChange(tab); // Notify parent
    };

    const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => { const { name, value } = e.target; setLoginForm((prev) => ({ ...prev, [name]: value })); if (error || showResendEmailButton) { setError(""); setShowResendEmailButton(false); } };
    const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => { const { name, value } = e.target; setRegisterForm((prev) => ({ ...prev, [name]: value })); };
    const onCaptchaLoad = () => { console.log(`[LoginForm] Turnstile loaded.`); };

    const resetCaptchaState = useCallback((reason: string = "unknown") => {
        console.log(`[LoginForm] Resetting Captcha (Reason: ${reason})`);
        actionRef.current = null; capturedSubmitDataRef.current = null; isVerificationAttemptCompleteRef.current = true;
        try { captchaRef.current?.reset(); } catch (err) { console.warn(`[LoginForm] Captcha reset error:`, err); }
        setCaptchaKey(prev => `k-${Math.random().toString(36).substring(2, 10)}-${prev.slice(-2)}`); // Force key change
    }, []);

    const initiateActionWithCaptcha = async (actionType: ActionType) => {
        if (isLoading || isResending) return;
        setError(""); setShowResendEmailButton(false);

        let dataToSubmit: CapturedSubmitData = null;
        if (actionType === 'login') { if (!loginForm.email || !loginForm.password) { setError("Fill all fields."); toast.error("Missing info"); return; } dataToSubmit = { email: loginForm.email, password: loginForm.password }; }
        else if (actionType === 'register') { if (!registerForm.name || !registerForm.email || !registerForm.password || !registerForm.confirmPassword) { setError("Fill all fields."); toast.error("Missing info"); return; } if (registerForm.password !== registerForm.confirmPassword) { setError("Passwords don't match."); toast.error("Passwords don't match"); return; } dataToSubmit = { name: registerForm.name, email: registerForm.email, password: registerForm.password }; }
        else { if (!loginForm.email) { toast.error("Enter email first.", { id: "resend-no-email" }); return; } dataToSubmit = { email: loginForm.email }; }

        if (!TurnstileSiteKey || !captchaRef.current) { setError(!TurnstileSiteKey ? "Captcha config error." : "Captcha not ready."); toast.error("Captcha Error"); return; }

        actionRef.current = actionType; capturedSubmitDataRef.current = dataToSubmit; isVerificationAttemptCompleteRef.current = false;
        if (actionType === 'resend') setIsResending(true); else setIsLoading(true);

        try { await captchaRef.current.execute(); }
        catch (err) { setError(`Captcha start failed.`); toast.error("Captcha Error"); if (actionType === 'resend') setIsResending(false); else setIsLoading(false); resetCaptchaState(`execute_error_${actionType}`); }
    };

    const handleLoginSubmit = (e?: React.FormEvent<HTMLFormElement>) => { if (e) e.preventDefault(); initiateActionWithCaptcha('login'); };
    const handleRegisterSubmit = (e?: React.FormEvent<HTMLFormElement>) => { if (e) e.preventDefault(); initiateActionWithCaptcha('register'); };
    const handleResendVerificationEmail = () => { resetCaptchaState('resend_click'); setTimeout(() => initiateActionWithCaptcha('resend'), 50); };
    // Use the prop for Forgot Password click
    const handleForgotPasswordClick = (e: React.MouseEvent) => { e.preventDefault(); setError(""); setShowResendEmailButton(false); isVerificationAttemptCompleteRef.current = true; resetCaptchaState('forgot_password_click'); onForgotPassword(); };

    const onSuccessCaptcha = async (token: string) => {
        const action = actionRef.current; const capturedData = capturedSubmitDataRef.current;
        if (isVerificationAttemptCompleteRef.current) { console.warn(`[LoginForm] onSuccessCaptcha called, but already complete.`); return; }
        isVerificationAttemptCompleteRef.current = true;
        if (!action || !capturedData?.email) { setError("Internal error."); setIsLoading(false); setIsResending(false); resetCaptchaState('missing_data_on_verify'); return; }

        const email = capturedData.email;
        let apiSuccess = false; let showResend = false;

        try {
            if (action === 'login') { if (!capturedData.password) throw new Error("Missing password."); const res = await login(email, capturedData.password, token); if (res.error) throw res.error; apiSuccess = true; }
            else if (action === 'register') { if (!capturedData.name || !capturedData.password) throw new Error("Missing data."); const res = await register(capturedData.name, email, capturedData.password, token); if (res.error) throw res.error; apiSuccess = true; }
            else if (action === 'resend') { const { error: err } = await supabase.auth.resend({ type: 'signup', email: email, options: { captchaToken: token } }); if (err) throw err; apiSuccess = true; }

            setError(""); setShowResendEmailButton(false);
            if (action === 'login') onSuccess(); // Call parent success handler
            else if (action === 'register') { toast.success("Registration successful!", { description: "Check email to verify account.", duration: 7000 }); onRegisterSuccess(email); }
            else { toast.success("Verification email resent!", { description: `Check inbox: ${email}`, duration: 7000 }); }

        } catch (err: any) {
            let errMsg = err.message || `Unexpected error during ${action}.`;
            if (err.message?.includes("Captcha") || err.message?.includes("verification") || err.message?.includes("already-seen") || err.message?.includes("timeout")) errMsg = "Captcha failed/expired.";
            else if (err.message?.includes("Invalid login")) errMsg = "Invalid email or password.";
            else if (err.message?.includes("User already registered")) errMsg = "Account exists.";
            else if (err.message?.includes("Email not confirmed")) { errMsg = "Email not confirmed."; showResend = (action === 'login'); }
            else if (err.status === 422 || err.message?.includes("Anonymous")) errMsg = "Invalid data.";
            else if (err.message?.toLowerCase().includes("security")) { errMsg = "Too many requests."; showResend = true; }
            setError(errMsg); toast.error(`${action.charAt(0).toUpperCase() + action.slice(1)} Failed`, { description: errMsg }); setShowResendEmailButton(showResend);
        } finally {
            if (action === 'resend') setIsResending(false); else setIsLoading(false);
            if (!showResend) resetCaptchaState(`finally_${action}_${apiSuccess ? 'success' : 'error'}`);
            else { actionRef.current = null; capturedSubmitDataRef.current = null; }
        }
    };

    const onErrorCaptcha = (code: string) => { setError(`Captcha failed (${code}).`); toast.error("Captcha Error"); setIsLoading(false); setIsResending(false); resetCaptchaState('onError'); };
    const onExpireCaptcha = () => { if (isLoading || isResending) { setError("Captcha expired."); toast.warning("Captcha Expired"); } setIsLoading(false); setIsResending(false); resetCaptchaState('onExpire'); };

    return (
        <>
            <Tabs value={activeTab} onValueChange={handleTabChangeInternal} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger id="login-tab" value="login" disabled={isLoading || isResending}>Login</TabsTrigger>
                    <TabsTrigger value="register" disabled={isLoading || isResending}>Register</TabsTrigger>
                </TabsList>

                {/* Login Form */}
                <TabsContent value="login">
                    <form onSubmit={handleLoginSubmit} className="space-y-4">
                         <div className="space-y-2"> <Label htmlFor="login-email" className="text-white">Email</Label> <Input id="login-email" name="email" type="email" placeholder="your.email@example.com" value={loginForm.email} onChange={handleLoginChange} required className="bg-[#0f1115] border-[#2a2d36] text-white" disabled={isLoading || isResending} /> </div>
                         <div className="space-y-2"> <Label htmlFor="login-password" className="text-white">Password</Label> <div className="relative"> <Input id="login-password" name="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={loginForm.password} onChange={handleLoginChange} required className="bg-[#0f1115] border-[#2a2d36] text-white" disabled={isLoading || isResending} /> <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" onClick={() => setShowPassword(!showPassword)} disabled={isLoading || isResending}> {showPassword ? (<EyeOff className="h-4 w-4" />) : (<Eye className="h-4 w-4" />)} </button> </div> </div>
                         {error && <p className="text-red-500 text-sm flex items-center"><AlertCircle className="h-4 w-4 mr-1" />{error}</p>}
                         {showResendEmailButton && ( <Button type="button" variant="link" className="text-sm text-[#5865f2] hover:text-[#4752c4] p-0 h-auto mt-1 self-start flex items-center justify-start" onClick={handleResendVerificationEmail} disabled={isLoading || isResending} > {isResending ? ( <> <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Sending... </> ) : ( <> <Send className="mr-1 h-3 w-3"/> Resend verification</> )} </Button> )}
                         <div className="flex justify-end"> <button type="button" onClick={handleForgotPasswordClick} className="text-sm text-[#5865f2] hover:text-[#4752c4]" disabled={isLoading || isResending}> Forgot password? </button> </div>
                         <Button type="submit" className="w-full bg-[#5865f2] hover:bg-[#4752c4]" disabled={isLoading || isResending}> {isLoading ? ( <span className="flex items-center justify-center"> <Loader2 className="animate-spin mr-2 h-4 w-4"/> Logging In... </span> ) : ( <span className="flex items-center justify-center"> <LogIn className="mr-2 h-4 w-4" /> Login </span> )} </Button>
                         <div className="text-center text-sm text-gray-400"> Don't have an account?{" "} <button type="button" className="text-[#5865f2] hover:text-[#4752c4]" onClick={() => handleTabChangeInternal("register")} disabled={isLoading || isResending}> Sign up </button> </div>
                    </form>
                </TabsContent>

                {/* Register Form */}
                <TabsContent value="register">
                     <form onSubmit={handleRegisterSubmit} className="space-y-4">
                          <div className="space-y-2"> <Label htmlFor="register-name" className="text-white">Full Name</Label> <Input id="register-name" name="name" placeholder="John Doe" value={registerForm.name} onChange={handleRegisterChange} required className="bg-[#0f1115] border-[#2a2d36] text-white" disabled={isLoading || isResending} /> </div>
                          <div className="space-y-2"> <Label htmlFor="register-email" className="text-white">Email</Label> <Input id="register-email" name="email" type="email" placeholder="your.email@example.com" value={registerForm.email} onChange={handleRegisterChange} required className="bg-[#0f1115] border-[#2a2d36] text-white" disabled={isLoading || isResending} /> </div>
                          <div className="space-y-2"> <Label htmlFor="register-password" className="text-white">Password</Label> <div className="relative"> <Input id="register-password" name="password" type={showPassword ? "text" : "password"} placeholder="min. 6 characters" value={registerForm.password} onChange={handleRegisterChange} required className="bg-[#0f1115] border-[#2a2d36] text-white" disabled={isLoading || isResending} minLength={6}/> <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" onClick={() => setShowPassword(!showPassword)} disabled={isLoading || isResending}> {showPassword ? (<EyeOff className="h-4 w-4" />) : (<Eye className="h-4 w-4" />)} </button> </div> </div>
                          <div className="space-y-2"> <Label htmlFor="register-confirm-password" className="text-white"> Confirm Password </Label> <Input id="register-confirm-password" name="confirmPassword" type="password" placeholder="re-type password" value={registerForm.confirmPassword} onChange={handleRegisterChange} required className="bg-[#0f1115] border-[#2a2d36] text-white" disabled={isLoading || isResending} /> </div>
                         {error && <p className="text-red-500 text-sm flex items-center"><AlertCircle className="h-4 w-4 mr-1" />{error}</p>}
                         <Button type="submit" className="w-full bg-[#5865f2] hover:bg-[#4752c4]" disabled={isLoading || isResending}> {isLoading ? ( <span className="flex items-center justify-center"> <Loader2 className="animate-spin mr-2 h-4 w-4"/> Registering... </span> ) : ( <span className="flex items-center justify-center"> <UserPlus className="mr-2 h-4 w-4" /> Register </span> )} </Button>
                         <div className="text-center text-sm text-gray-400"> Already have an account?{" "} <button type="button" className="text-[#5865f2] hover:text-[#4752c4]" onClick={() => handleTabChangeInternal("login")} disabled={isLoading || isResending}> Log in </button> </div>
                    </form>
                </TabsContent>
            </Tabs>

            {/* Invisible Turnstile Widget */}
            {TurnstileSiteKey ? (
                <Turnstile ref={captchaRef} siteKey={TurnstileSiteKey} onLoad={onCaptchaLoad} onSuccess={onSuccessCaptcha} onError={onErrorCaptcha} onExpire={onExpireCaptcha} key={captchaKey} options={{ theme: 'dark', size: 'invisible', execution: 'execute', responseField: false }} />
            ) : ( <p className="text-xs text-yellow-500 text-center mt-2">Captcha not configured.</p> )}
        </>
    );
}