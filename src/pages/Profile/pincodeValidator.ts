import { useState } from "react";

interface PincodeValidatorHook {
  isValidating: boolean;
  validatePincode: (pincode: string) => Promise<{
    valid: boolean;
    city?: string;
    state?: string;
    message?: string;
    isServiceAvailable: boolean; // Added this property
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

// List of serviceable PIN code prefixes
const SERVICEABLE_PIN_PREFIXES = [
  // Major cities - examples only, adjust as needed
  "110", // Delhi
  "400", // Mumbai
  "560", // Bangalore
  "600", // Chennai
  "700", // Kolkata
  "500", // Hyderabad
  "411", // Pune
  "380", // Ahmedabad
  // Add more serviceable PIN prefixes as needed
];

export function usePincodeValidator(): PincodeValidatorHook {
  const [isValidating, setIsValidating] = useState(false);

  const validatePincode = async (pincode: string): Promise<{
    valid: boolean;
    city?: string;
    state?: string;
    message?: string;
    isServiceAvailable: boolean;
  }> => {
    // Check if pincode is 6 digits
    if (!/^\d{6}$/.test(pincode)) {
      return {
        valid: false,
        isServiceAvailable: false,
        message: "Pincode must be exactly 6 digits"
      };
    }

    setIsValidating(true);

    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data: PincodeResponse[] = await response.json();

      if (!data || !data[0]) {
        throw new Error("Invalid response from pincode API");
      }

      if (data[0].Status === "Success" && data[0].PostOffice && data[0].PostOffice.length > 0) {
        const postOffice = data[0].PostOffice[0];
        
        // Check if PIN is in serviceable area by checking the prefix
        const pinPrefix = pincode.substring(0, 3);
        const isServiceable = SERVICEABLE_PIN_PREFIXES.includes(pinPrefix);
        
        return {
          valid: true,
          isServiceAvailable: isServiceable,
          city: postOffice.District,
          state: postOffice.State,
          message: isServiceable 
            ? "Pincode validated successfully" 
            : "We don't currently service this area. Please contact support for more information."
        };
      } else {
        return {
          valid: false,
          isServiceAvailable: false,
          message: data[0].Message || "Invalid pincode"
        };
      }
    } catch (error) {
      console.error("Error validating pincode:", error);
      return {
        valid: false,
        isServiceAvailable: false,
        message: "Error validating pincode. Please try again."
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