import React from 'react';
import { useAuth } from './AuthContext';
import { DiscountProvider } from './DiscountContext';

interface AuthAwareDiscountProviderProps {
  children: React.ReactNode;
}

export const AuthAwareDiscountProvider: React.FC<AuthAwareDiscountProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  // FIX: Use user.id instead of user.$id
  const userId = user?.id || ''; // Get userId safely

  // Log information about the current auth state
  React.useEffect(() => {
    console.log("AuthAwareDiscountProvider:", {
      isAuthenticated,
      hasUser: !!user,
      userId: userId || 'not available'
    });
  }, [isAuthenticated, user, userId]);

  // FIX: Remove the userId prop from DiscountProvider
  // The DiscountProvider now fetches the userId internally using useAuth.
  return (
    <DiscountProvider>
      {children}
    </DiscountProvider>
  );
};