/**
 * Notification Store
 * ==================
 * Real API-backed notification state using Zustand.
 * Replaces the previous fake-seed implementation.
 *
 * - Fetches notifications from GET /notifications/
 * - Polls every 30 seconds for new notifications
 * - Persists nothing to localStorage (always fresh from server)
 * - Exposes markRead, markAllRead, dismiss backed by real API calls
 */

import { create } from 'zustand';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export type NotifType =
  | 'appointment'
  | 'appointment_confirmed'
  | 'appointment_cancelled'
  | 'appointment_approved'
  | 'appointment_rejected'
  | 'message'
  | 'session_created'
  | 'session_completed'
  | 'payment'
  | 'ai_diagnosis'
  | 'ai_treatment'
  | 'system'
  | 'reminder';

export interface Notification {
  id: string;           // DB id as string for UI key compatibility
  type: NotifType;
  title: string;
  body: string;
  time: string;         // ISO string (mapped from created_at)
  read: boolean;        // mapped from is_read
  related_id?: number;
  related_type?: string;
}

interface NotifState {
  notifications: Notification[];
  loading: boolean;
  /** Fetch all notifications for this user from the API */
  fetchNotifications: (userId: number, userRole: string) => Promise<void>;
  markRead: (id: string, userId: number, userRole: string) => Promise<void>;
  markAllRead: (userId: number, userRole: string) => Promise<void>;
  dismiss: (id: string, userId: number, userRole: string) => Promise<void>;
  /** Legacy no-op — kept so existing call sites don't break */
  seedForRole: (role: string) => void;
}

function mapRow(row: any): Notification {
  return {
    id: String(row.id),
    type: row.type as NotifType,
    title: row.title,
    body: row.body,
    time: row.created_at,
    read: row.is_read,
    related_id: row.related_id,
    related_type: row.related_type,
  };
}

export const useNotifStore = create<NotifState>((set, get) => ({
  notifications: [],
  loading: false,

  // ── no-op shim so old call sites (seedForRole) don't crash ──────────────
  seedForRole: () => {},

  // ── Fetch ────────────────────────────────────────────────────────────────
  fetchNotifications: async (userId, userRole) => {
    if (!userId || !userRole) return;
    set({ loading: true });
    try {
      const res = await fetch(
        `${API_URL}/notifications/?user_id=${userId}&user_role=${userRole}&limit=50`
      );
      if (!res.ok) return;
      const data: any[] = await res.json();
      set({ notifications: data.map(mapRow) });
    } catch {
      // Silently fail — the bell simply shows no badge
    } finally {
      set({ loading: false });
    }
  },

  // ── Mark one as read ─────────────────────────────────────────────────────
  markRead: async (id, userId, userRole) => {
    // Optimistic update
    set(s => ({
      notifications: s.notifications.map(n =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
    try {
      await fetch(
        `${API_URL}/notifications/${id}/read?user_id=${userId}&user_role=${userRole}`,
        { method: 'PATCH' }
      );
    } catch {
      // Revert on failure
      set(s => ({
        notifications: s.notifications.map(n =>
          n.id === id ? { ...n, read: false } : n
        ),
      }));
    }
  },

  // ── Mark all as read ──────────────────────────────────────────────────────
  markAllRead: async (userId, userRole) => {
    // Optimistic
    set(s => ({
      notifications: s.notifications.map(n => ({ ...n, read: true })),
    }));
    try {
      await fetch(
        `${API_URL}/notifications/read-all?user_id=${userId}&user_role=${userRole}`,
        { method: 'PATCH' }
      );
    } catch {
      // Non-fatal — next poll will reconcile
    }
  },

  // ── Dismiss (delete) ──────────────────────────────────────────────────────
  dismiss: async (id, userId, userRole) => {
    // Optimistic
    set(s => ({
      notifications: s.notifications.filter(n => n.id !== id),
    }));
    try {
      await fetch(
        `${API_URL}/notifications/${id}?user_id=${userId}&user_role=${userRole}`,
        { method: 'DELETE' }
      );
    } catch {
      // Non-fatal
    }
  },
}));
