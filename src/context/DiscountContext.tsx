// src/context/DiscountContext.tsx
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { toast } from "sonner";
import { supabase } from '@/lib/supabase'; // Use Supabase client
import { useAuth } from './AuthContext'; // Use Supabase Auth

interface DiscountResponse { isValid: boolean; discountCode?: string; rate?: number; type?: string; calculatedDiscountAmount?: number; message?: string; }
interface DiscountContextType { discountCode: string; discountRate: number; discountType: string; calculatedDiscountAmount: number; applyDiscount: (code: string, subtotal: number) => Promise<boolean>; removeDiscount: () => void; isValidatingDiscount: boolean; }

const DiscountContext = createContext<DiscountContextType | undefined>(undefined);
export const useDiscount = () => { const context = useContext(DiscountContext); if (context === undefined) throw new Error('useDiscount must be used within a DiscountProvider'); return context; };

interface DiscountProviderProps { children: ReactNode; } // Removed userId prop

export const DiscountProvider: React.FC<DiscountProviderProps> = ({ children }) => {
    const [discountCode, setDiscountCode] = useState<string>('');
    const [discountRate, setDiscountRate] = useState<number>(0);
    const [discountType, setDiscountType] = useState<string>('');
    const [calculatedDiscountAmount, setCalculatedDiscountAmount] = useState<number>(0);
    const [isValidatingDiscount, setIsValidatingDiscount] = useState<boolean>(false);
    const { user } = useAuth(); // Use Supabase Auth state

    // Clear discount on user change (login/logout)
    const removeDiscount = useCallback(() => { setDiscountCode(''); setDiscountRate(0); setDiscountType(''); setCalculatedDiscountAmount(0); }, []);
    useEffect(() => { removeDiscount(); }, [user, removeDiscount]);

    const applyDiscount = useCallback(async (codeToValidate: string, cartSubtotal: number): Promise<boolean> => {
        if (!user) { toast.error("Please log in to apply discounts.", { id: "disc-auth-err" }); return false; }
        if (cartSubtotal <= 0) { toast.error("Add items to cart first.", { id: "disc-empty-err" }); return false; }
        setIsValidatingDiscount(true);
        try {
            const payload = { discountCode: codeToValidate, cartSubtotal: cartSubtotal };
            // Invoke the Supabase function - auth token is automatically handled
            const { data, error } = await supabase.functions.invoke<DiscountResponse>('validate-discount', { method: 'POST', body: payload });

            if (error) { throw new Error(error.message || 'Validation request failed'); }
            if (!data) { throw new Error('No response data received from validation function'); }

            if (data.isValid) {
                setDiscountCode(data.discountCode || ''); setDiscountRate(data.rate || 0); setDiscountType(data.type || ''); setCalculatedDiscountAmount(data.calculatedDiscountAmount || 0);
                toast.success(data.message || "Discount applied!", { id: `disc-ok-${data.discountCode}` });
                return true;
            } else {
                removeDiscount(); toast.error(data.message || "Invalid discount code.", { id: "disc-invalid" }); return false;
            }
        } catch (error: any) { removeDiscount(); console.error("Discount validation error:", error); toast.error("Could not validate code", { id: "disc-fetch-err", description: error.message }); return false; }
        finally { setIsValidatingDiscount(false); }
    }, [user, removeDiscount]); // Depends on user now

    return ( <DiscountContext.Provider value={{ discountCode, discountRate, discountType, calculatedDiscountAmount, applyDiscount, removeDiscount, isValidatingDiscount }}> {children} </DiscountContext.Provider> );
};