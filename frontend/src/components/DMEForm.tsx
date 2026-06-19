import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import {
  User, FileText, Paperclip, Save, Upload, Trash2, FileIcon,
  Stethoscope, Lock, Image as ImageIcon,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface Props {
  patientId: number | string;
  role: "patient" | "doctor";
  uploaderName?: string;
}

// Form field groups
const INFO_FIELDS: { key: string; label: string; type?: string; full?: boolean; options?: string[] }[] = [
  { key: "nom", label: "Nom" },
  { key: "prenom", label: "Prénom" },
  { key: "date_naissance", label: "Date de naissance", type: "date" },
  { key: "sexe", label: "Sexe", type: "select", options: ["Homme", "Femme", "Autre"] },
  { key: "telephone", label: "Téléphone" },
  { key: "email", label: "Email", type: "email" },
  { key: "adresse", label: "Adresse", full: true },
  { key: "contact_urgence_nom", label: "Contact d'urgence (nom)" },
  { key: "contact_urgence_tel", label: "Contact d'urgence (téléphone)" },
  { key: "numero_assurance", label: "Numéro d'assurance" },
  { key: "groupe_sanguin", label: "Groupe sanguin" },
  { key: "medecin_traitant", label: "Médecin traitant" },
];
const MEDICAL_FIELDS: { key: string; label: string }[] = [
  { key: "allergies", label: "Allergies connues" },
  { key: "medicaments_en_cours", label: "Médicaments en cours" },
  { key: "antecedents_medicaux", label: "Antécédents médicaux" },
];

export default function DMEForm({ patientId, role, uploaderName }: Props) {
  const isDoctor = role === "doctor";
  const [data, setData] = useState<any>({});
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Charge tout le DME (formulaire + documents) — appelé seulement au montage
  const load = () => {
    setLoading(true);
    fetch(`${API_URL}/dme/${patientId}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d || {});
        setDocs(d?.documents || []);
      })
      .catch(() => toast.error("Erreur lors du chargement du dossier"))
      .finally(() => setLoading(false));
  };

  // Charge UNIQUEMENT les documents — appelé après upload/suppression
  // pour ne PAS écraser les notes en cours de saisie
  const loadDocsOnly = () => {
    fetch(`${API_URL}/dme/${patientId}`)
      .then((r) => r.json())
      .then((d) => {
        setDocs(d?.documents || []);
      })
      .catch(() => {});
  };

  useEffect(load, [patientId]);

  const set = (k: string, v: string) => setData((p: any) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      // Send all non-null fields; the backend filters by role.
      const payload: any = {};
      [...INFO_FIELDS, ...MEDICAL_FIELDS].forEach((f) => {
        if (data[f.key] != null) payload[f.key] = data[f.key];
      });
      if (isDoctor) {
        ["diagnostic"].forEach((k) => {
          if (data[k] != null) payload[k] = data[k];
        });
      }
      const res = await fetch(`${API_URL}/dme/${patientId}?role=${role}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.detail || "Erreur");
      }
      toast.success("Dossier enregistré !");
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("role", role);
      fd.append("uploader_name", uploaderName || "");
      const res = await fetch(`${API_URL}/dme/${patientId}/documents`, { method: "POST", body: fd });
      if (!res.ok) {
        const er = await res.json().catch(() => ({}));
        throw new Error(er.detail || "Erreur");
      }
      toast.success("Document ajouté !");
      loadDocsOnly();
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'upload");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const deleteDoc = async (id: number) => {
    if (!confirm("Supprimer ce document ?")) return;
    try {
      const res = await fetch(`${API_URL}/dme/${patientId}/documents/${id}?role=${role}`, { method: "DELETE" });
      if (!res.ok) {
        const er = await res.json().catch(() => ({}));
        throw new Error(er.detail || "Erreur");
      }
      toast.success("Document supprimé");
      loadDocsOnly();
    } catch (e: any) {
      toast.error(e.message || "Suppression refusée");
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-400 animate-pulse">Chargement du dossier…</div>;

  return (
    <div className="space-y-6">
      {/* ===== INFORMATIONS ===== */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-1">
          <User className="text-blue-600" size={20} /> Informations du patient
        </h3>
        <p className="text-sm text-slate-400 mb-5">
          {isDoctor ? "Vous pouvez compléter ou corriger ces informations." : "Renseignez vos informations personnelles."}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {INFO_FIELDS.map((f) => (
            <div key={f.key} className={f.full ? "md:col-span-2" : ""}>
              <label className="block text-sm font-medium text-slate-600 mb-1">{f.label}</label>
              {f.type === "select" ? (
                <select
                  value={data[f.key] || ""}
                  onChange={(e) => set(f.key, e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                >
                  <option value="">— Sélectionner —</option>
                  {f.options?.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={f.type || "text"}
                  value={data[f.key] || ""}
                  onChange={(e) => set(f.key, e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"
                />
              )}
            </div>
          ))}
        </div>

        <h4 className="text-sm font-semibold text-slate-500 mt-6 mb-3">Informations médicales</h4>
        <div className="grid grid-cols-1 gap-4">
          {MEDICAL_FIELDS.map((f) => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-slate-600 mb-1">{f.label}</label>
              <textarea
                rows={2}
                value={data[f.key] || ""}
                onChange={(e) => set(f.key, e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm resize-none"
              />
            </div>
          ))}
        </div>
      </section>

      {/* ===== COMPTE-RENDU (therapeute) ===== */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-1">
          <Stethoscope className="text-emerald-600" size={20} /> Compte-rendu du thérapeute
          {!isDoctor && <Lock size={15} className="text-slate-300 ml-1" />}
        </h3>
        <p className="text-sm text-slate-400 mb-5">
          {isDoctor ? "Diagnostic du thérapeute." : "Rédigé par votre thérapeute (lecture seule)."}
        </p>
        {["diagnostic"].map((k) => {
          const labels: Record<string, string> = {
            diagnostic: "Diagnostic",
          };
          return (
            <div key={k} className="mb-4">
              <label className="block text-sm font-medium text-slate-600 mb-1">{labels[k]}</label>
              <textarea
                rows={3}
                value={data[k] || ""}
                onChange={(e) => set(k, e.target.value)}
                disabled={!isDoctor}
                placeholder={!isDoctor ? "—" : ""}
                className={`w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm resize-none ${
                  isDoctor ? "focus:ring-2 focus:ring-emerald-500" : "bg-slate-50 text-slate-500 cursor-not-allowed"
                }`}
              />
            </div>
          );
        })}
      </section>

      {/* ===== DOCUMENTS ===== */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
            <Paperclip className="text-violet-600" size={20} /> Documents
          </h3>
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold cursor-pointer hover:bg-blue-700">
            <Upload size={16} /> {uploading ? "Envoi…" : "Ajouter"}
            <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>

        {docs.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">Aucun document. Ajoutez une photo ou un PDF.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {docs.map((d) => {
              const url = d.file_url?.startsWith("http") ? d.file_url : `${API_URL}${d.file_url}`;
              return (
                <div key={d.id} className="group relative border border-slate-200 rounded-xl overflow-hidden">
                  <a href={url} target="_blank" rel="noreferrer" className="block">
                    {d.file_type === "image" ? (
                      <img src={url} alt={d.original_name} className="w-full h-28 object-cover" />
                    ) : (
                      <div className="w-full h-28 flex flex-col items-center justify-center bg-red-50 text-red-500">
                        <FileIcon size={28} /> <span className="text-xs mt-1">PDF</span>
                      </div>
                    )}
                  </a>
                  <div className="p-2">
                    <p className="text-xs text-slate-600 truncate">{d.original_name || "document"}</p>
                    <p className="text-[10px] text-slate-400">{d.uploaded_by === "doctor" ? "Thérapeute" : "Patient"}</p>
                  </div>
                  {isDoctor && (
                    <button
                      onClick={() => deleteDoc(d.id)}
                      className="absolute top-1 right-1 p-1.5 rounded-lg bg-white/90 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                      title="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SAVE BAR */}
      <div className="sticky bottom-4 flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold shadow-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Save size={18} /> {saving ? "Enregistrement…" : "Enregistrer le dossier"}
        </button>
      </div>
    </div>
  );
}
