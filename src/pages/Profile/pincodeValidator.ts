//src\pages\Profile\pincodeValidator.ts
import { useState } from "react";

interface PincodeValidatorHook {
  isValidating: boolean;
  validatePincode: (pincode: string) => Promise<{
    valid: boolean;
    city?: string;
    state?: string;
    message?: string;
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
  }> => {
    // Check if pincode is 6 digits
    if (!/^\d{6}$/.test(pincode)) {
      return {
        valid: false,
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
        return {
          valid: true,
          city: postOffice.District,
          state: postOffice.State,
          message: "Pincode validated successfully"
        };
      } else {
        return {
          valid: false,
          message: data[0].Message || "Invalid pincode"
        };
      }
    } catch (error) {
      console.error("Error validating pincode:", error);
      return {
        valid: false,
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
