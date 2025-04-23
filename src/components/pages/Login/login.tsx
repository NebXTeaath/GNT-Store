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
    onSuccess: () => void;
    onRegisterSuccess: (email: string) => void;
    initialTab?: "login" | "register";
    onTabChange: (tab: "login" | "register") => void;
    onForgotPassword: () => void;
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

    const handleTabChangeInternal = (value: string) => { const tab = value as "login" | "register"; setActiveTab(tab); setError(""); setShowResendEmailButton(false); isVerificationAttemptCompleteRef.current = true; resetCaptchaState(`tab_change_${tab}`); onTabChange(tab); };
    const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => { const { name, value } = e.target; setLoginForm((prev) => ({ ...prev, [name]: value })); if (error || showResendEmailButton) { setError(""); setShowResendEmailButton(false); } };
    const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => { const { name, value } = e.target; setRegisterForm((prev) => ({ ...prev, [name]: value })); };
    const onCaptchaLoad = () => { console.log(`[LoginForm] Turnstile loaded.`); };

    const resetCaptchaState = useCallback((reason: string = "unknown") => { console.log(`[LF] Reset Captcha (${reason})`); actionRef.current = null; capturedSubmitDataRef.current = null; isVerificationAttemptCompleteRef.current = true; try { captchaRef.current?.reset(); } catch (err) { console.warn(`[LF] Captcha reset error:`, err); } setCaptchaKey(prev => `k-${Math.random().toString(36).substring(2, 10)}-${prev.slice(-2)}`); }, []);

    const initiateActionWithCaptcha = async (actionType: ActionType) => {
        if (isLoading || isResending) return;
        setError(""); setShowResendEmailButton(false); let data: CapturedSubmitData = null;
        if (actionType === 'login') { if (!loginForm.email || !loginForm.password) { setError("Fill all fields."); return; } data = { ...loginForm }; }
        else if (actionType === 'register') { if (!registerForm.name || !registerForm.email || !registerForm.password || !registerForm.confirmPassword) { setError("Fill all fields."); return; } if (registerForm.password !== registerForm.confirmPassword) { setError("Passwords don't match."); return; } data = { ...registerForm }; }
        else { if (!loginForm.email) { toast.error("Enter email."); return; } data = { email: loginForm.email }; }
        if (!TurnstileSiteKey || !captchaRef.current) { setError(!TurnstileSiteKey ? "Captcha config error." : "Captcha not ready."); return; }
        actionRef.current = actionType; capturedSubmitDataRef.current = data; isVerificationAttemptCompleteRef.current = false;
        if (actionType === 'resend') setIsResending(true); else setIsLoading(true);
        try { await captchaRef.current.execute(); }
        catch (err) { setError(`Captcha start failed.`); if (actionType === 'resend') setIsResending(false); else setIsLoading(false); resetCaptchaState(`exec_err_${actionType}`); }
    };

    const handleLoginSubmit = (e?: React.FormEvent<HTMLFormElement>) => { if (e) e.preventDefault(); initiateActionWithCaptcha('login'); };
    const handleRegisterSubmit = (e?: React.FormEvent<HTMLFormElement>) => { if (e) e.preventDefault(); initiateActionWithCaptcha('register'); };
    const handleResendVerificationEmail = () => { resetCaptchaState('resend_click'); setTimeout(() => initiateActionWithCaptcha('resend'), 50); };
    const handleForgotPasswordClick = (e: React.MouseEvent) => { e.preventDefault(); setError(""); setShowResendEmailButton(false); isVerificationAttemptCompleteRef.current = true; resetCaptchaState('forgot_pw_click'); onForgotPassword(); };

    const onSuccessCaptcha = async (token: string) => {
        const action = actionRef.current; const capturedData = capturedSubmitDataRef.current;
        if (isVerificationAttemptCompleteRef.current) return; isVerificationAttemptCompleteRef.current = true;
        if (!action || !capturedData?.email) { setError("Internal error."); setIsLoading(false); setIsResending(false); resetCaptchaState('missing_data'); return; }
        const email = capturedData.email; let success = false; let showResend = false;
        try {
            if (action === 'login') { if (!capturedData.password) throw new Error("Pwd missing."); const r = await login(email, capturedData.password, token); if (r.error) throw r.error; success = true; }
            else if (action === 'register') { if (!capturedData.name || !capturedData.password) throw new Error("Data missing."); const r = await register(capturedData.name, email, capturedData.password, token); if (r.error) throw r.error; success = true; }
            else if (action === 'resend') { const { error: e } = await supabase.auth.resend({ type: 'signup', email: email, options: { captchaToken: token } }); if (e) throw e; success = true; }
            setError(""); setShowResendEmailButton(false);
            if (action === 'login') onSuccess();
            else if (action === 'register') { toast.success("Registered!", { description: "Check email to verify.", duration: 7000 }); onRegisterSuccess(email); }
            else { toast.success("Verification resent!", { description: `Check: ${email}`, duration: 7000 }); }
        } catch (err: any) {
            let msg = err.message || `Error during ${action}.`;
            if (err.message?.includes("Captcha") || err.message?.includes("verification") || err.message?.includes("seen") || err.message?.includes("timeout")) msg = "Captcha failed/expired.";
            else if (err.message?.includes("Invalid login")) msg = "Invalid email or password.";
            else if (err.message?.includes("already registered")) msg = "Account exists.";
            else if (err.message?.includes("Email not confirmed")) { msg = "Email not confirmed."; showResend = (action === 'login'); }
            else if (err.status === 422 || err.message?.includes("Anonymous")) msg = "Invalid data.";
            else if (err.message?.toLowerCase().includes("security")) { msg = "Too many requests."; showResend = true; }
            setError(msg); toast.error(`${action} Failed`, { description: msg }); setShowResendEmailButton(showResend);
        } finally {
            if (action === 'resend') setIsResending(false); else setIsLoading(false);
            if (!showResend) resetCaptchaState(`finally_${action}_${success ? 'ok' : 'err'}`);
            else { actionRef.current = null; capturedSubmitDataRef.current = null; }
        }
    };

    const onErrorCaptcha = (code: string) => { setError(`Captcha failed (${code}).`); toast.error("Captcha Error"); setIsLoading(false); setIsResending(false); resetCaptchaState('onError'); };
    const onExpireCaptcha = () => { if (isLoading || isResending) { setError("Captcha expired."); toast.warning("Captcha Expired"); } setIsLoading(false); setIsResending(false); resetCaptchaState('onExpire'); };

    return (
        <>
            <Tabs value={activeTab} onValueChange={handleTabChangeInternal} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6"> <TabsTrigger value="login" disabled={isLoading || isResending}>Login</TabsTrigger> <TabsTrigger value="register" disabled={isLoading || isResending}>Register</TabsTrigger> </TabsList>
                <TabsContent value="login">
                    <form onSubmit={handleLoginSubmit} className="space-y-4">
                         <div className="space-y-2"> <Label htmlFor="login-email">Email</Label> <Input id="login-email" name="email" type="email" value={loginForm.email} onChange={handleLoginChange} required className="bg-[#0f1115] border-[#2a2d36]" disabled={isLoading || isResending} /> </div>
                         <div className="space-y-2"> <Label htmlFor="login-password">Password</Label> <div className="relative"> <Input id="login-password" name="password" type={showPassword ? "text" : "password"} value={loginForm.password} onChange={handleLoginChange} required className="bg-[#0f1115] border-[#2a2d36]" disabled={isLoading || isResending} /> <button type="button" aria-label={showPassword?"Hide":"Show"} className="absolute right-3 top-1/2 -translate-y-1/2" onClick={()=>setShowPassword(!showPassword)} disabled={isLoading||isResending}> {showPassword?<EyeOff className="h-4 w-4"/>:<Eye className="h-4 w-4"/>} </button> </div> </div>
                         {error && <p className="text-red-500 text-sm flex items-center"><AlertCircle className="h-4 w-4 mr-1"/>{error}</p>}
                         {showResendEmailButton && ( <Button type="button" variant="link" className="text-sm text-[#5865f2] p-0 h-auto" onClick={handleResendVerificationEmail} disabled={isLoading||isResending}> {isResending?(<><Loader2 className="mr-1 h-3 w-3 spin"/>Sending...</>):(<><Send className="mr-1 h-3 w-3"/>Resend verification</>)} </Button> )}
                         <div className="flex justify-end"> <button type="button" onClick={handleForgotPasswordClick} className="text-sm text-[#5865f2]" disabled={isLoading||isResending}> Forgot password? </button> </div>
                         <Button type="submit" className="w-full bg-[#5865f2]" disabled={isLoading||isResending}> {isLoading?(<><Loader2 className="spin mr-2 h-4 w-4 animate-spin"/>Logging In...</>):(<><LogIn className="mr-2 h-4 w-4"/>Login</>)} </Button>
                         <div className="text-center text-sm"> Don't have account?{" "} <button type="button" className="text-[#5865f2]" onClick={()=>handleTabChangeInternal("register")} disabled={isLoading||isResending}> Sign up </button> </div>
                    </form>
                </TabsContent>
                <TabsContent value="register">
                     <form onSubmit={handleRegisterSubmit} className="space-y-4">
                          <div className="space-y-2"> <Label htmlFor="register-name">Full Name</Label> <Input id="register-name" name="name" value={registerForm.name} onChange={handleRegisterChange} required className="bg-[#0f1115] border-[#2a2d36]" disabled={isLoading||isResending} /> </div>
                          <div className="space-y-2"> <Label htmlFor="register-email">Email</Label> <Input id="register-email" name="email" type="email" value={registerForm.email} onChange={handleRegisterChange} required className="bg-[#0f1115] border-[#2a2d36]" disabled={isLoading||isResending} /> </div>
                          <div className="space-y-2"> <Label htmlFor="register-password">Password</Label> <div className="relative"> <Input id="register-password" name="password" type={showPassword?"text":"password"} placeholder="min. 6 chars" value={registerForm.password} onChange={handleRegisterChange} required className="bg-[#0f1115] border-[#2a2d36]" disabled={isLoading||isResending} minLength={6}/> <button type="button" aria-label={showPassword?"Hide":"Show"} className="absolute right-3 top-1/2 -translate-y-1/2" onClick={()=>setShowPassword(!showPassword)} disabled={isLoading||isResending}> {showPassword?<EyeOff className="h-4 w-4"/>:<Eye className="h-4 w-4"/>} </button> </div> </div>
                          <div className="space-y-2"> <Label htmlFor="register-confirm-password">Confirm Password</Label> <Input id="register-confirm-password" name="confirmPassword" type="password" value={registerForm.confirmPassword} onChange={handleRegisterChange} required className="bg-[#0f1115] border-[#2a2d36]" disabled={isLoading||isResending} /> </div>
                         {error && <p className="text-red-500 text-sm flex items-center"><AlertCircle className="h-4 w-4 mr-1"/>{error}</p>}
                         <Button type="submit" className="w-full bg-[#5865f2]" disabled={isLoading||isResending}> {isLoading?(<><Loader2 className="spin mr-2 h-4 w-4"/>Registering...</>):(<><UserPlus className="mr-2 h-4 w-4"/>Register</>)} </Button>
                         <div className="text-center text-sm"> Already have account?{" "} <button type="button" className="text-[#5865f2]" onClick={()=>handleTabChangeInternal("login")} disabled={isLoading||isResending}> Log in </button> </div>
                    </form>
                </TabsContent>
            </Tabs>
            {TurnstileSiteKey ? ( <Turnstile ref={captchaRef} siteKey={TurnstileSiteKey} onLoad={onCaptchaLoad} onSuccess={onSuccessCaptcha} onError={onErrorCaptcha} onExpire={onExpireCaptcha} key={captchaKey} options={{ theme: 'dark', size: 'invisible', execution: 'execute', responseField: false }} /> ) : ( <p className="text-xs text-yellow-500 text-center mt-2">Captcha not configured.</p> )}
        </>
    );
}   