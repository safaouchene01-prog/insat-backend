import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Check, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctor?: any;
  clinic?: any;
}

export default function BookingModal({ isOpen, onClose, doctor }: BookingModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // Récupère l'ID du médecin (plusieurs noms possibles + secours via l'URL /doctors/1)
  const doctorId =
    doctor?.idTherapeute ??
    doctor?.idtherapeute ??
    doctor?.id ??
    window.location.pathname.split('/').pop();

  const [step, setStep] = useState(doctor ? 2 : 1);
  const [loading, setLoading] = useState(false);

  // Form state
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'sur_place' | 'en_ligne'>('sur_place');

  // Mois actuellement affiché dans le calendrier
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  if (!isOpen) return null;

  // Mock data for UI presentation
  const mockServices = [
    { id: 1, name: t('booking.service.consultation'), duration: 30, price: doctor?.tarifSeance || 3000 },
    { id: 2, name: t('booking.service.followup'), duration: 15, price: (doctor?.tarifSeance || 3000) * 0.7 },
    { id: 3, name: t('booking.service.online'), duration: 20, price: (doctor?.tarifSeance || 3000) * 0.8 },
  ];

  const mockSlots = ['09:00', '09:30', '10:00', '11:30', '14:00', '14:30', '15:00', '16:30'];

  // ----- Helpers calendrier -----
  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const toISO = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const buildCalendarCells = () => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // jour de la semaine du 1er (0=Dim → on veut Lun=0)
    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6;

    const cells: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    return cells;
  };

  const goPrevMonth = () => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1));
  const goNextMonth = () => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1));

  const handleConfirm = () => {
    const user = useAuthStore.getState().user;
    
    // Si l'utilisateur n'est pas connecté, nous l'envoyons quand même au checkout,
    // où il sera invité à se connecter ou créer un compte sans perdre sa sélection.
    if (!doctorId) {
      toast.error('Médecin introuvable. Rouvrez la page du médecin.');
      return;
    }

    if (!selectedDate || !selectedSlot) {
      toast.error('Veuillez sélectionner une date et une heure');
      return;
    }

    if (!selectedService) {
      toast.error('Veuillez sélectionner un motif de consultation');
      return;
    }

    const payload = {
      doctorId: Number(doctorId),
      doctorName: doctor?.nom ? `${doctor.prenom} ${doctor.nom}` : "Docteur",
      dateHeure: `${selectedDate}T${selectedSlot}:00`,
      displayDate: selectedDate,
      displaySlot: selectedSlot,
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      price: selectedService.price,
      paymentMethod
    };

    onClose();
    navigate('/checkout', { state: { bookingPayload: payload } });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <h2 className="text-xl font-bold text-[var(--color-accent)]">Prendre rendez-vous</h2>
          <button onClick={onClose} className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
            <X size={20} />
          </button>
        </div>

        {/* Stepper */}
        <div className="px-8 pt-6 pb-2">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-100 -z-10 rounded-full"></div>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-[var(--color-primary)] -z-10 rounded-full transition-all duration-300" style={{ width: `${((step - 1) / 4) * 100}%` }}></div>

            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step > i ? 'bg-[var(--color-primary)] text-white' : step === i ? 'bg-[var(--color-primary)] text-white ring-4 ring-cyan-100' : 'bg-gray-200 text-gray-400'}`}>
                {step > i ? <Check size={16} /> : i}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto flex-1">
          {step === 1 && (
            <div>
              <h3 className="text-lg font-bold mb-4">{t('booking.step1')}</h3>
              <p className="text-gray-500 mb-6">Étape ignorée car ouverte depuis un profil médecin.</p>
              <button onClick={() => setStep(2)} className="w-full py-3 bg-[var(--color-primary)] text-white font-bold rounded-xl">Continuer</button>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 className="text-lg font-bold mb-4">{t('booking.step2')}</h3>
              <div className="space-y-3">
                {mockServices.map((srv) => (
                  <button
                    key={srv.id}
                    onClick={() => setSelectedService(srv)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border-2 text-left transition-all ${selectedService?.id === srv.id ? 'border-[var(--color-primary)] bg-cyan-50' : 'border-gray-100 hover:border-gray-200'}`}
                  >
                    <div>
                      <p className="font-bold text-[var(--color-dark)]">{srv.name}</p>
                      <p className="text-sm text-gray-500 flex items-center"><Clock size={14} className="mr-1" /> {srv.duration} min</p>
                    </div>
                    <div className="font-bold text-[var(--color-primary)]">
                      {srv.price} DA
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 className="text-lg font-bold mb-4">{t('booking.step3')}</h3>

              {/* En-tête mois + navigation */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={goPrevMonth}
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
                  aria-label="Mois précédent"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="font-bold text-[var(--color-dark)] text-lg">
                  {monthNames[calMonth.getMonth()]} {calMonth.getFullYear()}
                </span>
                <button
                  onClick={goNextMonth}
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
                  aria-label="Mois suivant"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              {/* Noms des jours */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map((d) => (
                  <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Grille des jours */}
              <div className="grid grid-cols-7 gap-1">
                {buildCalendarCells().map((cell, idx) => {
                  if (!cell) return <div key={`empty-${idx}`} />;
                  const iso = toISO(cell);
                  const isPast = cell < today;
                  const isSelected = selectedDate === iso;
                  const isToday = toISO(today) === iso;
                  return (
                    <button
                      key={iso}
                      disabled={isPast}
                      onClick={() => setSelectedDate(iso)}
                      className={`aspect-square rounded-xl text-sm font-medium flex items-center justify-center transition-all
                        ${isSelected
                          ? 'bg-[var(--color-primary)] text-white shadow-md'
                          : isPast
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-700 hover:bg-cyan-50 hover:text-[var(--color-primary)]'}
                        ${isToday && !isSelected ? 'ring-1 ring-[var(--color-primary)]' : ''}`}
                    >
                      {cell.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h3 className="text-lg font-bold mb-4">{t('booking.step4')}</h3>
              <p className="text-gray-500 mb-4 text-sm">Créneaux disponibles pour le {new Date(selectedDate).toLocaleDateString('fr-FR')}</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {mockSlots.map(slot => (
                  <button
                    key={slot}
                    onClick={() => setSelectedSlot(slot)}
                    className={`py-2 rounded-lg border font-medium transition-all ${selectedSlot === slot ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'border-gray-200 text-gray-700 hover:border-[var(--color-primary)]'}`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <h3 className="text-lg font-bold mb-4">{t('booking.step5')}</h3>
              <div className="bg-cyan-50 rounded-2xl p-6 border border-cyan-100 space-y-4">
                <div className="flex items-center gap-4 border-b border-cyan-200 pb-4">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center font-bold text-cyan-800">
                    {doctor?.nom?.[0]}{doctor?.prenom?.[0]}
                  </div>
                  <div>
                    <p className="font-bold text-[var(--color-dark)]">Dr. {doctor?.nom} {doctor?.prenom}</p>
                    <p className="text-sm text-[var(--color-primary)]">{doctor?.specialite}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Service</p>
                    <p className="font-semibold text-[var(--color-dark)]">{selectedService?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Date & Heure</p>
                    <p className="font-semibold text-[var(--color-dark)]">
                      {new Date(selectedDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à {selectedSlot}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-cyan-200 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-[var(--color-dark)]">Total à payer</span>
                    <span className="text-xl font-bold text-[var(--color-primary)]">{selectedService?.price} DA</span>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className={`flex items-center gap-3 p-3 rounded-xl border ${paymentMethod === 'sur_place' ? 'border-[var(--color-primary)] bg-cyan-50' : 'border-gray-200'} cursor-pointer`}>
                      <input type="radio" name="paymentMethod" value="sur_place" checked={paymentMethod === 'sur_place'} onChange={() => setPaymentMethod('sur_place')} className="w-4 h-4 text-[var(--color-primary)]" />
                      <span className="font-medium">Paiement sur place</span>
                    </label>
                    <label className={`flex items-center gap-3 p-3 rounded-xl border ${paymentMethod === 'en_ligne' ? 'border-[var(--color-primary)] bg-cyan-50' : 'border-gray-200'} cursor-pointer`}>
                      <input type="radio" name="paymentMethod" value="en_ligne" checked={paymentMethod === 'en_ligne'} onChange={() => setPaymentMethod('en_ligne')} className="w-4 h-4 text-[var(--color-primary)]" />
                      <span className="font-medium">Paiement en ligne (Chargily Pay)</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-between rounded-b-[2rem]">
          {step > (doctor ? 2 : 1) ? (
            <button onClick={() => setStep(s => s - 1)} className="px-6 py-2 rounded-xl font-medium text-gray-600 hover:bg-gray-200 transition-colors">
              Retour
            </button>
          ) : (
            <div></div>
          )}

          {step < 5 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={(step === 2 && !selectedService) || (step === 3 && !selectedDate) || (step === 4 && !selectedSlot)}
              className="px-8 py-2 rounded-xl font-bold text-white bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] disabled:opacity-50 transition-colors"
            >
              Suivant
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="px-8 py-2 rounded-xl font-bold text-white bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] transition-colors flex items-center"
            >
              {loading ? <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span> : null}
              {t('booking.confirm')}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
