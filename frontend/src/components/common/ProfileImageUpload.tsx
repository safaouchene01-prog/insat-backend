import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Check } from 'lucide-react';
import ProfileImage from './ProfileImage';

interface ProfileImageUploadProps {
  currentImage?: string | null;
  userType: 'patient' | 'therapist' | 'clinic';
  userId: number;
  onUploadComplete?: (imageUrl: string) => void;
  onDeleteComplete?: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showUploadButton?: boolean;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const ProfileImageUpload: React.FC<ProfileImageUploadProps> = ({
  currentImage,
  userType,
  userId,
  onUploadComplete,
  onDeleteComplete,
  size = 'xl',
  className = '',
  showUploadButton = true
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getEndpointPath = () => {
    switch (userType) {
      case 'patient':
        return `patients/${userId}/profile-picture`;
      case 'therapist':
        return `therapeutes/${userId}/profile-picture`;
      case 'clinic':
        return `cliniques/${userId}/profile-picture`;
      default:
        throw new Error('Invalid user type');
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Veuillez sélectionner un fichier image');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('La taille du fichier ne peut pas dépasser 5MB');
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const formData = new FormData();
      formData.append('file', file);

      console.log(`Uploading to: ${API_URL}/${getEndpointPath()}`);

      const response = await fetch(`${API_URL}/${getEndpointPath()}`, {
        method: 'POST',
        body: formData,
      });

      console.log('Upload response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Erreur lors du téléchargement');
      }

      const result = await response.json();
      console.log('Upload result:', result);
      
      setUploadSuccess(true);
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setUploadSuccess(false), 3000);
      
      const imageUrl = result.image_url || result.profile_picture_url;
      console.log('New image URL:', imageUrl);
      onUploadComplete?.(imageUrl);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Erreur lors du téléchargement');
    } finally {
      setUploading(false);
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    if (!currentImage) return;

    setUploading(true);
    setUploadError(null);

    try {
      const response = await fetch(`${API_URL}/${getEndpointPath()}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Erreur lors de la suppression');
      }

      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
      
      onDeleteComplete?.();
    } catch (error) {
      console.error('Delete error:', error);
      setUploadError(error instanceof Error ? error.message : 'Erreur lors de la suppression');
    } finally {
      setUploading(false);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative group">
        <ProfileImage
          src={currentImage}
          userType={userType}
          size={size}
          className="transition-all duration-200"
        />
        
        {/* Overlay with upload button */}
        <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-full flex items-center justify-center">
          <button
            onClick={triggerFileSelect}
            disabled={uploading}
            className="p-2 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30 transition-all duration-200 text-white"
            title="Changer la photo"
          >
            {uploading ? (
              <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Camera size={20} />
            )}
          </button>
          
          {currentImage && (
            <button
              onClick={handleDelete}
              disabled={uploading}
              className="p-2 bg-red-500 bg-opacity-80 rounded-full hover:bg-opacity-100 transition-all duration-200 text-white ml-2"
              title="Supprimer la photo"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Upload button (optional) */}
      {showUploadButton && (
        <div className="mt-4 space-y-2">
          <button
            onClick={triggerFileSelect}
            disabled={uploading}
            className="flex items-center justify-center w-full px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                Téléchargement...
              </>
            ) : (
              <>
                <Upload size={16} className="mr-2" />
                {currentImage ? 'Changer la photo' : 'Ajouter une photo'}
              </>
            )}
          </button>
          
          {currentImage && (
            <button
              onClick={handleDelete}
              disabled={uploading}
              className="flex items-center justify-center w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X size={16} className="mr-2" />
              Supprimer la photo
            </button>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Status messages */}
      {uploadError && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{uploadError}</p>
        </div>
      )}

      {uploadSuccess && (
        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center text-green-600 text-sm">
            <Check size={16} className="mr-2" />
            Photo mise à jour avec succès !
          </div>
        </div>
      )}

      {/* Upload guidelines */}
      <div className="mt-2 text-xs text-gray-500">
        Formats acceptés: JPG, PNG. Taille max: 5MB
      </div>
    </div>
  );
};

export default ProfileImageUpload;