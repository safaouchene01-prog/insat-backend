import { CheckCircle, Download, ArrowRight, FileText, Eye, EyeOff } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import InvoiceTemplate from '../components/payment/InvoiceTemplate';

export default function PaymentSuccess() {
  const location = useLocation();
  const [paymentPayload, setPaymentPayload] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let payload = location.state?.paymentPayload;
    if (!payload) {
      const stored = localStorage.getItem('paymentPayload');
      if (stored) {
        try { payload = JSON.parse(stored); } catch { /* ignore */ }
      }
    }
    if (payload) setPaymentPayload(payload);
  }, [location]);

  const generatePDF = async () => {
    if (!paymentPayload) return;

    setIsGenerating(true);

    // Create a temporary visible-but-offscreen container with proper dimensions
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '794px';
    container.style.zIndex = '-1';
    container.style.pointerEvents = 'none';
    container.style.backgroundColor = '#ffffff';
    document.body.appendChild(container);

    // We need to render the InvoiceTemplate into the container
    // Use a portal-like approach with ReactDOM
    const { createRoot } = await import('react-dom/client');
    const root = createRoot(container);

    await new Promise<void>(resolve => {
      root.render(
        <InvoiceTemplate paymentPayload={paymentPayload} />
      );
      // Wait for images to load
      setTimeout(resolve, 800);
    });

    try {
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 794,
        windowWidth: 794,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Facture_INSAT_${paymentPayload.transactionId || 'RDV'}.pdf`);
      localStorage.removeItem('paymentPayload');
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Erreur lors de la génération du PDF. Veuillez réessayer.');
    } finally {
      root.unmount();
      document.body.removeChild(container);
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-[80vh] bg-gradient-to-br from-blue-50/40 via-white to-green-50/30 flex flex-col items-center justify-center px-4 py-12">

      {/* ── Success Card ── */}
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-[var(--color-primary)] via-green-400 to-[var(--color-primary)]" />

        <div className="p-10 text-center">
          {/* Icon */}
          <div className="relative inline-flex mb-6">
            <div className="w-24 h-24 rounded-full bg-green-50 border-4 border-green-100 flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-500" strokeWidth={1.5} />
            </div>
            <span className="absolute -top-1 -right-1 text-2xl">🎉</span>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">Paiement Confirmé !</h1>
          <p className="text-gray-500 text-sm mb-8 max-w-sm mx-auto leading-relaxed">
            Votre rendez-vous est confirmé. Téléchargez votre facture officielle ci-dessous.
          </p>

          {/* Summary */}
          {paymentPayload && (
            <div className="bg-[#f8faff] border border-[#dbeafe] rounded-2xl p-5 text-left mb-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText size={15} className="text-[var(--color-primary)]" />
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Résumé du paiement</span>
              </div>
              <div className="space-y-2.5">
                <SummaryRow label="Patient" value={paymentPayload.patientName || '—'} />
                <SummaryRow label="Praticien" value={paymentPayload.doctorName || '—'} />
                <SummaryRow label="Service" value={paymentPayload.serviceName || 'Consultation'} />
                {paymentPayload.dateHeure && (
                  <SummaryRow
                    label="Rendez-vous"
                    value={new Date(paymentPayload.dateHeure).toLocaleString('fr-FR', {
                      weekday: 'short', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit',
                    })}
                  />
                )}
                <SummaryRow
                  label="Mode paiement"
                  value={paymentPayload.paymentMethod === 'en_ligne' ? '💳 Carte bancaire' : '🏦 Sur place'}
                />
                <div className="flex justify-between items-center pt-3 border-t border-[#dbeafe] mt-1">
                  <span className="text-sm font-bold text-[var(--color-primary)]">Total Payé</span>
                  <span className="text-xl font-extrabold text-[var(--color-primary)]">
                    {paymentPayload.price || 0} DZD
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            {paymentPayload && (
              <div className="flex gap-3">
                <button
                  onClick={generatePDF}
                  disabled={isGenerating}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 border-2 border-[var(--color-primary)] text-[var(--color-primary)] font-semibold rounded-xl hover:bg-blue-50 active:bg-blue-100 transition-colors disabled:opacity-60 disabled:cursor-wait"
                >
                  <Download size={17} />
                  {isGenerating ? 'Génération…' : 'Télécharger PDF'}
                </button>
                <button
                  onClick={() => setShowPreview(v => !v)}
                  className="flex items-center justify-center gap-2 px-5 py-3 border-2 border-gray-200 text-gray-500 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                  title="Aperçu de la facture"
                >
                  {showPreview ? <EyeOff size={17} /> : <Eye size={17} />}
                  {showPreview ? 'Masquer' : 'Aperçu'}
                </button>
              </div>
            )}

            <Link
              to="/patient/dashboard"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-[var(--color-primary)] text-white font-semibold rounded-xl hover:bg-[#4070d4] transition-colors"
            >
              Mon tableau de bord <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </div>

      {/* ── On-screen invoice preview ── */}
      {showPreview && paymentPayload && (
        <div className="mt-8 w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl border border-gray-200">
          <div ref={invoiceRef}>
            <InvoiceTemplate paymentPayload={paymentPayload} />
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-xs text-gray-400 uppercase tracking-wide shrink-0 pt-0.5">{label}</span>
      <span className="text-sm font-medium text-gray-800 text-right">{value}</span>
    </div>
  );
}
