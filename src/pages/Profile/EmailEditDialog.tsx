// src/pages/Profile/EmailEditDialog.tsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail } from "lucide-react"; // Removed Shield icon
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
  onEmailUpdated: (newEmail: string) => void;
}

export function EmailEditDialog({
  open,
  onOpenChange,
  currentEmail,
  onEmailUpdated,
}: EmailEditDialogProps) {
  // FIX: Use the correct function from context
  const { updateUserEmail } = useAuth();
  const [newEmail, setNewEmail] = useState("");
  // const [password, setPassword] = useState(""); // Removed password state
  const [isUpdating, setIsUpdating] = useState(false);

  React.useEffect(() => {
    if (open) {
      setNewEmail("");
      // setPassword(""); // Removed password reset
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newEmail || !newEmail.includes('@')) { // Basic email format check
      toast.error("Please enter a valid new email address");
      return;
    }

    if (newEmail === currentEmail) {
      toast.error("New email is the same as current email");
      return;
    }

    // if (!password) { // Removed password check
    //   toast.error("Please enter your password to confirm");
    //   return;
    // }

    setIsUpdating(true);
    try {
      // FIX: Call updateUserEmail with only the new email
      await updateUserEmail(newEmail);

      // Callback can still be called, but the actual update is pending email confirmation
      onEmailUpdated(newEmail);
      onOpenChange(false); // Close dialog

      // FIX: Update success message to reflect confirmation process
      toast.success("Email change request sent", {
          description: "Please check both your old and new email inboxes to confirm the change.",
          duration: 7000, // Longer duration for this message
      });

    } catch (error: any) { // Catch specific error type if possible
      console.error("Failed to request email update:", error);
      // FIX: Use the error message from the AuthError if available
      toast.error("Failed to request email update", { description: error?.message || "Please try again." });
    } finally {
      setIsUpdating(false);
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
          <div className="space-y-2">
            <Label htmlFor="current-email">Current Email</Label>
            <Input
              id="current-email"
              value={currentEmail}
              disabled
              readOnly // Add readOnly for clarity
              className="bg-[#2a2d36]/70 border-[#3f4354] text-gray-400 cursor-not-allowed"
            />
          </div>

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
              disabled={isUpdating} // Disable while updating
            />
          </div>

          {/* Removed Password Input Section */}

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
              disabled={isUpdating || !newEmail || newEmail === currentEmail} // Add basic validation disabling
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