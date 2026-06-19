// INSAT Mental Health Chatbot — ChatGPT-style with history sidebar
// Features:
//  Sidebar: list of all past conversations grouped by date
//  Click a past conversation → load and read it (read-only if closed)
//  Resume open conversation from sidebar or banner
//  Rating shown only once per conversation (localStorage)
//  End → close directly (no "done" page)
//  patientId string → int conversion for all API calls

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, X, Send, Loader2, Star, ChevronRight,
  PanelLeftOpen, PanelLeftClose, Plus, MessageSquare,
  Clock, CheckCircle, ChevronDown,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ── Theme config ───────────────────────────────────────────────────────────────
const THEMES = [
  { value: "anxiete",    label: "Anxiété",    icon: "🫀" },
  { value: "stress",     label: "Stress",     icon: "🌀" },
  { value: "sommeil",    label: "Sommeil",    icon: "🌙" },
  { value: "relations",  label: "Relations",  icon: "🤝" },
  { value: "depression", label: "Dépression", icon: "🌧️" },
  { value: "motivation", label: "Motivation", icon: "⚡" },
  { value: "solitude",   label: "Solitude",   icon: "🌿" },
  { value: "autre",      label: "Autre",      icon: "💬" },
];
const themeLabel = (v) => THEMES.find((t) => t.value === v)?.label ?? v;
const themeIcon  = (v) => THEMES.find((t) => t.value === v)?.icon  ?? "💬";

// ── localStorage helpers ───────────────────────────────────────────────────────
const LS_ACTIVE = (pid) => `insat_conv_${pid}`;
const LS_RATED  = (pid) => `insat_rated_${pid}`;

const lsGet   = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const lsSet   = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const lsDel   = (k) => localStorage.removeItem(k);

const getActiveConv  = (pid)       => lsGet(LS_ACTIVE(pid));
const saveActiveConv = (pid, data) => lsSet(LS_ACTIVE(pid), data);
const clearActive    = (pid)       => lsDel(LS_ACTIVE(pid));
const hasRated = (pid, cid) => (lsGet(LS_RATED(pid)) || []).includes(cid);
const markRated = (pid, cid) => {
  const arr = lsGet(LS_RATED(pid)) || [];
  if (!arr.includes(cid)) lsSet(LS_RATED(pid), [...arr, cid]);
};

// ── API helpers ────────────────────────────────────────────────────────────────
const apiFetch = async (method, path, body) => {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.detail || `Erreur ${res.status}`);
  }
  return res.json();
};
const apiPost = (p, b) => apiFetch("POST", p, b);
const apiGet  = (p)    => apiFetch("GET",  p);
const apiPut  = (p, b) => apiFetch("PUT",  p, b);

