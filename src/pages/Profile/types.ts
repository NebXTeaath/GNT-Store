// src/pages/Profile/types.ts
/**
 * Profile-related types and interfaces used throughout the application
 */

// Address structure used in profile data
export interface ProfileAddress {
    line1: string;
    line2: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  }

  export interface FormattedUserProfile {
    userId: string;
    name: string;
    email: string;
    phone: string;
    address: ProfileAddress;
    profileDocId?: string;
  }
  
  
  // The standard user profile format used by UI components
  export interface UserProfile {
    userId: string;
    name: string;
    email: string;
    phone: string;
    address: ProfileAddress;
    profileDocId?: string;
    [key: string]: any; // Add index signature to allow bracket notation access
  }
  
  // Raw profile data structure from API
  export interface RawProfileData {
    $id?: string;
    userId?: string;
    name?: string;
    email?: string;
    mobile?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
    [key: string]: any;
  }
  
  // Profile data structure for creating/updating profiles
  export interface ProfileData {
    name: string;
    email: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
    mobile: string;
    userId: string;
  }
  
  // Pincode validation result structure
  export interface PincodeValidationResult {
    valid: boolean;
    city?: string;
    state?: string;
    message?: string;
  }
  