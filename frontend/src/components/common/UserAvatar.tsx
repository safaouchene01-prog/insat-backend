import React from 'react';
import { useAuthStore } from '../../store/authStore';
import ProfileImage from './ProfileImage';

interface UserAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showName?: boolean;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  size = 'md',
  className = '',
  showName = false
}) => {
  const { user } = useAuthStore();

  if (!user) {
    return null;
  }

  const getUserType = () => {
    switch (user.role) {
      case 'doctor': return 'therapist';
      case 'patient': return 'patient';
      case 'clinic': return 'clinic';
      default: return 'patient';
    }
  };

  const getUserDisplayName = () => {
    if (user.role === 'clinic') {
      return user.nom;
    }
    return `${user.prenom || ''} ${user.nom}`.trim();
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <ProfileImage
        src={user.profile_picture_url}
        alt={getUserDisplayName()}
        size={size}
        userType={getUserType()}
      />
      {showName && (
        <div className="flex flex-col">
          <span className="font-medium text-sm">{getUserDisplayName()}</span>
          <span className="text-xs text-gray-500 capitalize">{user.role}</span>
        </div>
      )}
    </div>
  );
};

export default UserAvatar;