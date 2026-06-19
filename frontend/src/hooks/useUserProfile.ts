import { useState, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const useUserProfile = () => {
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const refreshUserProfile = useCallback(async () => {
    if (!user?.id || !user?.role) return;

    setLoading(true);
    try {
      let endpoint = '';
      switch (user.role) {
        case 'patient':
          endpoint = `patients/${user.id}`;
          break;
        case 'doctor':
          endpoint = `therapeutes/${user.id}`;
          break;
        case 'clinic':
          endpoint = `cliniques/${user.id}`;
          break;
        default:
          throw new Error('Invalid user role');
      }

      const response = await fetch(`${API_URL}/${endpoint}`);
      if (!response.ok) throw new Error('Failed to fetch profile');

      const profileData = await response.json();
      
      // Update user in store with new profile picture URL
      setUser({
        ...user,
        profile_picture: profileData.profile_picture,
        profile_picture_url: profileData.profile_picture_url,
      });

    } catch (error) {
      console.error('Error refreshing user profile:', error);
    } finally {
      setLoading(false);
    }
  }, [user, setUser]);

  const updateProfilePicture = useCallback((newImageUrl: string) => {
    if (!user) return;
    
    // Update user in store immediately
    setUser({
      ...user,
      profile_picture_url: newImageUrl,
      profile_picture: newImageUrl.split('/').pop() || ''
    });
  }, [user, setUser]);

  return {
    refreshUserProfile,
    updateProfilePicture,
    loading,
  };
};

export default useUserProfile;