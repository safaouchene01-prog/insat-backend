import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { useUserProfile } from '../hooks/useUserProfile';
import ProfileImageUpload from '../components/common/ProfileImageUpload';
import { User, Mail, Phone, MapPin, Calendar, Save } from 'lucide-react';

interface ProfileData {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  profile_picture?: string;
  profile_picture_url?: string;
  telephone?: string;
  ville?: string;
  adresse?: string;
  specialite?: string;
  localisation_cabinet?: string;
  biographie?: string;
  // Add more fields as needed
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function ProfileSettings() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { updateProfilePicture } = useUserProfile();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id && user?.role) {
      fetchProfileData();
    }
  }, [user]);

  const fetchProfileData = async () => {
    if (!user) return;

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

      const data = await response.json();
      setProfileData(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Erreur lors du chargement du profil');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (newImageUrl: string) => {
    setProfileData(prev => prev ? { 
      ...prev, 
      profile_picture_url: newImageUrl,
      profile_picture: newImageUrl.split('/').pop() // Extract filename
    } : null);
    
    // Update user profile in auth store
    updateProfilePicture(newImageUrl);
  };

  const handleImageDelete = () => {
    setProfileData(prev => prev ? { 
      ...prev, 
      profile_picture_url: undefined,
      profile_picture: undefined
    } : null);
    
    // Update user profile in auth store
    updateProfilePicture('');
  };

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfileData(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleSave = async () => {
    if (!user || !profileData) return;

    setSaving(true);
    setError(null);

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

      const response = await fetch(`${API_URL}/${endpoint}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nom: profileData.nom,
          prenom: profileData.prenom,
          email: profileData.email,
          telephone: profileData.telephone,
          ville: profileData.ville,
          adresse: profileData.adresse,
          specialite: profileData.specialite,
          localisationCabinet: profileData.localisation_cabinet,
          biographie: profileData.biographie,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update profile');
      }

      const updatedData = await response.json();
      setProfileData(updatedData);
      
      // Show success message briefly
      const successDiv = document.createElement('div');
      successDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      successDiv.textContent = 'Profil mis à jour avec succès !';
      document.body.appendChild(successDiv);
      setTimeout(() => document.body.removeChild(successDiv), 3000);
      
    } catch (error) {
      console.error('Error saving profile:', error);
      setError(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="animate-pulse space-y-6">
            <div className="flex items-center space-x-6">
              <div className="w-24 h-24 bg-gray-200 rounded-full"></div>
              <div className="space-y-2">
                <div className="h-6 bg-gray-200 rounded w-48"></div>
                <div className="h-4 bg-gray-200 rounded w-32"></div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !profileData) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <p className="text-gray-500">Profil non trouvé</p>
        </div>
      </div>
    );
  }

  const getUserTypeLabel = () => {
    switch (user.role) {
      case 'patient': return 'Patient';
      case 'doctor': return 'Thérapeute';
      case 'clinic': return 'Clinique';
      default: return 'Utilisateur';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-6 text-white">
          <h1 className="text-2xl font-bold">Paramètres du profil</h1>
          <p className="text-blue-100 mt-1">{getUserTypeLabel()}</p>
        </div>

        <div className="p-8">
          {/* Profile Image Section */}
          <div className="mb-8 text-center">
            <ProfileImageUpload
              currentImage={profileData.profile_picture_url}
              userType={user.role === 'doctor' ? 'therapist' : user.role as any}
              userId={profileData.id}
              onUploadComplete={handleImageUpload}
              onDeleteComplete={handleImageDelete}
              size="xl"
              className="inline-block"
            />
          </div>

          {/* Profile Form */}
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2 text-blue-500" />
                Informations personnelles
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom
                  </label>
                  <input
                    type="text"
                    value={profileData.nom || ''}
                    onChange={(e) => handleInputChange('nom', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prénom
                  </label>
                  <input
                    type="text"
                    value={profileData.prenom || ''}
                    onChange={(e) => handleInputChange('prenom', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Mail className="w-5 h-5 mr-2 text-blue-500" />
                Contact
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={profileData.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={profileData.telephone || ''}
                    onChange={(e) => handleInputChange('telephone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ville
                  </label>
                  <input
                    type="text"
                    value={profileData.ville || ''}
                    onChange={(e) => handleInputChange('ville', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adresse
                  </label>
                  <input
                    type="text"
                    value={profileData.adresse || ''}
                    onChange={(e) => handleInputChange('adresse', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Professional Information (for doctors and clinics) */}
            {(user.role === 'doctor' || user.role === 'clinic') && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-blue-500" />
                  Informations professionnelles
                </h3>
                <div className="space-y-4">
                  {user.role === 'doctor' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Spécialité
                      </label>
                      <input
                        type="text"
                        value={profileData.specialite || ''}
                        onChange={(e) => handleInputChange('specialite', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {user.role === 'doctor' ? 'Localisation du cabinet' : 'Adresse'}
                    </label>
                    <input
                      type="text"
                      value={profileData.localisation_cabinet || ''}
                      onChange={(e) => handleInputChange('localisation_cabinet', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {user.role === 'doctor' ? 'Biographie' : 'Description'}
                    </label>
                    <textarea
                      rows={4}
                      value={profileData.biographie || ''}
                      onChange={(e) => handleInputChange('biographie', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={user.role === 'doctor' ? 'Présentez votre parcours et votre approche thérapeutique...' : 'Décrivez votre clinique...'}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end pt-6 border-t border-gray-200">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Sauvegarder les modifications
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}