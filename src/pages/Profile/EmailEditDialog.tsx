// src/pages/Profile/EmailEditDialog.tsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Shield } from "lucide-react";
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
  const { updateEmail } = useAuth();
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setNewEmail("");
      setPassword("");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newEmail) {
      toast.error("Please enter a new email address");
      return;
    }
    
    if (newEmail === currentEmail) {
      toast.error("New email is the same as current email");
      return;
    }
    
    if (!password) {
      toast.error("Please enter your password to confirm");
      return;
    }
    
    try {
      setIsUpdating(true);
      await updateEmail(newEmail, password);
      
      // Call the callback to update the profile with the new email
      onEmailUpdated(newEmail);
      
      // Close the dialog
      onOpenChange(false);
      
      // Show success message
      toast.success("Email updated successfully");
    } catch (error) {
      console.error("Failed to update email:", error);
      toast.error("Failed to update email. Please check your password and try again.");
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
            Enter your new email address and current password to confirm
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-email">Current Email</Label>
            <Input
              id="current-email"
              value={currentEmail}
              disabled
              className="bg-[#2a2d36] border-[#3f4354] text-gray-400"
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
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password" className="flex items-center">
              <Shield className="mr-2 h-4 w-4" /> Password Confirmation
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your current password"
              className="bg-[#2a2d36] border-[#3f4354]"
              required
            />
            <p className="text-xs text-gray-500">
              For security, we need your current password to confirm this change
            </p>
          </div>
          
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
              disabled={isUpdating}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Email"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
