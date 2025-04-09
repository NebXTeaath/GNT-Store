//src/context/DiscountContext.tsx
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { toast } from "sonner";
import { functions } from '@/lib/appwrite';

// Environment variable for function endpoints
const DISCOUNT_ORDER_FUNCTION = import.meta.env.VITE_APPWRITE_DISCOUNT_AND_ORDER_FUNCTION;

interface DiscountResponse {
  isValid: boolean;
  discountCode: string;
  rate: number;
  type: string;
  calculatedDiscountAmount: number;
  message?: string;
}

interface DiscountContextType {
  discountCode: string;
  discountRate: number;
  discountType: string;
  calculatedDiscountAmount: number;
  applyDiscount: (discountCode: string, cartSubtotal: number) => Promise<boolean>;
  removeDiscount: () => void;
  isValidatingDiscount: boolean;
}

const DiscountContext = createContext<DiscountContextType | undefined>(undefined);

export const useDiscount = () => {
  const context = useContext(DiscountContext);
  if (context === undefined) {
    throw new Error('useDiscount must be used within a DiscountProvider');
  }
  return context;
};

interface DiscountProviderProps {
  children: ReactNode;
  userId: string;
}

export const DiscountProvider: React.FC<DiscountProviderProps> = ({ children, userId }) => {
  const [discountCode, setDiscountCode] = useState<string>('');
  const [discountRate, setDiscountRate] = useState<number>(0);
  const [discountType, setDiscountType] = useState<string>('');
  const [calculatedDiscountAmount, setCalculatedDiscountAmount] = useState<number>(0);
  const [isValidatingDiscount, setIsValidatingDiscount] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);
  
  // Set isReady after initial render
  useEffect(() => {
    // Short timeout to ensure any auth state changes have propagated
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);
  
  // Clear discount data when userId changes
  useEffect(() => {
    // Only run this effect after the component is ready
    if (isReady) {
      if (!userId) {
        // If userId becomes empty, clear discount data
        removeDiscount();
        console.log("DiscountProvider: userId is empty, discounts cleared");
      } else {
        console.log("DiscountProvider: userId is available:", userId);
      }
    }
  }, [userId, isReady]);
  
  // Validate discount code via Appwrite Function
  const applyDiscount = async (discountCode: string, cartSubtotal: number): Promise<boolean> => {
    setIsValidatingDiscount(true);
    
    // Check if we have a userId
    if (!userId) {
      console.error("Cannot validate discount: userId is undefined or empty");
      toast.error("Authentication Required", {
        description: "Please log in to apply a discount code."
      });
      setIsValidatingDiscount(false);
      return false;
    }
    
    try {
      const payload = {
        discountCode: discountCode,
        userId: userId,
        cartSubtotal: cartSubtotal
      };
      
      console.log("Sending discount validation request:", payload);
      
      // Use the new combined function with the 'validate' operation
      const execution = await functions.createExecution(
        DISCOUNT_ORDER_FUNCTION,
        JSON.stringify(payload),
        false, // execute asynchronously
        undefined, // custom headers
        undefined, // custom ID
        { operation: 'validate' } // query params - specify operation
      );
    
      // Log full execution response for debugging
      console.log("Discount validation execution response:", execution);
      
      if (execution.status === 'completed') {
        try {
          const response: DiscountResponse = JSON.parse(execution.responseBody);
          console.log("Parsed discount response:", response);
          
          if (response.isValid) {
            // Update discount context state
            setDiscountCode(response.discountCode);
            setDiscountRate(response.rate);
            setDiscountType(response.type);
            setCalculatedDiscountAmount(response.calculatedDiscountAmount);
            
            toast.success("Discount applied!", {
              description: response.message || "Discount has been applied to your order."
            });
            
            setIsValidatingDiscount(false);
            return true;
          } else {
            console.log("Discount validation failed with message:", response.message);
            toast.error("Discount code invalid", {
              description: response.message || "The discount code you entered is not valid."
            });
            
            setIsValidatingDiscount(false);
            return false;
          }
        } catch (parseError) {
          console.error("Error parsing discount validation response:", parseError, "Raw response:", execution.responseBody);
          throw new Error(`Invalid response format: ${(parseError as Error).message}`);
        }
      } else {
        const errorDetails = {
          status: execution.status,
          responseStatusCode: execution.responseStatusCode,
          errors: execution.errors || 'No error output available',
          functionId: execution.functionId,
          duration: execution.duration,
          responseBody: execution.responseBody || 'No response body'
        };
        
        console.error("Discount validation function failed:", errorDetails);
        throw new Error(execution.errors || `Discount validation function failed with status: ${execution.status}`);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error("Error validating discount code:", error);
      console.error("Error details:", { message: errorMessage, stack: error instanceof Error ? error.stack : 'No stack available' });
      
      toast.error("Error", {
        description: "Could not validate discount code. Please try again."
      });
      setIsValidatingDiscount(false);
      return false;
    }
  };
  
  const removeDiscount = () => {
    setDiscountCode('');
    setDiscountRate(0);
    setDiscountType('');
    setCalculatedDiscountAmount(0);
  };

  return (
    <DiscountContext.Provider
      value={{
        discountCode,
        discountRate,
        discountType,
        calculatedDiscountAmount,
        applyDiscount,
        removeDiscount,
        isValidatingDiscount
      }}
    >
      {children}
    </DiscountContext.Provider>
  );
};