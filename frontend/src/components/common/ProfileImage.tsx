import React from 'react';
import { User, Building2, Stethoscope } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Resolve a possibly-relative image path to a full URL pointing at the backend.
const resolveImageUrl = (src?: string | null): string | undefined => {
  if (!src) return undefined;
  // Already absolute (http/https/data) -> use as-is
  if (/^(https?:)?\/\//i.test(src) || src.startsWith('data:')) return src;
  // Backend-served static path -> prefix with API base URL
  if (src.startsWith('/')) return `${API_URL}${src}`;
  return `${API_URL}/${src}`;
};

interface ProfileImageProps {
  src?: string | null;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  userType?: 'patient' | 'therapist' | 'clinic';
  className?: string;
  fallbackClassName?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24'
};

const iconSizes = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32
};

export const ProfileImage: React.FC<ProfileImageProps> = ({
  src,
  alt = 'Photo de profil',
  size = 'md',
  userType = 'patient',
  className = '',
  fallbackClassName = ''
}) => {
  const baseClasses = `${sizeClasses[size]} rounded-full overflow-hidden flex items-center justify-center`;
  
  // Default fallback colors by user type
  const defaultFallbackClasses = {
    patient: 'bg-blue-100 text-blue-600',
    therapist: 'bg-green-100 text-green-600', 
    clinic: 'bg-purple-100 text-purple-600'
  };

  const fallbackClass = fallbackClassName || defaultFallbackClasses[userType];

  // Choose appropriate icon
  const getIcon = () => {
    const iconSize = iconSizes[size];
    switch (userType) {
      case 'therapist':
        return <Stethoscope size={iconSize} />;
      case 'clinic':
        return <Building2 size={iconSize} />;
      default:
        return <User size={iconSize} />;
    }
  };

  const resolvedSrc = resolveImageUrl(src);

  if (resolvedSrc) {
    return (
      <div className={`${baseClasses} ${className}`}>
        <img
          src={resolvedSrc}
          alt={alt}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Hide image on error and show fallback
            e.currentTarget.style.display = 'none';
            const parent = e.currentTarget.parentElement;
            if (parent) {
              parent.innerHTML = `<div class="${fallbackClass} w-full h-full flex items-center justify-center">${getIcon()}</div>`;
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className={`${baseClasses} ${fallbackClass} ${className}`}>
      {getIcon()}
    </div>
  );
};

export default ProfileImage;