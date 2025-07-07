// src/pages/support/CopyableEmail.tsx
import { useState } from 'react';
import { Mail, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils'; // Import cn utility

interface CopyableEmailProps {
  email: string;
  className?: string;
}

export const CopyableEmail: React.FC<CopyableEmailProps> = ({ email, className }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent the parent <a> tag's default mailto: action
    e.preventDefault();
    e.stopPropagation();

    navigator.clipboard.writeText(email);
    toast.success("Email address copied to clipboard!");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); // Reset icon after 2 seconds
  };

  return (
    // The entire component is now a clickable link
    <a
      href={`mailto:${email}?subject=${encodeURIComponent('Support Request from GNT Store Website')}`}
      className={cn(
        "flex items-center gap-2 p-2 rounded-lg bg-[#2a2d36] border border-[#3f4354] transition-all duration-200 hover:border-gray-500 hover:bg-gray-700/50 cursor-pointer",
        className
      )}
    >
      <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
      <span className="text-sm text-gray-200 font-mono flex-grow">{email}</span>
      
      {/* The copy button will stop the click from propagating to the parent link */}
      <button
        onClick={handleCopy}
        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-600 rounded-md transition-all z-10" // z-10 to ensure it's "on top"
        aria-label="Copy email address"
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-400" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </button>
    </a>
  );
};