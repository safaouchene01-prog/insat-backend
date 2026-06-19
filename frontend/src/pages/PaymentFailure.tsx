import { XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function PaymentFailure() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
        <XCircle className="w-12 h-12 text-red-500" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Paiement Échoué</h1>
      <p className="text-gray-600 mb-8 max-w-md">
        Nous n'avons pas pu traiter votre paiement. Votre rendez-vous est toujours en attente. Veuillez réessayer le paiement ou choisir de payer sur place.
      </p>
      <div className="flex gap-4">
        <Link 
          to="/patient/dashboard" 
          className="px-8 py-3 bg-[var(--color-primary)] text-white font-bold rounded-xl hover:bg-[var(--color-secondary)] transition-colors"
        >
          Aller au tableau de bord
        </Link>
      </div>
    </div>
  );
}
