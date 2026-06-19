/**
 * NotificationPanel
 * =================
 * Real-time notification bell for the Navbar.
 *
 * - On mount: fetches notifications from the real backend API
 * - Polls every 30 s for new notifications (lightweight: only unread count)
 * - Full refresh when panel is opened
 * - markRead / markAllRead / dismiss are backed by API calls
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, CheckCheck, Calendar, MessageCircle, Settings, Clock, CreditCard, Brain, Stethoscope } from 'lucide-react';
import { useNotifStore, type Notification, type NotifType } from '../../store/notifStore';
import { useAuthStore } from '../../store/authStore';

const POLL_INTERVAL_MS = 30_000; // 30 seconds

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return 'À l\'instant';
  if (diff < 3600)  return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
  return `Il y a ${Math.floor(diff / 86400)} jour(s)`;
}

const TYPE_META: Record<NotifType, { icon: React.ElementType; color: string; bg: string }> = {
  appointment:            { icon: Calendar,      color: 'text-[var(--color-primary)]', bg: 'bg-cyan-50'    },
  appointment_confirmed:  { icon: Calendar,      color: 'text-emerald-600',            bg: 'bg-emerald-50' },
  appointment_cancelled:  { icon: Calendar,      color: 'text-red-500',                bg: 'bg-red-50'     },
  appointment_approved:   { icon: Calendar,      color: 'text-emerald-600',            bg: 'bg-emerald-50' },
  appointment_rejected:   { icon: Calendar,      color: 'text-red-500',                bg: 'bg-red-50'     },
  message:                { icon: MessageCircle, color: 'text-emerald-600',            bg: 'bg-emerald-50' },
  session_created:        { icon: Calendar,      color: 'text-blue-600',               bg: 'bg-blue-50'    },
  session_completed:      { icon: Calendar,      color: 'text-teal-600',               bg: 'bg-teal-50'    },
  payment:                { icon: CreditCard,    color: 'text-green-600',              bg: 'bg-green-50'   },
  ai_diagnosis:           { icon: Brain,         color: 'text-purple-600',             bg: 'bg-purple-50'  },
  ai_treatment:           { icon: Stethoscope,   color: 'text-indigo-600',             bg: 'bg-indigo-50'  },
  system:                 { icon: Settings,      color: 'text-purple-600',             bg: 'bg-purple-50'  },
  reminder:               { icon: Clock,         color: 'text-amber-600',              bg: 'bg-amber-50'   },
};

// Map auth role to DB user_role value
function toDbRole(role: string | null): string {
  if (role === 'doctor' || role === 'clinic') return role;
  return 'patient';
}

export default function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigate = useNavigate();

  const { user, role } = useAuthStore();
  const { notifications, loading, fetchNotifications, markRead, markAllRead, dismiss } =
    useNotifStore();

  const userId = user?.id ? Number(user.id) : 0;
  const userRole = toDbRole(role);

  // ── Fetch helper ────────────────────────────────────────────────────────────
  const refresh = useCallback(() => {
    if (userId) fetchNotifications(userId, userRole);
  }, [userId, userRole, fetchNotifications]);

  // ── Initial fetch + polling ─────────────────────────────────────────────────
  useEffect(() => {
    refresh();
    pollRef.current = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [refresh]);

  // ── Full refresh when panel opens ───────────────────────────────────────────
  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  // ── Close on outside click ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unread = notifications.filter(n => !n.read).length;

  // ── Notification click handler ──────────────────────────────────────────────
  const handleNotificationClick = (notif: Notification) => {
    // Mark as read first
    if (!notif.read) {
      markRead(notif.id, userId, userRole);
    }

    // Navigate based on notification type and related data
    let targetRoute = '';

    if (notif.type.startsWith('appointment')) {
      if (notif.related_id && notif.related_type === 'rendezvous') {
        if (role === 'doctor' || role === 'clinic') {
          // Doctor: go to RDV tab with the specific appointment
          targetRoute = `/doctor/dashboard?tab=rdv&highlight=${notif.related_id}`;
        } else {
          // Patient: go to their appointments
          targetRoute = `/patient/dashboard?tab=appointments&highlight=${notif.related_id}`;
        }
      } else {
        // Fallback routes
        if (role === 'doctor' || role === 'clinic') {
          targetRoute = '/doctor/dashboard?tab=rdv';
        } else {
          targetRoute = '/patient/dashboard?tab=appointments';
        }
      }
    } else if (notif.type === 'message') {
      targetRoute = '/messages';
    } else if (notif.type.startsWith('session')) {
      targetRoute = '/sessions';
    } else if (notif.type === 'payment') {
      targetRoute = '/payments';
    } else if (notif.type.startsWith('ai_')) {
      if (role === 'doctor' || role === 'clinic') {
        targetRoute = '/doctor/dashboard?tab=diagnostics';
      } else {
        targetRoute = '/patient/dashboard?tab=diagnostics';
      }
    } else {
      // Default fallback
      if (role === 'doctor' || role === 'clinic') {
        targetRoute = '/doctor/dashboard';
      } else {
        targetRoute = '/patient/dashboard';
      }
    }

    // Navigate and close panel
    if (targetRoute) {
      navigate(targetRoute);
      setOpen(false);
    }
  };

  const handleMarkAllRead = () => {
    markAllRead(userId, userRole);
  };

  const handleDismiss = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    dismiss(id, userId, userRole);
  };

  return (
    <div className="relative" ref={panelRef}>

      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-xl hover:bg-gray-50 text-gray-400 hover:text-gray-700 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold px-1">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute right-0 mt-2 w-[360px] bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
          style={{ animation: 'slideInDown 0.2s ease-out' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-[var(--color-primary)]" />
              <h3 className="font-bold text-gray-800">Notifications</h3>
              {unread > 0 && (
                <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-full">
                  {unread} nouvelles
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-xs text-[var(--color-primary)] font-medium hover:underline"
                >
                  <CheckCheck size={14} /> Tout lire
                </button>
              )}
              {/* Manual refresh */}
              <button
                onClick={refresh}
                disabled={loading}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Actualiser"
              >
                <svg
                  className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M4 4v5h.582M20 20v-5h-.581M5.635 19A9 9 0 104.582 9H4" />
                </svg>
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-50">
            {loading && notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <div className="w-6 h-6 border-2 border-gray-200 border-t-[var(--color-primary)] rounded-full animate-spin mb-3" />
                <p className="text-sm">Chargement…</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Bell size={40} className="mb-3 opacity-30" />
                <p className="text-sm">Aucune notification</p>
              </div>
            ) : (
              notifications.map(notif => {
                const meta = TYPE_META[notif.type] ?? TYPE_META['system'];
                const Icon = meta.icon;
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`flex items-start gap-3 px-4 py-3.5 transition-all hover:bg-gray-50 cursor-pointer border-l-4 border-l-transparent hover:border-l-[var(--color-primary)] ${
                      !notif.read ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    {/* Icon */}
                    <div className={`w-9 h-9 rounded-full ${meta.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <Icon size={16} className={meta.color} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-semibold truncate ${notif.read ? 'text-gray-600' : 'text-gray-900'}`}>
                          {notif.title}
                        </p>
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] flex-shrink-0" />
                        )}
                        <span className="text-[10px] text-gray-400 ml-auto">Cliquer pour voir</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.body}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <p className="text-[10px] text-gray-400">{timeAgo(notif.time)}</p>
                        {!notif.read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markRead(notif.id, userId, userRole);
                            }}
                            className="text-[10px] text-[var(--color-primary)] font-medium hover:underline"
                          >
                            Marquer comme lu
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Dismiss */}
                    <button
                      onClick={e => handleDismiss(e, notif.id)}
                      className="flex-shrink-0 p-1 rounded-lg hover:bg-gray-200 text-gray-300 hover:text-gray-600 transition-colors mt-0.5"
                    >
                      <X size={13} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 text-center">
              <button
                onClick={() => setOpen(false)}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Fermer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
