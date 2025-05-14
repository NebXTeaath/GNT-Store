
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Copy text to clipboard
 * @param text - The text to copy
 * @returns Promise that resolves when text is copied
 */
export function copyToClipboard(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Navigator clipboard API (modern browsers)
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(() => resolve())
        .catch((err) => reject(err));
    } else {
      // Fallback for older browsers
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        
        // Make the textarea out of viewport
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        
        // Select and copy
        textArea.focus();
        textArea.select();
        const success = document.execCommand("copy");
        document.body.removeChild(textArea);
        
        if (success) {
          resolve();
        } else {
          reject(new Error("Failed to copy text using execCommand"));
        }
      } catch (err) {
        reject(err);
      }
    }
  });
}
