import React from 'react';

interface InvoiceTemplateProps {
  paymentPayload: any;
}

export default function InvoiceTemplate({ paymentPayload }: InvoiceTemplateProps) {
  if (!paymentPayload) return null;

  const dateNow = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric'
  });
  const timeNow = new Date().toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit'
  });

  const rdvDate = paymentPayload.dateHeure
    ? new Date(paymentPayload.dateHeure).toLocaleDateString('fr-FR', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    })
    : 'N/A';

  const rdvTime = paymentPayload.dateHeure
    ? new Date(paymentPayload.dateHeure).toLocaleTimeString('fr-FR', {
      hour: '2-digit', minute: '2-digit'
    })
    : 'N/A';

  const txId = paymentPayload.transactionId || `INV-${Date.now()}`;

  return (
    <div
      id="invoice-capture-area"
      style={{
        width: '794px',           // A4 at 96dpi
        minHeight: '1123px',
        backgroundColor: '#ffffff',
        fontFamily: "'Poppins', 'Segoe UI', sans-serif",
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ═══ TOP: INSAT Logo (Group 2) ═══ */}
      <div style={{ textAlign: 'center', paddingTop: '36px', paddingBottom: '24px' }}>
        <img
          src="/Group 2.png"
          alt="INSAT Logo"
          style={{ height: '110px', width: 'auto', objectFit: 'contain', margin: '0 auto' }}
          crossOrigin="anonymous"
        />
      </div>

      {/* ═══ THIN BLUE DIVIDER ═══ */}
      <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent, #5B8DEF 30%, #5B8DEF 70%, transparent)', margin: '0 48px' }} />

      {/* ═══ INVOICE BODY ═══ */}
      <div style={{ flex: 1, padding: '40px 56px', display: 'flex', flexDirection: 'column', gap: '28px' }}>

        {/* Row 1: Title + Ref */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#5B8DEF', letterSpacing: '4px', textTransform: 'uppercase', margin: 0 }}>
              Facture
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '12px', margin: '4px 0 0 2px' }}>Reçu de paiement officiel</p>
          </div>
          <div style={{ textAlign: 'right', background: '#f0f5ff', border: '1px solid #dbeafe', borderRadius: '12px', padding: '14px 20px' }}>
            <p style={{ fontSize: '10px', color: '#5B8DEF', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 4px 0' }}>Référence</p>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#1e3a5f', margin: 0 }}>{txId}</p>
            <p style={{ fontSize: '11px', color: '#64748b', margin: '4px 0 0 0' }}>Émis le {dateNow}</p>
            <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0 0' }}>à {timeNow}</p>
          </div>
        </div>

        {/* Row 2: Patient + Doctor info boxes */}
        <div style={{ display: 'flex', gap: '16px' }}>
          {/* Patient */}
          <div style={{
            flex: 1,
            background: '#f8faff',
            border: '1px solid #e0e9ff',
            borderRadius: '14px',
            padding: '18px 20px',
            borderLeft: '4px solid #5B8DEF'
          }}>
            <p style={{ fontSize: '10px', fontWeight: '700', color: '#5B8DEF', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 8px 0' }}>Facturé à</p>
            <p style={{ fontSize: '17px', fontWeight: '700', color: '#1e293b', margin: '0 0 4px 0' }}>{paymentPayload.patientName || 'Patient'}</p>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Patient enregistré · INSAT Santé</p>
          </div>

          {/* Practitioner */}
          <div style={{
            flex: 1,
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '14px',
            padding: '18px 20px',
            borderLeft: '4px solid #22c55e'
          }}>
            <p style={{ fontSize: '10px', fontWeight: '700', color: '#16a34a', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 8px 0' }}>Prestataire</p>
            <p style={{ fontSize: '17px', fontWeight: '700', color: '#1e293b', margin: '0 0 4px 0' }}>{paymentPayload.doctorName || 'Médecin'}</p>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Praticien agréé · INSAT Santé</p>
          </div>
        </div>

        {/* Row 3: Table */}
        <div>
          {/* Table Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 180px 140px',
            background: '#5B8DEF',
            borderRadius: '10px 10px 0 0',
            padding: '12px 20px',
            color: '#fff',
            fontSize: '11px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            <span>Description</span>
            <span style={{ textAlign: 'center' }}>Date du rendez-vous</span>
            <span style={{ textAlign: 'right' }}>Montant</span>
          </div>

          {/* Table Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 180px 140px',
            background: '#f8faff',
            borderRadius: '0 0 10px 10px',
            border: '1px solid #e0e9ff',
            borderTop: 'none',
            padding: '18px 20px',
            alignItems: 'center'
          }}>
            <div>
              <p style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b', margin: '0 0 4px 0' }}>
                {paymentPayload.serviceName || 'Consultation médicale'}
              </p>
              <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
                Mode : {paymentPayload.paymentMethod === 'en_ligne' ? 'Carte bancaire (En ligne)' : 'Paiement sur place'}
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '13px', fontWeight: '600', color: '#1e3a5f', margin: '0 0 2px 0' }}>{rdvDate}</p>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>{rdvTime}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '18px', fontWeight: '700', color: '#5B8DEF', margin: 0 }}>
                {paymentPayload.price || 0} <span style={{ fontSize: '12px', fontWeight: '500', color: '#64748b' }}>DZD</span>
              </p>
            </div>
          </div>
        </div>

        {/* Row 4: Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '280px', background: '#f8faff', border: '1px solid #e0e9ff', borderRadius: '14px', padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>Sous-total</span>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>{paymentPayload.price || 0} DZD</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>TVA</span>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>0,00 DZD</span>
            </div>
            <div style={{ borderTop: '2px solid #5B8DEF', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '15px', fontWeight: '700', color: '#5B8DEF' }}>Total Payé</span>
              <span style={{ fontSize: '22px', fontWeight: '800', color: '#5B8DEF' }}>{paymentPayload.price || 0} DZD</span>
            </div>
          </div>
        </div>

        {/* Row 5: Status badge */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#f0fdf4',
            border: '1.5px solid #22c55e',
            borderRadius: '99px',
            padding: '10px 28px',
            color: '#16a34a',
            fontWeight: '700',
            fontSize: '13px'
          }}>
            <span style={{ fontSize: '16px' }}>✓</span>
            Paiement confirmé et validé
          </div>
        </div>

        {/* Row 6: Note */}
        <div style={{
          background: '#fef9f0',
          border: '1px solid #fde68a',
          borderRadius: '10px',
          padding: '14px 18px',
          fontSize: '11px',
          color: '#92400e',
          lineHeight: '1.6'
        }}>
          <strong>Note :</strong> Ce document constitue un reçu officiel de paiement généré automatiquement par la plateforme INSAT Santé.
          Conservez-le comme preuve de votre rendez-vous et du paiement effectué.
        </div>
      </div>

      {/* ═══ SPACER ═══ */}
      <div style={{ flex: 1 }} />

      {/* ═══ BOTTOM: Decorative pattern (Group 3) ═══ */}
      <div style={{ position: 'relative', height: '140px', overflow: 'hidden' }}>
        <img
          src="/Group 3.png"
          alt=""
          aria-hidden="true"
          crossOrigin="anonymous"
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            height: '280px',
            width: 'auto',
            objectFit: 'contain',
            objectPosition: 'bottom right',
            opacity: 0.55
          }}
        />
        {/* Footer text on the left */}
        <div style={{ position: 'absolute', bottom: '20px', left: '56px' }}>
          <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>© {new Date().getFullYear()} INSAT Santé · Tous droits réservés</p>
          <p style={{ fontSize: '10px', color: '#cbd5e1', margin: '3px 0 0 0' }}>contact@insat-sante.dz · www.insat-sante.dz</p>
        </div>
      </div>
    </div>
  );
}
