// src/pages/repairPage/CheckServiceAvailability.tsx
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter, // Added DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin, CheckCircle, X, AlertTriangle } from "lucide-react";
import { usePincodeValidator } from "@/components/global/Profile/pincodeValidator"; // Adjust path if needed
import { useDebounce } from "@/components/global/hooks/use-debounce"; // Adjust path if needed

// --- Type for Validation Result State ---
type ValidationResultState = {
  valid: boolean;
  city?: string;
  message?: string;
  isServiceAvailable?: boolean; // Keep this
} | null;
// --- End Type Definition ---


// --- ADDED: Prop for callback on successful validation ---
interface CheckServiceAvailabilityProps {
    onServiceable?: () => void; // Callback function
    triggerButtonText?: React.ReactNode; // Allow JSX for text/icons
    triggerButtonVariant?: "outline" | "default" | "destructive" | "secondary" | "ghost" | "link" | null | undefined;
    triggerButtonClassName?: string;
}
// --- End Added Prop ---


export default function CheckServiceAvailability({
    onServiceable, // Destructure the callback
    triggerButtonText = "Check Service Area",
    triggerButtonVariant = "outline",
    triggerButtonClassName = "bg-[#dbdee2] border-gray-600 hover:bg-[#2f3555] hover:text-white text-gray-900"
}: CheckServiceAvailabilityProps) { // Use the props
  const [isOpen, setIsOpen] = useState(false);
  const [pinCode, setPinCode] = useState("");
  const [validationResult, setValidationResult] = useState<ValidationResultState>(null);
  const { isValidating, validatePincode } = usePincodeValidator();
  const debouncedPinCode = useDebounce(pinCode, 500);

  useEffect(() => {
    if (debouncedPinCode.length === 6) {
      handleValidation(debouncedPinCode);
    } else {
      setValidationResult(null); // Reset validation when pincode is incomplete
    }
    // Intentionally excluding handleValidation from dependencies as it depends on validatePincode from the hook,
    // and we only want this effect to run when debouncedPinCode changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedPinCode]);

  const handleValidation = async (codeToValidate: string) => {
    const result = await validatePincode(codeToValidate); // Fetches result including isServiceAvailable

    let finalMessage = result.message || "Validation failed.";

    // Use isServiceAvailable directly to determine message
    if (result.valid && result.city) {
      finalMessage = result.isServiceAvailable
        ? `Great! Service is available in ${result.city}.`
        : `Sorry, service is currently unavailable in ${result.city}.`;
    } else if (!result.valid && result.message) {
        finalMessage = result.message;
    } else if (!result.valid) {
        finalMessage = "Invalid Pincode entered.";
    }

    setValidationResult({
      ...result, // Spread the result from the hook
      message: finalMessage, // Override message based on service availability
    });

    // Trigger callback if serviceable
    if (result.isServiceAvailable && onServiceable) {
        // We don't close the dialog here automatically, the callback (e.g., navigate) will handle the flow
        onServiceable();
    }
  };

  const handlePinCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string or only digits up to 6 characters
    if (value === '' || (/^\d+$/.test(value) && value.length <= 6)) {
      setPinCode(value);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Reset state when closing the dialog
      setPinCode("");
      setValidationResult(null);
    }
  }

  const renderStatusMessage = () => {
    if (isValidating) {
      return (
        <div className="flex items-center p-3 rounded-md text-sm mt-4 bg-blue-900/30 text-blue-300">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span>Checking availability...</span>
        </div>
      );
    }

    if (validationResult) {
      const isAvailable = validationResult.isServiceAvailable ?? false;
      const isValid = validationResult.valid;

      return (
        <div className={`flex items-center p-3 rounded-md text-sm mt-4 ${
              isAvailable
                ? 'bg-green-900/30 text-green-300'
                : isValid // Only show unavailable message if the PIN was valid but city isn't serviceable
                ? 'bg-red-900/30 text-red-300'
                : 'bg-yellow-900/30 text-yellow-300' // Invalid PIN message
            }`}
        >
          {isAvailable ? <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" /> :
           isValid ? <X className="h-4 w-4 mr-2 flex-shrink-0" /> : // Use X icon for valid but unavailable
           <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" /> } {/* Use AlertTriangle for invalid PIN */}
          {/* Display the message generated in handleValidation */}
          <span>{validationResult.message}</span>
        </div>
      );
    }

    // Show prompt if pincode is entered but incomplete
    if (pinCode.length > 0 && pinCode.length < 6) {
        return (
            <div className="flex items-center p-3 rounded-md text-sm mt-4 bg-gray-700/30 text-gray-400">
                <span>Please enter a 6-digit pincode.</span>
            </div>
        );
    }

    return null; // No message otherwise
  };


  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {/* Use props for button appearance */}
        <Button variant={triggerButtonVariant} className={triggerButtonClassName}>
           {/* Conditionally render MapPin only if text is default */}
           {triggerButtonText === "Check Service Area" && <MapPin className="mr-2 h-4 w-4" />}
           {triggerButtonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-[#1a1b1e] border-gray-700 text-white">
         <DialogHeader>
           <DialogTitle className="text-white">Check Service Availability</DialogTitle>
           <DialogDescription className="text-gray-400">
             Enter your 6-digit pincode below. We'll automatically check if service is available.
           </DialogDescription>
         </DialogHeader>
        <div className="grid gap-4 pt-4 pb-2">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="pincode-check-modal" className="text-right text-gray-300">
              Pincode
            </Label>
             <Input
               id="pincode-check-modal"
               value={pinCode}
               onChange={handlePinCodeChange}
               placeholder="Enter 6 digits"
               className="col-span-3 bg-[#0f1115] border-gray-600 text-white focus:border-[#2f3555] focus:ring-[#2f3555]"
               maxLength={6}
               type="tel"
               inputMode="numeric"
               disabled={isValidating}
             />
          </div>
        </div>
        {renderStatusMessage()}
        <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => handleOpenChange(false)} className="bg-[#2a2d36] hover:bg-[#3f4354] border-[#3f4354] text-white">Close</Button>
             {/* Optional: Add manual check button if needed, though debounce handles it */}
             {/* <Button onClick={() => handleValidation(pinCode)} disabled={isValidating || pinCode.length !== 6}>Check</Button> */}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}