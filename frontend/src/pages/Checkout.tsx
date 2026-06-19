import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { CreditCard, Lock, ChevronLeft, Calendar, User, Clock, CheckCircle, Download, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const bookingPayload = location.state?.bookingPayload;

  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle');
  const [createdRdvId, setCreatedRdvId] = useState<number | null>(null);
  const [chargilyCheckoutId, setChargilyCheckoutId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isCheckingNow, setIsCheckingNow] = useState(false);
  const intervalRef = React.useRef<any>(null);
  const countdownRef = React.useRef<any>(null);
  const elapsedRef = React.useRef<any>(null);

  // S'il n'y a pas de réservation en mémoire, on retourne à l'accueil
  useEffect(() => {
    if (!bookingPayload) {
      navigate('/');
    }
  }, [bookingPayload, navigate]);

  if (!bookingPayload) return null;

  // Automated polling + countdown + elapsed timer
  useEffect(() => {
    if (paymentStatus !== 'pending') {
      clearInterval(intervalRef.current);
      clearInterval(countdownRef.current);
      clearInterval(elapsedRef.current);
      return;
    }

    const doCheck = async () => {
      setIsCheckingNow(true);
      try {
        if (bookingPayload.paymentMethod === 'en_ligne' && chargilyCheckoutId) {
          const res = await fetch(`${API_URL}/paiements/chargily-status/${chargilyCheckoutId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.status === 'paid') {
              setPaymentStatus('success');
              return;
            } else if (data.status === 'failed' || data.status === 'canceled') {
              toast.error('Le paiement a échoué ou a été annulé.');
              setPaymentStatus('failed');
              return;
            }
          }
        } else if (createdRdvId) {
          const res = await fetch(`${API_URL}/rendezvous/${createdRdvId}`);
          if (res.ok) {
            const rdv = await res.json();
            if (rdv.statut === 'CONFIRME') {
              setPaymentStatus('success');
              return;
            }
          }
        }
      } catch (e) {}
      setIsCheckingNow(false);
      setCountdown(3);
    };

    // Immediate check on mount of pending state
    doCheck();

    // Check every 3 seconds
    intervalRef.current = setInterval(() => {
      doCheck();
    }, 3000);

    // Countdown display
    countdownRef.current = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? 3 : prev - 1));
    }, 1000);

    // Elapsed time counter
    elapsedRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(intervalRef.current);
      clearInterval(countdownRef.current);
      clearInterval(elapsedRef.current);
    };
  }, [paymentStatus, chargilyCheckoutId, createdRdvId, bookingPayload]);

  const generatePDF = () => {
    if (!bookingPayload || !user) {
      toast.error('Impossible de générer la facture : données manquantes.');
      return;
    }
    
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      const dateNow = new Date().toLocaleDateString('fr-FR');
      
      doc.setFontSize(22);
      doc.setTextColor(28, 46, 74); 
      doc.text("FACTURE", 105, 20, { align: "center" });

      doc.setFontSize(14);
      doc.setTextColor(74, 144, 217); 
      doc.text("INSAT Santé", 20, 35);
      
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text(`Date de facturation : ${dateNow}`, 20, 45);
      doc.text(`N° Transaction : TX-${createdRdvId || 'N/A'}`, 20, 52);

      doc.setTextColor(28, 46, 74);
      const patientName = `${user.nom || ''} ${user.prenom || ''}`.trim() || 'Patient';
      const doctorName = bookingPayload.doctorName || 'Médecin';
      doc.text(`Patient : ${patientName}`, 20, 70);
      doc.text(`Praticien : ${doctorName}`, 20, 77);
      
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 85, 190, 85);
      
      doc.setFontSize(12);
      doc.text("Détails du Rendez-vous", 20, 95);
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      
      const rdvDate = bookingPayload.dateHeure ? new Date(bookingPayload.dateHeure).toLocaleString('fr-FR') : 'Date non définie';
      const motif = bookingPayload.serviceName || 'Consultation';
      const payMode = bookingPayload.paymentMethod === 'en_ligne' ? 'Carte Bancaire (En ligne)' : 'Paiement sur place';
      
      doc.text(`Date & Heure : ${rdvDate}`, 20, 105);
      doc.text(`Motif : ${motif}`, 20, 112);
      doc.text(`Mode de paiement : ${payMode}`, 20, 119);

      doc.line(20, 130, 190, 130);

      doc.setFontSize(14);
      doc.setTextColor(28, 46, 74);
      doc.text("Total Payé :", 120, 145);
      doc.setTextColor(56, 201, 138); 
      doc.text(`${bookingPayload.price || 0} DZD`, 160, 145);

      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text("Merci pour votre confiance. En cas de besoin, contactez le support.", 105, 280, { align: "center" });

      // Robust download handling
      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `Facture_INSAT_TX-${createdRdvId || 'RDV'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      
      toast.success('Facture téléchargée avec succès !');
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de la création du PDF');
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Veuillez vous connecter pour procéder au paiement.');
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      if (bookingPayload.paymentMethod === 'en_ligne') {
        if (!bookingPayload.price || bookingPayload.price <= 0) {
          toast.error('Montant invalide. Le tarif de la consultation est manquant.');
          setLoading(false);
          return;
        }

        let rdvId = bookingPayload.existingRdvId;

        // Si le RDV n'existe pas encore, on le crée
        if (!rdvId) {
          const rdvRes = await fetch(`${API_URL}/rendezvous/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dateHeure: bookingPayload.dateHeure,
              statut: 'PLANIFIE',
              idPatient: user.id,
              idTherapeute: bookingPayload.doctorId,
            }),
          });
          if (!rdvRes.ok) throw new Error('Erreur lors de la création du rendez-vous');
          const rdvData = await rdvRes.json();
          rdvId = rdvData.idRendezVous;
        }

        setCreatedRdvId(rdvId);

        const chargeRes = await fetch(`${API_URL}/paiements/chargily-checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            montant: bookingPayload.price,
            idPatient: user.id,
            idRendezVous: rdvId,
          }),
        });

        if (!chargeRes.ok) throw new Error('Erreur lors de l\'initialisation du paiement Chargily');
        const chargeData = await chargeRes.json();
        setChargilyCheckoutId(chargeData.checkout_id);

        window.open(chargeData.checkout_url, '_blank');
        toast.success("Paiement ouvert dans un nouvel onglet.");
        setLoading(false);
        setPaymentStatus('pending');
        return;
      }

      // Paiement sur place logic
      const rdvRes = await fetch(`${API_URL}/rendezvous/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateHeure: bookingPayload.dateHeure,
          statut: 'CONFIRME', 
          idPatient: user.id,
          idTherapeute: bookingPayload.doctorId,
        }),
      });

      if (!rdvRes.ok) throw new Error('Erreur lors de la création du rendez-vous');
      const rdvData = await rdvRes.json();
      setCreatedRdvId(rdvData.idRendezVous);
      
      setTimeout(() => {
        setLoading(false);
        setPaymentStatus('success');
      }, 1500);

    } catch (error: any) {
      setLoading(false);
      toast.error(error.message || 'Une erreur est survenue');
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-500 hover:text-gray-900 mb-6 transition-colors"
        >
          <ChevronLeft size={20} />
          <span>Retour</span>
        </button>

        <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(28,46,74,0.08)] overflow-hidden">
          <div className="grid md:grid-cols-2">
            
            {/* Résumé de la commande */}
            <div className="bg-[#1C2E4A] text-white p-8">
              <h2 className="text-2xl font-[Poppins] font-semibold mb-6">Résumé de la réservation</h2>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                    <User size={20} className="text-blue-300" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-200 mb-1">Professionnel de santé</p>
                    <p className="font-semibold">{bookingPayload.doctorName}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Calendar size={20} className="text-green-300" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-200 mb-1">Date</p>
                    <p className="font-semibold">{bookingPayload.displayDate}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Clock size={20} className="text-purple-300" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-200 mb-1">Heure</p>
                    <p className="font-semibold">{bookingPayload.displaySlot}</p>
                  </div>
                </div>
              </div>

              <div className="mt-12 pt-6 border-t border-white/20">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-sm text-blue-200 mb-1">Motif : {bookingPayload.serviceName}</p>
                    <p className="text-xl font-bold">Total à payer</p>
                  </div>
                  <div className="text-3xl font-bold text-[#38C98A]">
                    {bookingPayload.price} DZD
                  </div>
                </div>
              </div>
            </div>

            {/* Paiement / Auth */}
            <div className="p-8">
              {!user ? (
                <div className="flex flex-col h-full justify-center items-center text-center">
                  <Lock size={48} className="text-gray-300 mb-4" />
                  <h3 className="text-xl font-bold text-[#1C2E4A] mb-2">Authentification requise</h3>
                  <p className="text-gray-500 mb-6">
                    Vous devez être connecté pour finaliser votre réservation. Vos choix seront conservés.
                  </p>
                  <div className="flex gap-4 w-full">
                    <Link to="/login" className="flex-1 py-3 text-center rounded-xl bg-[#4A90D9] text-white font-bold hover:bg-[#2E6FB8] transition-colors">
                      Se connecter
                    </Link>
                    <Link to="/register" className="flex-1 py-3 text-center rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors">
                      S'inscrire
                    </Link>
                  </div>
                </div>
              ) : paymentStatus === 'pending' ? (
                <div className="flex flex-col h-full justify-center items-center text-center px-4">
                  {/* Animated radar pulse */}
                  <div className="relative w-24 h-24 mb-6">
                    <div className="absolute inset-0 rounded-full bg-blue-100 animate-ping opacity-40" />
                    <div className="absolute inset-2 rounded-full bg-blue-100 animate-ping opacity-40" style={{animationDelay: '0.5s'}} />
                    <div className="relative w-24 h-24 bg-white rounded-full border-4 border-blue-200 flex items-center justify-center shadow-md">
                      {isCheckingNow ? (
                        <div className="w-8 h-8 border-3 border-blue-200 border-t-[#4A90D9] rounded-full animate-spin" style={{borderWidth:'3px'}} />
                      ) : (
                        <span className="text-2xl font-bold text-[#4A90D9]">{countdown}s</span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-[#1C2E4A] mb-1">Vérification en cours...</h3>
                  <p className="text-sm text-gray-400 mb-1">
                    Prochain contrôle dans <span className="font-semibold text-[#4A90D9]">{countdown}s</span>
                  </p>
                  <p className="text-xs text-gray-300 mb-5">
                    Temps écoulé : {Math.floor(elapsedSeconds / 60).toString().padStart(2,'0')}:{(elapsedSeconds % 60).toString().padStart(2,'0')}
                  </p>

                  <p className="text-gray-500 text-sm mb-6 max-w-xs">
                    Finalisez le paiement sur l'onglet Chargily. Cette page se mettra à jour automatiquement.
                  </p>

                  <button
                    onClick={async () => {
                      setIsCheckingNow(true);
                      clearInterval(intervalRef.current);
                      clearInterval(countdownRef.current);
                      // Trigger immediate re-check and restart
                      setPaymentStatus('idle');
                      setTimeout(() => setPaymentStatus('pending'), 50);
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-[#4A90D9] text-[#4A90D9] font-semibold text-sm hover:bg-blue-50 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
                    Vérifier maintenant
                  </button>
                </div>
              ) : paymentStatus === 'success' ? (
                <div className="flex flex-col h-full justify-center items-center text-center">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle className="w-10 h-10 text-green-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-[#1C2E4A] mb-2">Réservation Confirmée !</h3>
                  <p className="text-gray-500 mb-8 max-w-sm">
                    Votre paiement a été validé et votre rendez-vous est maintenant planifié avec succès.
                  </p>
                  
                  <div className="flex flex-col w-full gap-4">
                    <button 
                      onClick={generatePDF}
                      className="flex items-center justify-center gap-2 px-8 py-3 bg-white border-2 border-[var(--color-primary)] text-[var(--color-primary)] font-bold rounded-xl hover:bg-blue-50 transition-colors"
                    >
                      <Download size={20} />
                      Télécharger ma facture PDF
                    </button>
                    <Link 
                      to="/patient/dashboard" 
                      className="flex items-center justify-center gap-2 px-8 py-3 bg-[#38C98A] text-white font-bold rounded-xl hover:bg-[#23A06B] transition-colors"
                    >
                      Mon tableau de bord <ArrowRight size={20} />
                    </Link>
                  </div>
                </div>
              ) : paymentStatus === 'failed' ? (
                <div className="flex flex-col h-full justify-center items-center text-center">
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </div>
                  <h3 className="text-2xl font-bold text-[#1C2E4A] mb-2">Paiement échoué</h3>
                  <p className="text-gray-500 mb-8 max-w-sm">Votre paiement n'a pas pu être traité. Veuillez réessayer.</p>
                  <button
                    onClick={() => { setPaymentStatus('idle'); setChargilyCheckoutId(null); setElapsedSeconds(0); }}
                    className="w-full py-3 bg-[#4A90D9] text-white font-bold rounded-xl hover:bg-[#2E6FB8] transition-colors"
                  >
                    Réessayer
                  </button>
                </div>
              ) : (
                <form onSubmit={handlePayment} className="flex flex-col h-full">
                  <h2 className="text-2xl font-[Poppins] font-semibold text-[#1C2E4A] mb-6">Paiement</h2>
                  
                  {bookingPayload.paymentMethod === 'en_ligne' ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-blue-50 rounded-xl border border-blue-100">
                      <div className="w-16 h-16 bg-white text-blue-600 rounded-2xl shadow-sm flex items-center justify-center mb-4">
                        <CreditCard size={32} />
                      </div>
                      <h3 className="font-semibold text-[#1C2E4A] mb-2">Paiement sécurisé via Chargily</h3>
                      <p className="text-gray-500 text-sm">
                        Vous allez être redirigé vers la passerelle de paiement Chargily pour régler votre consultation en toute sécurité.
                      </p>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-gray-50 rounded-xl">
                      <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                        <User size={32} />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Paiement sur place</h3>
                      <p className="text-gray-500 text-sm">
                        Vous avez choisi de payer directement lors de votre consultation au cabinet.
                      </p>
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 mt-8 bg-[#38C98A] text-white font-bold rounded-xl hover:bg-[#23A06B] transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <><Lock size={18} /> Confirmer la réservation</>
                    )}
                  </button>
                  <p className="text-center text-xs text-gray-400 mt-4 flex items-center justify-center gap-1">
                    <Lock size={12} /> Paiement sécurisé
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

