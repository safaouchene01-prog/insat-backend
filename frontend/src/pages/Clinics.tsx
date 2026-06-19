import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Building2, MapPin, Users, Phone, Mail } from 'lucide-react';
import { ClinicCardSkeleton } from '../components/common/SkeletonCard';
import ProfileImage from '../components/common/ProfileImage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Clinics() {
  const { t } = useTranslation();
  const [clinics, setClinics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/cliniques/`)
      .then(r => r.json())
      .then(data => setClinics(Array.isArray(data) ? data : []))
      .catch(() => setClinics([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-[var(--color-accent)] mb-4">{t('clinics.title')}</h1>
        <p className="text-gray-600 max-w-2xl">
          {t('clinics.subtitle')}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array(6).fill(0).map((_, i) => <ClinicCardSkeleton key={i} />)}
        </div>
      ) : clinics.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clinics.map((clinic: any) => (
            <div key={clinic.idclinique} className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col">
              <div className="h-40 bg-gradient-to-br from-cyan-50 to-blue-50 relative flex items-center justify-center">
                {clinic.profile_picture_url ? (
                  <img 
                    src={clinic.profile_picture_url.startsWith('http') ? clinic.profile_picture_url : `${API_URL}${clinic.profile_picture_url}`} 
                    alt={clinic.nom}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ProfileImage
                    userType="clinic"
                    size="xl"
                    className="bg-transparent"
                    fallbackClassName="text-cyan-600"
                  />
                )}
              </div>
              
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="font-semibold text-[var(--color-accent)] text-lg mb-2 truncate">
                  {clinic.nom}
                </h3>
                
                {clinic.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3 flex-1">
                    {clinic.description}
                  </p>
                )}
                
                <div className="space-y-2 mb-4">
                  {clinic.adresse && (
                    <div className="flex items-start text-sm text-gray-500">
                      <MapPin size={14} className="mr-2 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">{clinic.adresse}</span>
                    </div>
                  )}
                  
                  {clinic.telephone && (
                    <div className="flex items-center text-sm text-gray-500">
                      <Phone size={14} className="mr-2 flex-shrink-0" />
                      <span>{clinic.telephone}</span>
                    </div>
                  )}
                  
                  {clinic.email && (
                    <div className="flex items-center text-sm text-gray-500">
                      <Mail size={14} className="mr-2 flex-shrink-0" />
                      <span className="truncate">{clinic.email}</span>
                    </div>
                  )}
                </div>
                
                <Link
                  to={`/clinics/${clinic.idclinique}`}
                  className="block w-full text-center py-3 bg-[var(--color-primary)] text-white font-medium rounded-xl hover:bg-[var(--color-primary-dark)] transition-colors"
                >
                  {t('clinics.viewClinic')}
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100">
          <p className="text-gray-500">{t('clinics.noClinics')}</p>
        </div>
      )}
    </div>
  );
}