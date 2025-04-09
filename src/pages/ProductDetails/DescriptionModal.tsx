import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";

interface DescriptionModalProps {
  title: string;
  content: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DescriptionModal({ title, content, open, onOpenChange }: DescriptionModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1a1c23] border-[#2a2d36] text-white sm:max-w-md md:max-w-2xl lg:max-w-3xl">

        <ScrollArea className="mt-4 max-h-[60vh] pr-4">
          <div className="text-sm md:text-base text-gray-300 leading-relaxed">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </ScrollArea>
        
        
      </DialogContent>
    </Dialog>
  );
}

export default DescriptionModal;