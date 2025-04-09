// src/hooks/useProfile.ts
import { useState, useEffect } from 'react';
import { 
  getCachedUserProfile, 
  createCachedUserProfile, 
  updateCachedUserProfile, 
  deleteCachedUserProfile 
} from '../../../pages/Profile/cachedUserProfile';

/**
 * React hook for managing user profile with caching
 * 
 * @param userId - Optional user ID. If not provided, current user is assumed
 * @returns An object containing profile data and operations
 */
export function useProfile(userId?: string) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<any>(null);

  // Fetch the profile on hook initialization
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const profileData = await getCachedUserProfile(userId);
        setProfile(profileData);
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  /**
   * Create a new profile and update the local state
   * 
   * @param profileData - The profile data to create
   * @returns The created profile
   */
  const createProfile = async (profileData = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!userId) {
        throw new Error("User ID is required to create a profile");
      }
      
      const created = await createCachedUserProfile(userId, profileData);
      setProfile(created);
      return created;
    } catch (err) {
      console.error("Error creating profile:", err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update the profile and update the local state
   * 
   * @param data - The data to update
   * @returns The updated profile
   */
  const updateProfile = async (data: Record<string, any>) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!profile?.$id) {
        throw new Error("No profile found to update");
      }
      
      const updated = await updateCachedUserProfile(profile.$id, data);
      setProfile(updated);
      return updated;
    } catch (err) {
      console.error("Error updating profile:", err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete the profile and clear the local state
   * 
   * @returns The result of the delete operation
   */
  const deleteProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!profile?.$id) {
        throw new Error("No profile found to delete");
      }
      
      const result = await deleteCachedUserProfile(profile.$id);
      setProfile(null);
      return result;
    } catch (err) {
      console.error("Error deleting profile:", err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Force refresh the profile from the server
   * 
   * @returns The refreshed profile
   */
  const refreshProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const refreshed = await getCachedUserProfile(userId, true); // Force refresh
      setProfile(refreshed);
      return refreshed;
    } catch (err) {
      console.error("Error refreshing profile:", err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    profile,
    loading,
    error,
    createProfile,
    updateProfile,
    deleteProfile,
    refreshProfile
  };
}