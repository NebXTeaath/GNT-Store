// src/context/UserProfileContext.tsx
import React, { createContext, useContext } from "react";

// This context might no longer be strictly necessary if components directly use
// the TanStack Query hooks (useUserProfileQuery, useCreateProfileMutation, etc.)
// Keep it if other parts of your app rely on its existence, or remove it if redundant.

interface UserProfileContextType {
    // Define any shared utility functions or context values if needed.
    // For now, keeping it minimal.
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export const useUserProfileContext = () => { // Renamed hook
    return useContext(UserProfileContext); // Allow context to be potentially undefined
};

export const UserProfileProvider = ({ children }: { children: React.ReactNode }) => {
    // No state or data fetching logic here anymore.
    const value = {}; // Provide an empty object or specific utilities

    return (
        <UserProfileContext.Provider value={value}>
            {children}
        </UserProfileContext.Provider>
    );
};