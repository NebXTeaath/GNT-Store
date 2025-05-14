
// src/pages/Profile/EmailEditDialog.tsx
import React, { useState } from "react";
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

interface EmailEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentEmail: string;
  onEmailUpdated: (newEmail: string) => void; // Callback after request *sent*
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

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setNewEmail("");
      setError(null);
      setIsUpdating(false);
    }
  }, [open]);

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic Validation
    if (!newEmail || !newEmail.includes('@')) { 
      setError("Please enter a valid new email address"); 
      toast.error("Invalid Email"); 
      return; 
    }
    
    if (newEmail === currentEmail) { 
      setError("New email is the same as current email"); 
      toast.info("Email is unchanged"); 
      return; 
    }

    setIsUpdating(true);
    
    try {
      // Call context function to update email
      const { error: updateError } = await updateUserEmail(newEmail);

      if (updateError) {
        console.error("[Email Update] Error from Supabase:", updateError);
        let errorMessage = updateError.message || "Failed to request email update.";
        
        if (updateError.message?.includes("User already registered")) { 
          errorMessage = "This email address is already in use."; 
        }
        else if (updateError.message?.includes("For security purposes")) { 
          errorMessage = "Too many requests. Please wait a minute and try again."; 
        }
        
        setError(errorMessage);
        toast.error("Failed to Request Email Change", { description: errorMessage });
      } else {
        // SUCCESS: Email change request initiated
        onEmailUpdated(newEmail); // Notify parent that request was *sent*
        onOpenChange(false); // Close dialog
        toast.success("Email change request sent", {
          description: "Please check both your old and new email inboxes to confirm the change.",
          duration: 7000,
        });
      }
    } catch (err: any) {
      console.error("[Email Update] Unexpected error:", err);
      setError(err.message || "An unexpected error occurred.");
      toast.error("Email Update Error");
    } finally {
      setIsUpdating(false); // Stop loading indicator
    }
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
            <Input
              id="current-email"
              value={currentEmail}
              disabled
              readOnly
              className="bg-[#2a2d36]/70 border-[#3f4354] text-gray-400 cursor-not-allowed"
            />
          </div>

          {/* New Email Input */}
          <div className="space-y-2">
            <Label htmlFor="new-email">New Email Address</Label>
            <Input
              id="new-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Enter your new email address"
              className="bg-[#2a2d36] border-[#3f4354]"
              required
              disabled={isUpdating}
            />
          </div>

          {/* Error Display */}
          {error && (
             <p className="text-sm text-red-500 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0"/>{error}
             </p>
          )}

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-[#2a2d36] hover:bg-[#3f4354] border-[#3f4354] text-white"
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#5865f2] hover:bg-[#4752c4]"
              disabled={isUpdating || !newEmail || newEmail === currentEmail} // Basic validation
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Request...
                </>
              ) : (
                "Request Email Change"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
