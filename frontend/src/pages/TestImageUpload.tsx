import React, { useState } from 'react';
import ProfileImageUpload from '../components/common/ProfileImageUpload';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function TestImageUpload() {
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [testUserId] = useState(1); // Use a test user ID
  const [userType, setUserType] = useState<'patient' | 'therapist' | 'clinic'>('patient');

  const handleImageUpload = (newImageUrl: string) => {
    setCurrentImage(newImageUrl);
    console.log('Image uploaded:', newImageUrl);
  };

  const handleImageDelete = () => {
    setCurrentImage(null);
    console.log('Image deleted');
  };

  const testDirectAccess = async () => {
    try {
      const response = await fetch(`${API_URL}/static/uploads/patients/test.jpg`);
      console.log('Static file access test:', response.status);
    } catch (error) {
      console.error('Static file access error:', error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Test Image Upload</h1>
        
        <div className="space-y-6">
          {/* User Type Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type d'utilisateur :
            </label>
            <select 
              value={userType} 
              onChange={(e) => setUserType(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="patient">Patient</option>
              <option value="therapist">Thérapeute</option>
              <option value="clinic">Clinique</option>
            </select>
          </div>

          {/* Image Upload Component */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Upload de l'image :
            </label>
            <ProfileImageUpload
              currentImage={currentImage}
              userType={userType}
              userId={testUserId}
              onUploadComplete={handleImageUpload}
              onDeleteComplete={handleImageDelete}
              size="xl"
              className="text-center"
            />
          </div>

          {/* Current Image Display */}
          {currentImage && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image actuelle :
              </label>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">URL: {currentImage}</p>
                <img 
                  src={currentImage} 
                  alt="Uploaded" 
                  className="max-w-xs max-h-48 object-cover rounded-lg border"
                  onError={() => console.error('Failed to load image:', currentImage)}
                />
              </div>
            </div>
          )}

          {/* Debug Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Debug Info:</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>User Type: {userType}</p>
              <p>User ID: {testUserId}</p>
              <p>API URL: {API_URL}</p>
              <p>Current Image: {currentImage || 'None'}</p>
            </div>
            <button 
              onClick={testDirectAccess}
              className="mt-2 px-3 py-1 bg-blue-500 text-white text-sm rounded"
            >
              Test Static File Access
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}