// ── Date grouping helpers ──────────────────────────────────────────────────────
function groupByDate(conversations) {
  const today     = new Date(); today.setHours(0,0,0,0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const week      = new Date(today); week.setDate(today.getDate() - 7);
  const month     = new Date(today); month.setDate(today.getDate() - 30);

  const groups = { "Aujourd'hui": [], "Hier": [], "7 derniers jours": [], "30 derniers jours": [], "Plus ancien": [] };

  conversations.forEach((c) => {
    const d = new Date(c.date_debut); d.setHours(0,0,0,0);
    if (d >= today)          groups["Aujourd'hui"].push(c);
    else if (d >= yesterday) groups["Hier"].push(c);
    else if (d >= week)      groups["7 derniers jours"].push(c);
    else if (d >= month)     groups["30 derniers jours"].push(c);
    else                     groups["Plus ancien"].push(c);
  });

  return Object.entries(groups).filter(([, arr]) => arr.length > 0);
}

function formatTime(isoStr) {
  if (!isoStr) return "";
  return new Date(isoStr).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <motion.span key={i}
          className="w-2 h-2 rounded-full bg-[var(--color-primary)]/40"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

function Bubble({ msg, isNew }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={isNew ? { opacity: 0, y: 8, scale: 0.97 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center mr-2 mt-1 shrink-0">
          <Bot size={14} className="text-[var(--color-primary)]" />
        </div>
      )}
      <div className={`max-w-[78%] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
        isUser
          ? "bg-[var(--color-primary)] text-white rounded-2xl rounded-br-sm"
          : "bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-bl-sm shadow-sm"
      }`}>
        {msg.content}
      </div>
    </motion.div>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────────

function Sidebar({ pid, activeCid, onSelect, onNewChat, sidebarOpen }) {
  const [conversations, setConversations] = useState([]);
  const [loadingList, setLoadingList]     = useState(true);

  const fetchList = useCallback(async () => {
    setLoadingList(true);
    try {
      const data = await apiGet(`/chatbot/conversations/${pid}`);
      setConversations(data);
    } catch {
      setConversations([]);
    } finally {
      setLoadingList(false);
    }
  }, [pid]);

  useEffect(() => { if (sidebarOpen) fetchList(); }, [sidebarOpen, fetchList]);

  const groups = groupByDate(conversations);

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 200, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="h-full flex flex-col bg-gray-900 overflow-hidden shrink-0"
      style={{ minWidth: 0 }}
    >
      {/* New chat button */}
      <div className="p-3 border-b border-white/10 shrink-0">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-colors"
        >
          <Plus size={14} />
          Nouvelle conversation
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto py-2 px-2">
        {loadingList ? (
          <div className="flex justify-center py-6">
            <Loader2 size={16} className="animate-spin text-white/40" />
          </div>
        ) : groups.length === 0 ? (
          <p className="text-white/30 text-xs text-center py-6 px-3">
            Aucune conversation
          </p>
        ) : (
          groups.map(([label, convs]) => (
            <div key={label} className="mb-3">
              <p className="text-white/30 text-[10px] font-semibold uppercase tracking-wider px-2 mb-1">
                {label}
              </p>
              {convs.map((c) => (
                <button
                  key={c.id_conversation}
                  onClick={() => onSelect(c)}
                  className={`w-full text-left px-2 py-2 rounded-lg mb-0.5 transition-colors group ${
                    activeCid === c.id_conversation
                      ? "bg-white/15 text-white"
                      : "text-white/60 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-sm leading-none">{themeIcon(c.theme)}</span>
                    <span className="text-xs font-medium truncate flex-1">
                      {themeLabel(c.theme)}
                    </span>
                    {c.is_open ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    ) : (
                      <CheckCircle size={10} className="text-white/20 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-white/30">
                    <Clock size={9} />
                    {formatTime(c.date_debut)}
                    <span className="ml-auto">{c.nb_messages} msg</span>
                  </div>
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function Chatbot({ patientId, agentId = 1, onClose }) {
  const pid = parseInt(patientId, 10);

  // phase: "init" | "theme" | "chat" | "readonly" | "rating"
  const [phase,         setPhase]         = useState("init");
  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [selectedTheme, setSelectedTheme] = useState("autre");
  const [conversationId,setConversationId]= useState(null);
  const [isReadOnly,    setIsReadOnly]    = useState(false); // viewing a closed conv
  const [messages,      setMessages]      = useState([]);
  const [newMsgIndex,   setNewMsgIndex]   = useState(-1);
  const [input,         setInput]         = useState("");
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);
  const [rating,        setRating]        = useState(0);
  const [hoverRating,   setHoverRating]   = useState(0);
  const [savedConv,     setSavedConv]     = useState(null);
  // Used to refresh sidebar after a new conv is created/ended
  const [sidebarKey,    setSidebarKey]    = useState(0);

  const bottomRef   = useRef(null);
  const textareaRef = useRef(null);

  // ── Init: check localStorage for open conversation ────────────────────────
  useEffect(() => {
    if (!pid || isNaN(pid)) return;
    const saved = getActiveConv(pid);
    if (saved?.conversationId) setSavedConv(saved);
    setPhase("theme");
  }, [pid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (phase === "chat" && !isReadOnly) textareaRef.current?.focus();
  }, [phase, isReadOnly]);

  // ── Load conversation (resume or view past) ───────────────────────────────
  async function loadConversation(convId, open, theme) {
    setError(null);
    setLoading(true);
    try {
      const history = await apiGet(`/chatbot/history/${convId}?id_patient=${pid}`);
      setConversationId(convId);
      setSelectedTheme(theme || "autre");
      setMessages(history.map((m) => ({ role: m.role, content: m.content })));
      setNewMsgIndex(-1);
      setIsReadOnly(!open); // closed conv → read-only
      setPhase("chat");
    } catch (e) {
      setError("Impossible de charger cette conversation.");
    } finally {
      setLoading(false);
    }
  }

  // ── Sidebar: click on a past conversation ─────────────────────────────────
  async function handleSelectConversation(conv) {
    await loadConversation(conv.id_conversation, conv.is_open, conv.theme);
  }

  // ── Resume open conversation from banner ──────────────────────────────────
  async function resumeConversation() {
    if (!savedConv) return;
    await loadConversation(savedConv.conversationId, true, savedConv.theme);
  }

  // ── Start brand new conversation ──────────────────────────────────────────
  async function startConversation() {
    setError(null);
    setLoading(true);
    try {
      const data = await apiPost("/chatbot/start", {
        id_patient: pid,
        id_ia: agentId,
        theme: selectedTheme,
      });
      const cid = data.id_conversation;
      setConversationId(cid);
      setMessages([{ role: "assistant", content: data.message }]);
      setNewMsgIndex(0);
      setIsReadOnly(false);
      saveActiveConv(pid, {
        conversationId: cid,
        theme: selectedTheme,
        startedAt: new Date().toISOString(),
      });
      setSavedConv(null);
      setSidebarKey((k) => k + 1); // refresh sidebar
      setPhase("chat");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // ── New chat from sidebar button ──────────────────────────────────────────
  function handleNewChat() {
    setConversationId(null);
    setMessages([]);
    setInput("");
    setError(null);
    setIsReadOnly(false);
    setSelectedTheme("autre");
    setPhase("theme");
  }

  // ── Send message ──────────────────────────────────────────────────────────
  async function sendMessage() {
    const text = input.trim();
    if (!text || loading || isReadOnly) return;
    setInput("");
    setError(null);

    const idx = messages.length;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setNewMsgIndex(idx);
    setLoading(true);

    try {
      const data = await apiPost("/chatbot/message", {
        id_conversation: conversationId,
        id_patient: pid,
        message: text,
      });
      setMessages((prev) => {
        setNewMsgIndex(prev.length);
        return [...prev, { role: "assistant", content: data.reply }];
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // ── End conversation ──────────────────────────────────────────────────────
  function handleEndRequest() {
    if (hasRated(pid, conversationId)) {
      closeAndEnd(null);
    } else {
      setPhase("rating");
    }
  }

  async function closeAndEnd(score) {
    setLoading(true);
    try {
      await apiPut(`/chatbot/end/${conversationId}?id_patient=${pid}`, {
        satisfaction: score || null,
      });
      if (score !== null) markRated(pid, conversationId);
      clearActive(pid);
      setSidebarKey((k) => k + 1);
      onClose();
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (phase === "init") return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.97 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      // Widens when sidebar is open. max-h keeps it BELOW the top navbar.
      className={`fixed bottom-24 right-6 z-[9998] h-[580px] max-h-[calc(100vh-150px)] flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-gray-100 transition-all duration-300 ${
        sidebarOpen ? "w-[600px] max-w-[calc(100vw-48px)]" : "w-[400px] max-w-[calc(100vw-48px)]"
      }`}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-[var(--color-primary)] px-4 py-3 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          {/* Sidebar toggle */}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label="Historique"
          >
            {sidebarOpen
              ? <PanelLeftClose size={16} className="text-white" />
              : <PanelLeftOpen  size={16} className="text-white" />
            }
          </button>
          <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
            <Bot size={17} className="text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">Assistant INSAT</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-white/70 text-xs">En ligne</p>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          aria-label="Fermer"
        >
          <X size={16} className="text-white" />
        </button>
      </div>

      {/* ── Body: sidebar + main panel ─────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <Sidebar
              key={sidebarKey}
              pid={pid}
              activeCid={conversationId}
              onSelect={handleSelectConversation}
              onNewChat={handleNewChat}
              sidebarOpen={sidebarOpen}
            />
          )}
        </AnimatePresence>

        {/* Main panel */}
        <div className="flex-1 flex flex-col bg-[#f7f8fc] overflow-hidden min-w-0">

          {/* ════════════════════════════════════════════════════════════════
              PHASE: THEME SELECTION
          ════════════════════════════════════════════════════════════════ */}
          {phase === "theme" && (
            <div className="flex-1 flex flex-col p-5 gap-4 overflow-y-auto">

              {/* Resume banner */}
              {savedConv && (
                <div className="rounded-xl bg-white border border-[var(--color-primary)]/20 p-3 flex items-start gap-3 shrink-0">
                  <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <MessageSquare size={15} className="text-[var(--color-primary)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">Conversation en cours</p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {themeIcon(savedConv.theme)} {themeLabel(savedConv.theme)}
                      {" · "}
                      {new Date(savedConv.startedAt).toLocaleString("fr-FR", {
                        day: "numeric", month: "short",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <button
                    onClick={resumeConversation}
                    disabled={loading}
                    className="shrink-0 px-3 py-1.5 bg-[var(--color-primary)] text-white text-xs font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {loading ? <Loader2 size={12} className="animate-spin" /> : "Reprendre"}
                  </button>
                </div>
              )}

              {/* Heading */}
              <div className={`text-center shrink-0 ${savedConv ? "" : "mt-2"}`}>
                {savedConv ? (
                  <div className="flex items-center gap-2 my-1">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Plus size={10} /> Nouvelle conversation
                    </span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                ) : (
                  <>
                    <p className="text-2xl mb-2">👋</p>
                    <h2 className="text-gray-800 font-semibold text-base">Bonjour, je suis là pour vous</h2>
                    <p className="text-gray-500 text-sm mt-1">De quoi souhaitez-vous parler ?</p>
                  </>
                )}
              </div>

              {/* Theme grid */}
              <div className="grid grid-cols-2 gap-2 w-full">
                {THEMES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setSelectedTheme(t.value)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all duration-150 text-left ${
                      selectedTheme === t.value
                        ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm"
                        : "bg-white text-gray-700 border-gray-200 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                    }`}
                  >
                    <span className="text-base">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>

              {error && (
                <p className="text-red-500 text-xs text-center bg-red-50 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}

              <button
                onClick={startConversation}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-60 text-white font-semibold text-sm py-3 rounded-xl transition-opacity mt-auto"
              >
                {loading
                  ? <Loader2 size={16} className="animate-spin" />
                  : <> Commencer <ChevronRight size={16} /> </>
                }
              </button>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              PHASE: CHAT (active or read-only)
          ════════════════════════════════════════════════════════════════ */}
          {phase === "chat" && (
            <>
              {/* Sub-header: theme + read-only badge */}
              <div className="px-4 py-2 bg-white border-b border-gray-100 shrink-0 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {themeIcon(selectedTheme)}{" "}
                  <span className="font-medium text-[var(--color-primary)]">
                    {themeLabel(selectedTheme)}
                  </span>
                </span>
                {isReadOnly && (
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle size={10} /> Conversation terminée
                  </span>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
                {messages.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                    <MessageSquare size={28} className="text-gray-200 mb-3" />
                    <p className="text-gray-400 text-sm">Aucun message</p>
                  </div>
                )}
                {messages.map((m, i) => (
                  <Bubble key={i} msg={m} isNew={i === newMsgIndex} />
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="w-7 h-7 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center mr-2 mt-1 shrink-0">
                      <Bot size={14} className="text-[var(--color-primary)]" />
                    </div>
                    <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm shadow-sm">
                      <TypingDots />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {error && (
                <div className="mx-4 mb-2 text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg shrink-0">
                  {error}
                </div>
              )}

              {/* Input area — hidden when read-only */}
              {!isReadOnly ? (
                <>
                  <div className="p-3 bg-white border-t border-gray-100 shrink-0">
                    <div className="flex items-end gap-2">
                      <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Écrivez votre message…"
                        rows={1}
                        disabled={loading}
                        className="flex-1 resize-none bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/20 disabled:opacity-50 transition-colors"
                        style={{ lineHeight: "1.5", maxHeight: "112px", overflowY: "auto" }}
                        onInput={(e) => {
                          e.target.style.height = "auto";
                          e.target.style.height = Math.min(e.target.scrollHeight, 112) + "px";
                        }}
                      />
                      <button
                        onClick={sendMessage}
                        disabled={loading || !input.trim()}
                        aria-label="Envoyer"
                        className="w-10 h-10 bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-opacity shrink-0"
                      >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="px-4 py-2 bg-white border-t border-gray-100 flex justify-between items-center shrink-0">
                    <button
                      onClick={handleNewChat}
                      className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
                    >
                      <Plus size={12} /> Nouvelle
                    </button>
                    <button
                      onClick={handleEndRequest}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                    >
                      Terminer
                    </button>
                  </div>
                </>
              ) : (
                /* Read-only footer */
                <div className="px-4 py-3 bg-white border-t border-gray-100 shrink-0 flex justify-center">
                  <button
                    onClick={handleNewChat}
                    className="flex items-center gap-2 text-sm text-[var(--color-primary)] font-medium hover:opacity-80 transition-opacity"
                  >
                    <Plus size={14} />
                    Nouvelle conversation
                  </button>
                </div>
              )}
            </>
          )}

          {/* ════════════════════════════════════════════════════════════════
              PHASE: RATING
          ════════════════════════════════════════════════════════════════ */}
          {phase === "rating" && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6">
              <div className="text-center">
                <p className="text-3xl mb-3">🌿</p>
                <h2 className="text-gray-800 font-semibold text-base">Merci pour cette conversation</h2>
                <p className="text-gray-500 text-sm mt-1">Comment s'est passée cette session ?</p>
              </div>
              <div className="flex gap-2">
                {[1,2,3,4,5].map((n) => (
                  <button
                    key={n}
                    onMouseEnter={() => setHoverRating(n)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(n)}
                    className="transition-transform hover:scale-110"
                    aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
                  >
                    <Star size={32} className={`transition-colors ${
                      n <= (hoverRating || rating) ? "fill-amber-400 text-amber-400" : "text-gray-200"
                    }`} />
                  </button>
                ))}
              </div>
              {error && (
                <p className="text-red-500 text-xs text-center bg-red-50 px-3 py-2 rounded-lg w-full">
                  {error}
                </p>
              )}
              <div className="flex flex-col gap-2 w-full">
                <button
                  onClick={() => closeAndEnd(rating)}
                  disabled={loading || rating === 0}
                  className="w-full flex items-center justify-center gap-2 bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 text-white font-semibold text-sm py-3 rounded-xl transition-opacity"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : "Valider et terminer"}
                </button>
                <button
                  onClick={() => closeAndEnd(null)}
                  disabled={loading}
                  className="w-full text-gray-400 hover:text-gray-600 text-sm py-2 transition-colors"
                >
                  Passer cette étape
                </button>
              </div>
            </div>
          )}

        </div>{/* end main panel */}
      </div>{/* end body */}
    </motion.div>
  );
}
