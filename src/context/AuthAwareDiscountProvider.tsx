import React from 'react';
import { useAuth } from './AuthContext';
import { DiscountProvider } from './DiscountContext';

interface AuthAwareDiscountProviderProps {
  children: React.ReactNode;
}

export const AuthAwareDiscountProvider: React.FC<AuthAwareDiscountProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  
  // Get userId safely
  const userId = user && user.$id ? user.$id : '';
  
  // Log information about the current auth state
  React.useEffect(() => {
    console.log("AuthAwareDiscountProvider:", { 
      isAuthenticated, 
      hasUser: !!user, 
      userId: userId || 'not available'
    });
  }, [isAuthenticated, user, userId]);

  return (
    <DiscountProvider userId={userId}>
      {children}
    </DiscountProvider>
  );
};