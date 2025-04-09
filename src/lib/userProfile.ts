// src/lib/userProfile.ts
import { account, functions } from './appwrite';

// Define the function ID for the access control function
const ACCESS_CONTROL_FUNCTION_ID = import.meta.env.VITE_APPWRITE_ACCESS_CONTROL_FUNCTION_ID;

/**
 * Executes the access control function with the specified operation and parameters.
 *
 * @param operation - The operation to perform (read, create, update, delete)
 * @param documentId - Optional document ID for operations that require it
 * @param data - Optional data for create/update operations
 * @returns The response from the access control function
 */
export async function debugFunctionResponse() {
  try {
    const user = await account.get();
    if (!user?.$id) throw new Error('User not authenticated');
    
    const payload = { userId: user.$id, operation: 'read' };
    const execution = await functions.createExecution(
      ACCESS_CONTROL_FUNCTION_ID,
      JSON.stringify(payload),
      false // Synchronous
    );

    console.log('Debug execution:', execution);
    return JSON.parse(execution.responseBody);
  } catch (error) {
    console.error('Debug error:', error);
    throw error;
  }
}

async function executeAccessControlFunction(operation: string, documentId?: string, data?: any) {
  try {
    const user = await account.get();
    if (!user?.$id) throw new Error('User not authenticated');

    const payload: any = { userId: user.$id, operation };
    if (documentId) payload.documentId = documentId;
    if (data) payload.data = data;

    const execution = await functions.createExecution(
      ACCESS_CONTROL_FUNCTION_ID,
      JSON.stringify(payload),
      false // Synchronous execution
    );

    console.log('Execution raw response:', execution);

    if (execution.status !== 'completed') {
      throw new Error(`Function failed: ${execution.status}`);
    }

    if (!execution.responseBody) {
      throw new Error('Empty response body from function');
    }

    const parsed = JSON.parse(execution.responseBody);
    if (!parsed.success) {
      throw new Error(parsed.message || 'Access control denied');
    }

    return parsed.data;
  } catch (error) {
    console.error(`${operation} operation error:`, error);
    throw error;
  }
}

/**
 * Retrieves a user profile document based on the provided user ID.
 * Uses the access control function to enforce security rules.
 *
 * @param userId - The unique user ID from Appwrite's account service.
 * @returns The first matching user profile document or null if not found.
 */
export async function getUserProfile(userId: string): Promise<any> {
  try {
    // Use the access control function to list documents
    const response = await executeAccessControlFunction('read');
    console.log("READ RESPONSE:", response);
    
    // If a matching document is found, return it
    if (response && response.documents && response.documents.length > 0) {
      return response.documents[0];
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw error;
  }
}

/**
 * Interface defining the profile data structure used in creating a user profile document.
 */
interface ProfileData {
  name?: string;      // Full Name (max 128 chars)
  email?: string;     // Email Address (max 256 chars)
  addressLine1?: string;   // Street Address (max 256 chars
  addressLine2?: string;   // Street Address (max 256 chars)
  city?: string;      // City (max 128 chars)
  state?: string;     // State/Province (max 128 chars)
  country?: string;   // Country (max 128 chars)
  pincode?: string;   // ZIP/Postal Code (max 16 chars)
  mobile?: string;    // Mobile (max 20 chars)
}

/**
 * Creates a new user profile document in the Appwrite database.
 * Uses the access control function to enforce security rules.
 *
 * @param userId - The unique Appwrite user ID.
 * @param profileData - An object containing profile fields to store.
 * @returns The newly created user profile document.
 */
export async function createUserProfile(userId: string, profileData: ProfileData = {}): Promise<any> {
  try {
    // Prepare data for the access control function
    const data = {
      name: profileData.name || '',
      email: profileData.email || '',
      addressLine1: profileData.addressLine1 || '',
      addressLine2: profileData.addressLine2 || '',
      city: profileData.city || '',
      state: profileData.state || '',
      country: profileData.country || '',
      pincode: profileData.pincode || '',
      mobile: profileData.mobile || ''
    };
    // Use the access control function to create the document
    const response = await executeAccessControlFunction('create', undefined, data);
    return response;
  } catch (error) {
    console.error("Error creating user profile:", error);
    throw error;
  }
}

/**
 * Updates an existing user profile document with new data.
 * Uses the access control function to enforce security rules.
 *
 * @param documentId - The document ID of the existing user profile.
 * @param data - An object containing key-value pairs for fields to update.
 * @returns The updated user profile document.
 */
export async function updateUserProfile(documentId: string, data: Record<string, any>): Promise<any> {
  try {
    // Use the access control function to update the document
    const response = await executeAccessControlFunction('update', documentId, data);
    return response;
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
}

/**
 * Deletes a user profile document.
 * Uses the access control function to enforce security rules.
 *
 * @param documentId - The document ID of the user profile to delete.
 * @returns A success message if deletion was successful.
 */
export async function deleteUserProfile(documentId: string): Promise<any> {
  try {
    // Use the access control function to delete the document
    const response = await executeAccessControlFunction('delete', documentId);
    return response;
  } catch (error) {
    console.error("Error deleting user profile:", error);
    throw error;
  }
}
