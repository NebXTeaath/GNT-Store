// src/context/DiscountContext.tsx
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { toast } from "sonner";
import { supabase } from '@/lib/supabase'; // Use Supabase client
import { useAuth } from './AuthContext'; // Use Supabase Auth
import { AlertCircle } from 'lucide-react'; // Import icon for error toast
// Import specific error type from supabase-js
import { FunctionsHttpError, FunctionsRelayError, FunctionsFetchError } from '@supabase/supabase-js';

interface DiscountResponse {
    isValid: boolean;
    discountCode?: string;
    rate?: number;
    type?: string;
    calculatedDiscountAmount?: number;
    message?: string; // Message from the backend
}

interface DiscountContextType {
    discountCode: string;
    discountRate: number;
    discountType: string;
    calculatedDiscountAmount: number;
    applyDiscount: (code: string, subtotal: number) => Promise<boolean>;
    removeDiscount: () => void;
    isValidatingDiscount: boolean;
}

const DiscountContext = createContext<DiscountContextType | undefined>(undefined);

export const useDiscount = () => {
    const context = useContext(DiscountContext);
    if (context === undefined) throw new Error('useDiscount must be used within a DiscountProvider');
    return context;
};

interface DiscountProviderProps {
    children: ReactNode;
}

export const DiscountProvider: React.FC<DiscountProviderProps> = ({ children }) => {
    const [discountCode, setDiscountCode] = useState<string>('');
    const [discountRate, setDiscountRate] = useState<number>(0);
    const [discountType, setDiscountType] = useState<string>('');
    const [calculatedDiscountAmount, setCalculatedDiscountAmount] = useState<number>(0);
    const [isValidatingDiscount, setIsValidatingDiscount] = useState<boolean>(false);
    const { user } = useAuth();

    const removeDiscount = useCallback(() => {
        setDiscountCode('');
        setDiscountRate(0);
        setDiscountType('');
        setCalculatedDiscountAmount(0);
    }, []);

    useEffect(() => {
        removeDiscount();
    }, [user, removeDiscount]);

    const applyDiscount = useCallback(async (codeToValidate: string, cartSubtotal: number): Promise<boolean> => {
        // Initial checks (no change needed)
        if (!user) { toast.error("Please log in to apply discounts.", { id: "disc-auth-err" }); return false; }
        if (cartSubtotal <= 0) { toast.error("Add items to cart first.", { id: "disc-empty-err" }); return false; }

        setIsValidatingDiscount(true);
        console.log(`[applyDiscount] Validating code: ${codeToValidate} for subtotal: ${cartSubtotal}`);

        // Default error message if specific one cannot be extracted
        let displayErrorMessage = "An unknown error occurred. Please try again.";

        try {
            const payload = { discountCode: codeToValidate, cartSubtotal: cartSubtotal };
            console.log('[applyDiscount] Sending Payload:', JSON.stringify(payload));

            const { data, error } = await supabase.functions.invoke<DiscountResponse>(
                'validate-discount',
                { method: 'POST', body: payload }
            );

            console.log('[applyDiscount] Received Response - Data:', data, 'Error:', error);

            // --- Handle Invocation Errors ---
            if (error) {
                 // Check if it's an HTTP error (non-2xx response from the function)
                 if (error instanceof FunctionsHttpError) {
                     console.error(`[applyDiscount] Function returned non-2xx status: ${error.context.status}`);
                     try {
                         // Attempt to parse the error response body from the function
                         const errorBody = await error.context.json();
                         // Prioritize the 'message' field from the function's JSON response
                         displayErrorMessage = errorBody?.message || `The server returned an error (Status: ${error.context.status}). Please try again.`;
                         console.error('[applyDiscount] Parsed Function Error Body:', errorBody);
                     } catch (parseError) {
                         // If parsing the error body fails, use a slightly better generic client message
                         displayErrorMessage = `Communication error with the server (Status: ${error.context.status}). Please check your connection or try again later.`;
                         console.error('[applyDiscount] Failed to parse function error response:', parseError);
                     }
                 } else if (error instanceof FunctionsRelayError || error instanceof FunctionsFetchError) {
                     // Network or other connection errors
                     displayErrorMessage = "Network error. Please check your connection and try again.";
                     console.error('[applyDiscount] Network/Fetch Error:', error);
                 } else {
                    // Other unknown invocation errors
                    displayErrorMessage = error.message || 'Validation request failed due to an unknown reason.';
                    console.error('[applyDiscount] Unknown Invocation Error:', error);
                 }
                 // Trigger the catch block with the determined error message
                 throw new Error(displayErrorMessage);
            }
            // --- End Invocation Error Handling ---

            // Handle case where invocation succeeded (2xx) but no data was returned
            if (!data) {
                throw new Error('Received an empty response from the server.');
            }

            // --- Process Successful Invocation (2xx status, data exists) ---
            if (data.isValid) {
                // Success case (isValid=true)
                setDiscountCode(data.discountCode || '');
                setDiscountRate(data.rate || 0);
                setDiscountType(data.type || '');
                setCalculatedDiscountAmount(data.calculatedDiscountAmount || 0);
                toast.success(data.message || "Discount applied!", { id: `disc-ok-${data.discountCode}` });
                setIsValidatingDiscount(false); // Ensure loading stops on success
                return true; // Exit successfully
            } else {
                // Business Logic Failure case (isValid=false, but 200 OK response)
                removeDiscount();
                const failureReason = data.message || "Invalid or inapplicable discount code.";
                toast.error("Discount Error", {
                    id: `disc-invalid-${codeToValidate}`,
                    description: failureReason,
                    icon: <AlertCircle className="h-5 w-5" />,
                });
                setIsValidatingDiscount(false); // Ensure loading stops on validation failure
                return false; // Exit indicating validation failed
            }
        } catch (error: any) {
            // Catch errors thrown from the try block (invocation errors OR !data error)
            removeDiscount();
            // The error.message here should now be the more specific one we prepared
            console.error("Discount validation error (final catch block):", error);
            toast.error("Could Not Apply Discount", {
                id: "disc-apply-err",
                description: error.message, // Use the refined message
                icon: <AlertCircle className="h-5 w-5" />,
            });
            setIsValidatingDiscount(false); // Ensure loading stops on caught error
            return false; // Exit indicating an error occurred
        }
        // Remove the finally block as it's handled within try/catch branches now
        // finally {
        //     setIsValidatingDiscount(false);
        //     console.log("[applyDiscount] Validation process finished.");
        // }
    }, [user, removeDiscount]); // Keep dependencies as they were

    return (
        <DiscountContext.Provider value={{
            discountCode,
            discountRate,
            discountType,
            calculatedDiscountAmount,
            applyDiscount,
            removeDiscount,
            isValidatingDiscount
        }}>
            {children}
        </DiscountContext.Provider>
    );
};