// src/pages/Profile/pincodeValidator.ts
import { useState } from "react";

// --- Read and process serviceable areas from .env ---
const rawServiceableAreas = import.meta.env.VITE_SERVICEABLE_AREAS || "";
const serviceAvailableAreas = rawServiceableAreas
  .split(',')
  .map((area: string) => area.trim().toLowerCase()) // Ensure lowercase for comparison
  .filter(Boolean);
// --- End reading from .env ---


interface PincodeValidatorHook {
  isValidating: boolean;
  validatePincode: (pincode: string) => Promise<{
    valid: boolean;
    city?: string;
    state?: string;
    message?: string;
    isServiceAvailable?: boolean; // <<< ADDED
  }>;
}

interface PincodeResponse {
  Message: string;
  Status: string;
  PostOffice?: Array<{
    Name: string;
    District: string;
    State: string;
  }>;
}

export function usePincodeValidator(): PincodeValidatorHook {
  const [isValidating, setIsValidating] = useState(false);

  const validatePincode = async (pincode: string): Promise<{
    valid: boolean;
    city?: string;
    state?: string;
    message?: string;
    isServiceAvailable?: boolean; // <<< ADDED
  }> => {
    // Check if pincode is 6 digits
    if (!/^\d{6}$/.test(pincode)) {
      return {
        valid: false,
        message: "Pincode must be exactly 6 digits",
        isServiceAvailable: false, // <<< ADDED default
      };
    }

    setIsValidating(true);

    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data: PincodeResponse[] = await response.json();

      if (!data || !data[0]) {
        throw new Error("Invalid response from pincode API");
      }

      let isServiceAvailableInCity = false;
      let resultCity: string | undefined = undefined;
      let resultState: string | undefined = undefined;

      if (data[0].Status === "Success" && data[0].PostOffice && data[0].PostOffice.length > 0) {
        const postOffice = data[0].PostOffice[0];
        resultCity = postOffice.District;
        resultState = postOffice.State;
        const normalizedCity = resultCity.toLowerCase().trim();

        // Check if the city is in the serviceable areas list
        isServiceAvailableInCity = serviceAvailableAreas.some((area: string) =>
          normalizedCity === area || normalizedCity.includes(area) // Allow partial matches if needed, exact match preferred
        );

        return {
          valid: true,
          city: resultCity,
          state: resultState,
          message: "Pincode validated successfully",
          isServiceAvailable: isServiceAvailableInCity, // <<< ADDED result
        };
      } else {
        return {
          valid: false,
          message: data[0].Message || "Invalid pincode",
          isServiceAvailable: false, // <<< ADDED default
        };
      }
    } catch (error) {
      console.error("Error validating pincode:", error);
      return {
        valid: false,
        message: "Error validating pincode. Please try again.",
        isServiceAvailable: false, // <<< ADDED default
      };
    } finally {
      setIsValidating(false);
    }
  };

  return {
    isValidating,
    validatePincode
  };
}