import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Copy, CheckCheck } from "lucide-react";

interface AIHelpInstructionsProps { 
  aiPrompt: string; 
  onClose: () => void; 
}

const AIHelpInstructions = ({ aiPrompt, onClose }: AIHelpInstructionsProps) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => { 
    navigator.clipboard.writeText(aiPrompt); 
    setCopied(true); 
    setTimeout(() => setCopied(false), 2000); 
  };

  const handleContinueToAI = () => {
    window.open("https://chatgpt.com/?temporary-chat=true", "_blank");
    onClose();
  };

  return (
    <Card className="bg-[#1a1c23] border-[#2a2d36] text-white w-full max-w-md mx-auto">
      <CardHeader className="space-y-1 flex flex-col items-center">
        <div className="bg-blue-500/20 p-3 rounded-full">
          <Bot className="h-10 w-10 text-blue-400" />
        </div>
        <CardTitle className="text-2xl mt-4">AI Troubleshooting</CardTitle>
        <CardDescription className="text-gray-400 text-center">
          Let AI help you troubleshoot your issue before submitting a repair request
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-[#2a2d36] p-4 rounded-lg border border-[#3f4354]">
          <p className="text-sm text-gray-400 mb-2">Your prompt has been prepared:</p>
          <div className="flex items-center justify-between">
            <p className="text-sm text-white line-clamp-2">{aiPrompt.substring(0, 100)}...</p>
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
        <div className="space-y-2">
          <p className="text-sm text-gray-400">Instructions:</p>
          <ol className="list-decimal pl-5 text-sm text-gray-300 space-y-1">
            <li>Click the button below to open ChatGPT in a new tab</li>
            <li>Paste the copied prompt in the ChatGPT chat box</li>
            <li>Follow the AI's instructions to troubleshoot your issue</li>
          </ol>
          <p className="text-sm text-gray-400 mt-4">
            If AI can't resolve your issue, you can still submit a repair request when you return.
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col space-y-3">
        <Button onClick={handleContinueToAI} className="w-full bg-[#5865f2] hover:bg-[#4752c4]">
          Continue to ChatGPT
        </Button>
        <Button variant="ghost" onClick={onClose} className="w-full text-gray-400 hover:text-[#ff6d6d]">
          Cancel
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AIHelpInstructions;