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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin, CheckCircle, X, AlertTriangle } from "lucide-react";
import { usePincodeValidator } from "@/pages/Profile/pincodeValidator"; // Adjust path if needed
import { useDebounce } from "@/components/global/hooks/use-debounce"; // Adjust path if needed

type ValidationResultState = {
  valid: boolean;
  city?: string;
  message?: string;
  isServiceAvailable?: boolean;
} | null;

// --- Read and process serviceable areas from .env ---
const rawServiceableAreas = import.meta.env.VITE_SERVICEABLE_AREAS || "";
const serviceAvailableAreas = rawServiceableAreas
  .split(',')
  // Add type annotation here: (area: string)
  .map((area: string) => area.trim().toLowerCase())
  .filter(Boolean);

// --- End reading from .env ---


export default function CheckServiceAvailability() {
  const [isOpen, setIsOpen] = useState(false);
  const [pinCode, setPinCode] = useState("");
  const [validationResult, setValidationResult] = useState<ValidationResultState>(null);
  const { isValidating, validatePincode } = usePincodeValidator();
  const debouncedPinCode = useDebounce(pinCode, 500);

  useEffect(() => {
    if (debouncedPinCode.length === 6) {
      handleValidation(debouncedPinCode);
    } else {
      setValidationResult(null);
    }
  }, [debouncedPinCode]);

  const handleValidation = async (codeToValidate: string) => {
    const result = await validatePincode(codeToValidate);

    let isServiceAvailable = false;
    let finalMessage = result.message || "Validation failed.";

    if (result.valid && result.city) {
      const normalizedCity = result.city.toLowerCase().trim();
      // --- Use the serviceAvailableAreas array derived from .env ---
      // Add type annotation here: (area: string)
      isServiceAvailable = serviceAvailableAreas.some((area: string) =>
        normalizedCity === area || normalizedCity.includes(area)
      );
      // --- End usage change ---

      finalMessage = isServiceAvailable
        ? `Great! Service is available in ${result.city}.`
        : `Sorry, service is currently unavailable in ${result.city}.`;
    } else if (!result.valid && result.message) {
        finalMessage = result.message;
        isServiceAvailable = false;
    } else if (!result.valid) {
        finalMessage = "Invalid Pincode entered.";
        isServiceAvailable = false;
    }


    setValidationResult({
      ...result,
      isServiceAvailable,
      message: finalMessage,
    });
  };

  const handlePinCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || (/^\d+$/.test(value) && value.length <= 6)) {
      setPinCode(value);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
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
                : isValid
                ? 'bg-red-900/30 text-red-300'
                : 'bg-yellow-900/30 text-yellow-300'
            }`}
        >
          {isAvailable ? <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" /> :
           isValid ? <X className="h-4 w-4 mr-2 flex-shrink-0" /> :
           <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" /> }
          <span>{validationResult.message}</span>
        </div>
      );
    }

    if (pinCode.length > 0 && pinCode.length < 6) {
        return (
            <div className="flex items-center p-3 rounded-md text-sm mt-4 bg-gray-700/30 text-gray-400">
                <span>Please enter a 6-digit pincode.</span>
            </div>
        );
    }

    return null;
  };


  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-[#dbdee2] border-gray-600 hover:bg-[#2f3555] hover:text-white text-gray-900">
          <MapPin className="mr-2 h-4 w-4" />
          Check Service Area
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
            <Label htmlFor="pincode-check" className="text-right text-gray-300">
              Pincode
            </Label>
            <Input
              id="pincode-check"
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
      </DialogContent>
    </Dialog>
  );
}