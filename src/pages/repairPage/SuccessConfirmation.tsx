//src/pages/repairPage/SuccessConfirmation
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { CheckCircle, Copy, CheckCheck } from "lucide-react";

interface SuccessConfirmationProps {
  requestId: string;
  onClose: () => void;
}

const SuccessConfirmation = ({ requestId, onClose }: SuccessConfirmationProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(requestId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="bg-[#1a1c23] border-[#2a2d36] text-white w-full max-w-md mx-auto">
      <CardHeader className="space-y-1 flex flex-col items-center">
        <div className="bg-green-500/20 p-3 rounded-full">
          <CheckCircle className="h-10 w-10 text-green-400" />
        </div>
        <CardTitle className="text-2xl mt-4">Request Submitted!</CardTitle>
        <CardDescription className="text-gray-400">
          Your repair request has been received successfully.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-[#2a2d36] p-4 rounded-lg border border-[#3f4354]">
          <p className="text-sm text-gray-400 mb-2">Your Request ID:</p>
          <div className="flex items-center justify-between">
            <p className="font-mono text-lg text-white">{requestId}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="text-gray-400 hover:text-white hover:bg-[#3f4354]"
            >
              {copied ? <CheckCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <p className="text-sm text-gray-400">
          Please keep this ID for tracking your repair status. You can check the status anytime
          in the "Track Existing" tab.
        </p>
      </CardContent>
      <CardFooter>
        <Button onClick={onClose} className="w-full bg-[#5865f2] hover:bg-[#4752c4]">
          Got it!
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SuccessConfirmation;
