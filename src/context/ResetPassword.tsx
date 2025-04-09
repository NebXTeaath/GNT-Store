//src\context\ResetPassword.tsx
"use client";

import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { account } from "@/lib/appwrite"; // Ensure your Appwrite client is properly configured here
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ResetPassword() {
  const searchParams = useSearchParams()[0];
  const navigate = useNavigate();
  
  // Extract recovery parameters from URL
  const userId = searchParams.get("userId");
  const secret = searchParams.get("secret");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdateRecovery = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (!userId || !secret) {
      toast.error("Invalid recovery link. Please request a new one.");
      return;
    }

    setIsLoading(true);
    try {
      await account.updateRecovery(userId, secret, newPassword);
      toast.success("Password updated successfully. Please log in.");
      navigate("/"); // Redirect to login after success
    } catch (error: any) {
      console.error("Error updating password:", error);
      toast.error(error.message || "Failed to update password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a1c23]">
      <div className="bg-[#1a1c23] border border-[#2a2d36] rounded-md p-6 w-full max-w-md text-white">
        <h1 className="text-2xl font-bold mb-4">Reset Your Password</h1>
        <p className="text-gray-400 mb-6">
          Enter your new password to complete the recovery process.
        </p>
        <form onSubmit={handleUpdateRecovery} className="space-y-4">
          <div>
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="bg-[#0f1115] border-[#2a2d36] text-white"
            />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="bg-[#0f1115] border-[#2a2d36] text-white"
            />
          </div>
          <Button 
            type="submit" 
            className="w-full bg-[#5865f2] hover:bg-[#4752c4]" 
            disabled={isLoading}
          >
            {isLoading ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
