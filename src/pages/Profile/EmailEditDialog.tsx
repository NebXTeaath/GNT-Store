// src/pages/Profile/EmailEditDialog.tsx
import React, { useState, useRef, useEffect } from "react"; // Removed useCallback as it wasn't used
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'; // Import Turnstile

interface EmailEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentEmail: string;
  onEmailUpdated: (newEmail: string) => void;
}

export function EmailEditDialog({
  open,
  onOpenChange,
  currentEmail,
  onEmailUpdated,
}: EmailEditDialogProps) {
  const { updateUserEmail } = useAuth();
  const [newEmail, setNewEmail] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Turnstile state and refs ---
  const emailCaptchaRef = useRef<TurnstileInstance>(null);
  const [emailCaptchaKey, setEmailCaptchaKey] = useState<string>(`email-${Math.random().toString(36).substring(2, 15)}`);
  const TurnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITEKEY;
  const newEmailCaptureRef = useRef<string>(""); // To hold email during captcha

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setNewEmail("");
      setError(null); // Clear errors
      setIsUpdating(false);
      newEmailCaptureRef.current = ""; // Clear captured email
      try { emailCaptchaRef.current?.reset(); } catch (e) { console.warn("Error resetting email captcha on open:", e); }
      setEmailCaptchaKey(`email-open-${Math.random().toString(36).substring(2, 10)}`);
    }
  }, [open]);

  // --- Submit Handler ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!newEmail || !newEmail.includes('@')) { setError("Please enter a valid new email address"); toast.error("Invalid Email"); return; }
    if (newEmail === currentEmail) { setError("New email is the same as current email"); toast.info("Email is unchanged"); return; }

    // Captcha Checks
    if (!TurnstileSiteKey) { setError("Captcha configuration error."); toast.error("Configuration Error"); return; }
    if (!emailCaptchaRef.current) { setError("Captcha component not ready. Please wait or refresh."); toast.error("Captcha Error"); return; }

    // Execute Captcha
    setIsUpdating(true);
    newEmailCaptureRef.current = newEmail;
    console.log("Executing Turnstile for EMAIL CHANGE...");
    try {
      await emailCaptchaRef.current.execute();
      console.log("Turnstile execution requested for email change.");
    } catch (err) {
      console.error("Error executing Turnstile for email change:", err);
      setError("Failed to start captcha verification. Please try again.");
      toast.error("Captcha Error", { description: "Could not start challenge." });
      setIsUpdating(false);
      emailCaptchaRef.current?.reset();
      setEmailCaptchaKey(`email-exec-fail-${Math.random().toString(36).substring(2, 15)}`);
    }
  };

  // --- Corrected Turnstile Callback for Email Change ---
  // Renamed onVerify to onSuccess
  const onSuccessEmailCaptcha = async (token: string) => { // Added token parameter, although not directly used in updateUserEmail call
    console.log("[Email Verify] Captcha verified, token:", token ? token.substring(0,5)+'...' : 'null'); // Log token reception
    const capturedNewEmail = newEmailCaptureRef.current;

    if (!capturedNewEmail) {
      console.error("[Email Verify] Captured new email ref is empty!");
      setError("Internal error: New email missing during captcha verification.");
      toast.error("Error");
      setIsUpdating(false);
      emailCaptchaRef.current?.reset();
      setEmailCaptchaKey(`email-verify-fail-noemail-${Math.random().toString(36).substring(2, 15)}`);
      return;
    }

    // Proceed with the API call after client-side verification
    console.log(`[Email Verify] Calling updateUserEmail for ${capturedNewEmail}.`);
    try {
      // Pass only the email, as Supabase handles captcha server-side if configured
      const { error: updateError } = await updateUserEmail(capturedNewEmail);

      if (updateError) {
        console.error("[Email Verify] Update email error from Supabase:", updateError);
        let errorMessage = updateError.message || "Failed to request email update.";
        // Add specific error checks if needed
        if (updateError.message?.toLowerCase().includes("captcha verification process failed")) { errorMessage = "Server-side captcha verification failed. Please try again."; }
        else if (updateError.message?.includes("User already registered")) { errorMessage = "This email address is already in use."; }
        else if (updateError.message?.includes("For security purposes")) { errorMessage = "Too many requests. Please wait a minute and try again."; }
        setError(errorMessage);
        toast.error("Failed to Request Email Change", { description: errorMessage });
        emailCaptchaRef.current?.reset(); // Reset captcha on API error
        setEmailCaptchaKey(`email-verify-fail-${Math.random().toString(36).substring(2, 15)}`);
      } else {
        onEmailUpdated(capturedNewEmail); // Notify parent
        onOpenChange(false); // Close dialog
        toast.success("Email change request sent", { description: "Please check both your old and new email inboxes to confirm the change.", duration: 7000, });
      }
    } catch (err: any) {
      console.error("[Email Verify] Unexpected error:", err);
      setError(err.message || "An unexpected error occurred.");
      toast.error("Email Update Error");
      emailCaptchaRef.current?.reset();
      setEmailCaptchaKey(`email-catch-fail-${Math.random().toString(36).substring(2, 15)}`);
    } finally {
      setIsUpdating(false); // Stop loading indicator
      newEmailCaptureRef.current = ""; // Clear captured email
    }
  };

  // --- Captcha Error/Expire Handlers ---
  const onErrorEmailCaptcha = (errorCode: string) => {
      console.error("Turnstile Error (Email Change):", errorCode);
      setError(`Captcha challenge failed (${errorCode}). Please try again.`);
      toast.error("Captcha Error", { description: `Could not verify captcha. Error: ${errorCode}` });
      setIsUpdating(false);
      setEmailCaptchaKey(`email-error-${errorCode}-${Math.random().toString(36).substring(2, 15)}`);
   };
  const onExpireEmailCaptcha = () => {
      console.warn("Turnstile token expired (Email Change).");
      if (isUpdating) {
          setError("Captcha challenge expired before completion. Please try again.");
          toast.warning("Captcha Expired", { description: "Please try submitting again." });
      }
      setIsUpdating(false);
      setEmailCaptchaKey(`email-expire-${Math.random().toString(36).substring(2, 15)}`);
   };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0f1115] text-white border-[#2a2d36]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center text-white">
            <Mail className="mr-2 h-5 w-5" /> Update Email Address
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Enter your new email address. A confirmation link will be sent to both your old and new addresses.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Current Email (Readonly) */}
          <div className="space-y-2">
            <Label htmlFor="current-email">Current Email</Label>
            <Input id="current-email" value={currentEmail} disabled readOnly className="bg-[#2a2d36]/70 border-[#3f4354] text-gray-400 cursor-not-allowed" />
          </div>

          {/* New Email Input */}
          <div className="space-y-2">
            <Label htmlFor="new-email">New Email Address</Label>
            <Input id="new-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Enter your new email address" className="bg-[#2a2d36] border-[#3f4354]" required disabled={isUpdating} />
          </div>

          {/* Error Display */}
          {error && (
             <p className="text-sm text-red-500 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0"/>{error}
             </p>
          )}

          {/* Corrected Turnstile Widget Prop: onVerify -> onSuccess */}
          {TurnstileSiteKey ? (
            <Turnstile
              siteKey={TurnstileSiteKey}
              onSuccess={onSuccessEmailCaptcha} // <-- FIX: Renamed prop
              onError={onErrorEmailCaptcha}
              onExpire={onExpireEmailCaptcha}
              ref={emailCaptchaRef}
              key={emailCaptchaKey}
              options={{ theme: 'dark', size: 'invisible', execution: 'execute', responseField: false }}
            />
           ) : ( <p className="text-xs text-yellow-500 text-center mt-2">Captcha is not configured.</p> ) }

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="bg-[#2a2d36] hover:bg-[#3f4354] border-[#3f4354] text-white" disabled={isUpdating} > Cancel </Button>
            <Button type="submit" className="bg-[#5865f2] hover:bg-[#4752c4]" disabled={isUpdating || !newEmail || newEmail === currentEmail} >
              {isUpdating ? ( <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending Request...</> ) : ( "Request Email Change" )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}