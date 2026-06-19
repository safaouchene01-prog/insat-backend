import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Save, CheckCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30',
  '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30',
];

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];
const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatSelectedDate(iso: string): string {
  // parse as local date
  const [y, mo, d] = iso.split('-').map(Number);
  const date = new Date(y, mo - 1, d);
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function GestionDisponibilites() {
  const { user } = useAuthStore();

  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [savedSlots, setSavedSlots] = useState<Record<string, string[]>>({});
  const [activeSlots, setActiveSlots] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Load all saved slots for this doctor
  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/disponibilites/doctor/${user.id}/disponibilites`);
        if (res.ok) {
          const data = await res.json();
          setSavedSlots(data);
        }
      } catch (err) {
        console.error('Failed to load slots:', err);
      }
    };
    load();
  }, [user?.id]);

  // When doctor clicks a day
  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    const key = toISO(date);
    setActiveSlots(savedSlots[key] || []);
  };

  // Toggle a slot on/off
  const toggleSlot = (slot: string) => {
    setActiveSlots(prev =>
      prev.includes(slot)
        ? prev.filter(s => s !== slot)
        : [...prev, slot]
    );
  };

  // Save slots
  const handleSave = async () => {
    if (!selectedDate || !user?.id) return;
    setIsSaving(true);
    const key = toISO(selectedDate);
    try {
      const res = await fetch(`${API_URL}/disponibilites/doctor/${user.id}/disponibilites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: key, slots: activeSlots }),
      });
      
      if (!res.ok) throw new Error('Erreur serveur');

      setSavedSlots(prev => ({ ...prev, [key]: activeSlots }));
      setSaveSuccess(true);
      setShowToast(true);
      setTimeout(() => { setSaveSuccess(false); setShowToast(false); }, 3000);
    } catch (err) {
      console.error('Failed to save slots:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Build calendar cells
  const buildCalendarCells = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6;
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    return cells;
  };

  return (
    <>
      {/* Styles */}
      <style>{`
        .avail-page { font-family: 'Poppins', sans-serif; }

        .avail-card {
          background: #FFFFFF;
          border-radius: 16px;
          box-shadow: 0 2px 12px rgba(28, 46, 74, 0.08);
          border: 1px solid rgba(0, 0, 0, 0.06);
          padding: 28px;
        }

        .month-nav-btn {
          width: 36px; height: 36px;
          border-radius: 9999px;
          border: 1px solid rgba(0,0,0,0.08);
          background: transparent;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .month-nav-btn:hover { background: #F7F9FC; }

        .day-cell {
          aspect-ratio: 1;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          border-radius: 10px;
          font-family: 'Poppins', sans-serif;
          font-size: 14px; font-weight: 400;
          color: #4A5568;
          cursor: pointer;
          transition: all 0.15s ease;
          border: 1.5px solid transparent;
          position: relative;
          user-select: none;
        }
        .day-cell:hover { background: #F7F9FC; color: #1C2E4A; }
        .day-cell.today-cell {
          border: 1.5px solid #38C98A;
          color: #23A06B; font-weight: 600;
          background: #E8FAF2;
        }
        .day-cell.selected-cell {
          background: #38C98A !important;
          color: #FFFFFF !important;
          font-weight: 600 !important;
          border-color: #23A06B !important;
          box-shadow: 0 4px 12px rgba(56, 201, 138, 0.30);
        }
        .day-cell.past-cell {
          color: #A0AEC0; cursor: not-allowed; pointer-events: none;
        }
        .day-cell.past-cell:hover { background: transparent; }
        .day-cell.empty-cell { cursor: default; pointer-events: none; }

        .slot-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: #38C98A;
          margin-top: 2px;
          flex-shrink: 0;
        }

        .slot-btn {
          padding: 10px 0;
          width: 100%;
          border-radius: 10px;
          border: 1.5px solid rgba(0, 0, 0, 0.10);
          background: #FFFFFF;
          font-family: 'Poppins', sans-serif;
          font-size: 13px; font-weight: 500;
          color: #4A5568;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: center;
        }
        .slot-btn:hover {
          border-color: #38C98A;
          color: #23A06B;
          background: #E8FAF2;
        }
        .slot-btn.slot-active {
          background: #38C98A;
          border-color: #23A06B;
          color: #FFFFFF;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(56, 201, 138, 0.25);
        }
        .slot-btn.slot-active:hover {
          background: #FF6B6B;
          border-color: #E04040;
          color: #FFFFFF;
        }

        .save-btn {
          width: 100%; margin-top: 20px;
          padding: 13px 0;
          background: #4A90D9;
          color: #FFFFFF;
          border: none;
          border-radius: 9999px;
          font-family: 'Poppins', sans-serif;
          font-weight: 600; font-size: 14px;
          cursor: pointer;
          transition: background 0.15s ease, transform 0.12s ease;
          box-shadow: 0 4px 14px rgba(74, 144, 217, 0.30);
          display: flex; align-items: center; justify-content: center;
          gap: 8px;
        }
        .save-btn:hover { background: #2E6FB8; transform: scale(1.02); }
        .save-btn:active { transform: scale(0.97); }
        .save-btn.saving-state { background: #6FAEE4; cursor: not-allowed; }
        .save-btn.success-state { background: #38C98A; }

        .toast-notif {
          position: fixed;
          top: 24px; right: 24px;
          background: #FFFFFF;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(28, 46, 74, 0.14);
          border-left: 4px solid #38C98A;
          padding: 14px 18px;
          display: flex; align-items: center; gap: 12px;
          z-index: 1000;
          animation: toastSlideIn 0.25s ease;
        }
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 768px) {
          .availability-grid { flex-direction: column !important; }
          .slot-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      <div className="avail-page" style={{ background: '#F7F9FC', borderRadius: 16, padding: '0 0 8px 0' }}>

        {/* Title */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: 'Poppins', fontWeight: 700, fontSize: 24, color: '#1C2E4A', margin: 0 }}>
            Mes disponibilités
          </h1>
          <p style={{ fontFamily: 'Poppins', fontWeight: 400, fontSize: 14, color: '#718096', marginTop: 4, marginBottom: 0 }}>
            Gérez vos jours et créneaux de consultation
          </p>
        </div>

        {/* Main two-card layout */}
        <div className="availability-grid" style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

          {/* LEFT CARD — Calendar */}
          <div className="avail-card" style={{ flex: '0 0 55%' }}>

            {/* Month nav */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <button
                className="month-nav-btn"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                aria-label="Mois précédent"
              >
                <ChevronLeft size={20} color="#4A5568" />
              </button>
              <span style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: 17, color: '#1C2E4A' }}>
                {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </span>
              <button
                className="month-nav-btn"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                aria-label="Mois suivant"
              >
                <ChevronRight size={20} color="#4A5568" />
              </button>
            </div>

            {/* Day labels */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 4, paddingBottom: 12,
              borderBottom: '1px solid rgba(0,0,0,0.06)',
              marginBottom: 8,
            }}>
              {DAY_NAMES.map(d => (
                <div key={d} style={{
                  textAlign: 'center',
                  fontFamily: 'Poppins', fontWeight: 600, fontSize: 12,
                  color: '#A0AEC0',
                }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {buildCalendarCells().map((cell, idx) => {
                if (!cell) return <div key={`e-${idx}`} className="day-cell empty-cell" />;

                const iso = toISO(cell);
                const isPast = cell < today;
                const isSelected = selectedDate ? toISO(selectedDate) === iso : false;
                const isToday = toISO(today) === iso;
                const hasSlots = !!savedSlots[iso]?.length;

                let cellClass = 'day-cell';
                if (isPast) cellClass += ' past-cell';
                else if (isSelected) cellClass += ' selected-cell';
                else if (isToday) cellClass += ' today-cell';

                return (
                  <button
                    key={iso}
                    className={cellClass}
                    disabled={isPast}
                    onClick={() => handleDayClick(cell)}
                    title={iso}
                  >
                    {cell.getDate()}
                    {hasSlots && !isSelected && <span className="slot-dot" />}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{
              marginTop: 20, paddingTop: 16,
              borderTop: '1px solid rgba(0,0,0,0.06)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#38C98A', display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontFamily: 'Poppins', fontWeight: 400, fontSize: 12, color: '#718096' }}>
                Jour avec créneaux
              </span>
            </div>
          </div>

          {/* RIGHT CARD — Time Slots Panel */}
          <div className="avail-card" style={{ flex: '0 0 calc(45% - 20px)', minHeight: 340 }}>
            {!selectedDate ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 280 }}>
                <Calendar size={48} color="#A0AEC0" />
                <p style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: 15, color: '#718096', marginTop: 12, marginBottom: 4 }}>
                  Sélectionnez un jour
                </p>
                <p style={{ fontFamily: 'Poppins', fontWeight: 400, fontSize: 13, color: '#A0AEC0', margin: 0 }}>
                  pour gérer vos créneaux
                </p>
              </div>
            ) : (
              <div>
                {/* Header */}
                <p style={{ fontFamily: 'Poppins', fontWeight: 700, fontSize: 18, color: '#1C2E4A', marginBottom: 4, textTransform: 'capitalize' }}>
                  {formatSelectedDate(toISO(selectedDate))}
                </p>
                <p style={{ fontFamily: 'Poppins', fontWeight: 400, fontSize: 13, color: '#718096', marginBottom: 16 }}>
                  Ajouter un créneau :
                </p>

                {/* Slots grid */}
                <div className="slot-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  {TIME_SLOTS.map(slot => {
                    const isActive = activeSlots.includes(slot);
                    const isHovered = hoveredSlot === slot;
                    let label = `+ ${slot}`;
                    if (isActive) label = isHovered ? `× ${slot}` : `✓ ${slot}`;

                    return (
                      <button
                        key={slot}
                        className={`slot-btn${isActive ? ' slot-active' : ''}`}
                        onClick={() => toggleSlot(slot)}
                        onMouseEnter={() => setHoveredSlot(slot)}
                        onMouseLeave={() => setHoveredSlot(null)}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Save button */}
                <button
                  className={`save-btn${isSaving ? ' saving-state' : ''}${saveSuccess ? ' success-state' : ''}`}
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <><Loader2 size={16} className="spin" /> Enregistrement...</>
                  ) : saveSuccess ? (
                    <><CheckCircle size={16} /> Créneaux enregistrés !</>
                  ) : (
                    <><Save size={16} /> Enregistrer les créneaux</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast notification */}
      {showToast && (
        <div className="toast-notif">
          <CheckCircle size={18} color="#38C98A" />
          <div>
            <p style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: 14, color: '#1C2E4A', margin: 0 }}>
              Créneaux mis à jour
            </p>
            <p style={{ fontFamily: 'Poppins', fontWeight: 400, fontSize: 12, color: '#718096', margin: 0 }}>
              Vos disponibilités ont été enregistrées.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
