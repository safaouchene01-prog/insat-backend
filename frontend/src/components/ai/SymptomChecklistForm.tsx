/**
 * SymptomChecklistForm
 * =====================
 * 84 binary symptom checkboxes grouped by clinical category.
 * Submits to POST /assistant-ai/diagnosis/manual.
 */

import { useState } from 'react';
import { Brain, Send, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ── Symptom categories ──────────────────────────────────────────────────────

export const SYMPTOM_CATEGORIES: { label: string; color: string; symptoms: { key: string; label: string }[] }[] = [
  {
    label: 'Dépression',
    color: 'blue',
    symptoms: [
      { key: 'humeur_depressive_persistante',       label: 'Humeur dépressive persistante' },
      { key: 'perte_interet_plaisir',               label: 'Perte d\'intérêt / plaisir' },
      { key: 'modification_appetit_poids',          label: 'Modification de l\'appétit / poids' },
      { key: 'insomnie_hypersomnie',                label: 'Insomnie ou hypersomnie' },
      { key: 'agitation_ralentissement_psychomoteur', label: 'Agitation / ralentissement psychomoteur' },
      { key: 'fatigue_perte_energie',               label: 'Fatigue / perte d\'énergie' },
      { key: 'devalorisation_culpabilite',          label: 'Dévalorisation / culpabilité' },
      { key: 'difficulte_concentration',            label: 'Difficultés de concentration' },
      { key: 'pensees_recurrentes_mort',            label: 'Pensées récurrentes liées à la mort' },
    ],
  },
  {
    label: 'Anxiété Généralisée',
    color: 'amber',
    symptoms: [
      { key: 'anxiete_excessive_persistante',       label: 'Anxiété excessive persistante' },
      { key: 'difficulte_controle_inquietudes',     label: 'Difficultés à contrôler les inquiétudes' },
      { key: 'tension_musculaire',                  label: 'Tension musculaire' },
      { key: 'fatigabilite',                        label: 'Fatigabilité' },
      { key: 'irritabilite',                        label: 'Irritabilité' },
      { key: 'troubles_sommeil',                    label: 'Troubles du sommeil' },
    ],
  },
  {
    label: 'Trouble Panique',
    color: 'red',
    symptoms: [
      { key: 'palpitations',                        label: 'Palpitations' },
      { key: 'dyspnee',                             label: 'Dyspnée (essoufflement)' },
      { key: 'douleurs_thoraciques',                label: 'Douleurs thoraciques' },
      { key: 'vertiges',                            label: 'Vertiges' },
      { key: 'tremblements',                        label: 'Tremblements' },
      { key: 'sudation',                            label: 'Sudation excessive' },
      { key: 'peur_mourir',                         label: 'Peur de mourir' },
      { key: 'peur_perdre_controle',                label: 'Peur de perdre le contrôle' },
    ],
  },
  {
    label: 'TOC',
    color: 'purple',
    symptoms: [
      { key: 'pensees_intrusives',                  label: 'Pensées intrusives' },
      { key: 'images_mentales_recurrentes',         label: 'Images mentales récurrentes' },
      { key: 'impulsions_non_desirees',             label: 'Impulsions non désirées' },
      { key: 'lavages_excessifs',                   label: 'Lavages excessifs' },
      { key: 'verifications_repetees',              label: 'Vérifications répétées' },
      { key: 'comptages',                           label: 'Comptages compulsifs' },
      { key: 'rituels_mentaux',                     label: 'Rituels mentaux' },
      { key: 'reorganisation_compulsive',           label: 'Réorganisation compulsive' },
    ],
  },
  {
    label: 'TSPT',
    color: 'teal',
    symptoms: [
      { key: 'reviviscences_traumatiques',          label: 'Reviviscences traumatiques' },
      { key: 'cauchemars',                          label: 'Cauchemars' },
      { key: 'flashbacks',                          label: 'Flashbacks' },
      { key: 'evitement',                           label: 'Évitement' },
      { key: 'hypervigilance',                      label: 'Hypervigilance' },
    ],
  },
  {
    label: 'Trouble Bipolaire',
    color: 'orange',
    symptoms: [
      { key: 'humeur_expansive',                    label: 'Humeur expansive' },
      { key: 'reduction_besoin_sommeil',            label: 'Réduction du besoin de sommeil' },
      { key: 'acceleration_pensee',                 label: 'Accélération de la pensée' },
      { key: 'hyperactivite',                       label: 'Hyperactivité' },
      { key: 'prises_risques_excessives',           label: 'Prises de risques excessives' },
    ],
  },
  {
    label: 'Schizophrénie',
    color: 'indigo',
    symptoms: [
      { key: 'hallucinations',                      label: 'Hallucinations' },
      { key: 'idees_delirantes',                    label: 'Idées délirantes' },
      { key: 'discours_desorganise',                label: 'Discours désorganisé' },
      { key: 'comportement_desorganise',            label: 'Comportement désorganisé' },
      { key: 'aplatissement_affectif',              label: 'Aplatissement affectif' },
      { key: 'retrait_social',                      label: 'Retrait social' },
      { key: 'avolition',                           label: 'Avolition' },
      { key: 'pauvrete_discours',                   label: 'Pauvreté du discours' },
      { key: 'deficits_attentionnels',              label: 'Déficits attentionnels' },
      { key: 'troubles_executifs',                  label: 'Troubles exécutifs' },
      { key: 'difficultes_memoire_travail',         label: 'Difficultés de mémoire de travail' },
    ],
  },
  {
    label: 'Personnalité Paranoïaque',
    color: 'slate',
    symptoms: [
      { key: 'mefiance_excessive',                  label: 'Méfiance excessive' },
      { key: 'suspicion_permanente',                label: 'Suspicion permanente' },
      { key: 'hypersensibilite_critiques',          label: 'Hypersensibilité aux critiques' },
      { key: 'difficulte_accorder_confiance',       label: 'Difficulté à accorder sa confiance' },
      { key: 'interpretation_intentions_malveillantes', label: 'Interprétation malveillante des intentions' },
    ],
  },
  {
    label: 'Personnalité Borderline',
    color: 'pink',
    symptoms: [
      { key: 'instabilite_relationnelle',           label: 'Instabilité relationnelle' },
      { key: 'impulsivite',                         label: 'Impulsivité' },
      { key: 'perturbation_identite',               label: 'Perturbation de l\'identité' },
      { key: 'instabilite_emotionnelle',            label: 'Instabilité émotionnelle' },
      { key: 'peur_intense_abandon',                label: 'Peur intense d\'abandon' },
      { key: 'sentiment_chronique_vide',            label: 'Sentiment chronique de vide' },
    ],
  },
  {
    label: 'TSA (Autisme)',
    color: 'green',
    symptoms: [
      { key: 'difficultes_interactions_sociales',   label: 'Difficultés d\'interactions sociales' },
      { key: 'difficultes_reciprocite_emotionnelle', label: 'Difficultés de réciprocité émotionnelle' },
      { key: 'difficultes_relationnelles',          label: 'Difficultés relationnelles' },
      { key: 'stereotypies',                        label: 'Stéréotypies' },
      { key: 'interets_restreints',                 label: 'Intérêts restreints' },
      { key: 'rigidite_comportementale',            label: 'Rigidité comportementale' },
      { key: 'particularites_sensorielles',         label: 'Particularités sensorielles' },
    ],
  },
  {
    label: 'TDAH',
    color: 'yellow',
    symptoms: [
      { key: 'distractibilite',                     label: 'Distractibilité' },
      { key: 'oublis_frequents',                    label: 'Oublis fréquents' },
      { key: 'desorganisation',                     label: 'Désorganisation' },
      { key: 'difficulte_maintien_attention',       label: 'Difficulté de maintien de l\'attention' },
      { key: 'agitation_motrice',                   label: 'Agitation motrice' },
      { key: 'difficulte_rester_assis',             label: 'Difficulté à rester assis' },
      { key: 'interruptions_frequentes',            label: 'Interruptions fréquentes' },
      { key: 'reponses_impulsives',                 label: 'Réponses impulsives' },
    ],
  },
  {
    label: 'Troubles liés aux substances',
    color: 'rose',
    symptoms: [
      { key: 'craving',                             label: 'Craving (besoin irrépressible)' },
      { key: 'perte_controle',                      label: 'Perte de contrôle' },
      { key: 'tolerance',                           label: 'Tolérance' },
      { key: 'symptomes_sevrage',                   label: 'Symptômes de sevrage' },
      { key: 'alteration_fonctionnement_social',    label: 'Altération du fonctionnement social' },
      { key: 'poursuite_malgre_consequences',       label: 'Poursuite malgré les conséquences' },
    ],
  },
];

// Colour maps (Tailwind-safe literal classes)
const COLOR_MAP: Record<string, { bg: string; border: string; title: string; check: string; count: string }> = {
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   title: 'text-blue-800',   check: 'accent-blue-600',   count: 'bg-blue-100 text-blue-700' },
  amber:  { bg: 'bg-amber-50',  border: 'border-amber-200',  title: 'text-amber-800',  check: 'accent-amber-500',  count: 'bg-amber-100 text-amber-700' },
  red:    { bg: 'bg-red-50',    border: 'border-red-200',    title: 'text-red-800',    check: 'accent-red-500',    count: 'bg-red-100 text-red-700' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', title: 'text-purple-800', check: 'accent-purple-600', count: 'bg-purple-100 text-purple-700' },
  teal:   { bg: 'bg-teal-50',   border: 'border-teal-200',   title: 'text-teal-800',   check: 'accent-teal-600',   count: 'bg-teal-100 text-teal-700' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', title: 'text-orange-800', check: 'accent-orange-500', count: 'bg-orange-100 text-orange-700' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', title: 'text-indigo-800', check: 'accent-indigo-600', count: 'bg-indigo-100 text-indigo-700' },
  slate:  { bg: 'bg-slate-50',  border: 'border-slate-200',  title: 'text-slate-800',  check: 'accent-slate-600',  count: 'bg-slate-100 text-slate-700' },
  pink:   { bg: 'bg-pink-50',   border: 'border-pink-200',   title: 'text-pink-800',   check: 'accent-pink-500',   count: 'bg-pink-100 text-pink-700' },
  green:  { bg: 'bg-green-50',  border: 'border-green-200',  title: 'text-green-800',  check: 'accent-green-600',  count: 'bg-green-100 text-green-700' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', title: 'text-yellow-800', check: 'accent-yellow-500', count: 'bg-yellow-100 text-yellow-700' },
  rose:   { bg: 'bg-rose-50',   border: 'border-rose-200',   title: 'text-rose-800',   check: 'accent-rose-500',   count: 'bg-rose-100 text-rose-700' },
};

// Build the initial all-zero state
const buildInitialSymptoms = (): Record<string, number> => {
  const s: Record<string, number> = {};
  SYMPTOM_CATEGORIES.forEach(cat => cat.symptoms.forEach(sym => { s[sym.key] = 0; }));
  return s;
};

interface Props {
  patientId: number;
  therapeuteId: number;
  onResult: (data: any) => void;
}

export default function SymptomChecklistForm({ patientId, therapeuteId, onResult }: Props) {
  const [symptoms, setSymptoms] = useState<Record<string, number>>(buildInitialSymptoms);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const totalActive = Object.values(symptoms).filter(v => v === 1).length;

  const toggle = (key: string) =>
    setSymptoms(prev => ({ ...prev, [key]: prev[key] === 1 ? 0 : 1 }));

  const toggleCategory = (label: string) =>
    setCollapsed(prev => ({ ...prev, [label]: !prev[label] }));

  const reset = () => setSymptoms(buildInitialSymptoms());

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/assistant-ai/diagnosis/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_patient: patientId,
          id_therapeute: therapeuteId,
          symptoms,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Erreur ${res.status}`);
      }
      const data = await res.json();
      onResult(data);
      toast.success('Diagnostic généré avec succès');
    } catch (e: any) {
      toast.error(`Erreur : ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">

      {/* Summary bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-50 text-[var(--color-primary)] flex items-center justify-center">
            <Brain size={18} />
          </div>
          <div>
            <p className="font-[Poppins] font-semibold text-[14px] text-[#1C2E4A]">
              Formulaire d'évaluation symptomatique
            </p>
            <p className="font-[Poppins] text-[12px] text-[#718096]">
              {totalActive} symptôme{totalActive !== 1 ? 's' : ''} sélectionné{totalActive !== 1 ? 's' : ''}
              {' '}/ 84
            </p>
          </div>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[#718096] hover:text-[#1C2E4A] font-[Poppins] text-[12px] font-medium hover:bg-gray-50 rounded-lg transition-all"
        >
          <RotateCcw size={13} />
          Réinitialiser
        </button>
      </div>

      {/* Category cards */}
      {SYMPTOM_CATEGORIES.map(cat => {
        const c = COLOR_MAP[cat.color];
        const catActive = cat.symptoms.filter(s => symptoms[s.key] === 1).length;
        const isCollapsed = collapsed[cat.label] ?? false;

        return (
          <div key={cat.label} className={`rounded-2xl border overflow-hidden ${c.border}`}>
            {/* Category header — click to collapse */}
            <button
              onClick={() => toggleCategory(cat.label)}
              className={`w-full flex items-center justify-between px-5 py-3 ${c.bg} text-left`}
            >
              <div className="flex items-center gap-3">
                <span className={`font-[Poppins] font-bold text-[14px] ${c.title}`}>
                  {cat.label}
                </span>
                {catActive > 0 && (
                  <span className={`px-2 py-0.5 rounded-full font-[Poppins] font-bold text-[11px] ${c.count}`}>
                    {catActive} actif{catActive > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className={`flex items-center gap-2 ${c.title}`}>
                <span className="font-[Poppins] text-[12px] opacity-60">
                  {cat.symptoms.length} symptômes
                </span>
                {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </div>
            </button>

            {/* Symptom checkboxes */}
            {!isCollapsed && (
              <div className="bg-white px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {cat.symptoms.map(sym => (
                  <label
                    key={sym.key}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 cursor-pointer group transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={symptoms[sym.key] === 1}
                      onChange={() => toggle(sym.key)}
                      className={`w-4 h-4 rounded flex-shrink-0 ${c.check}`}
                    />
                    <span className={`font-[Poppins] text-[13px] transition-colors ${
                      symptoms[sym.key] === 1
                        ? `font-semibold ${c.title}`
                        : 'text-[#4A5568] group-hover:text-[#1C2E4A]'
                    }`}>
                      {sym.label}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Submit */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-[Poppins] font-semibold text-[14px] text-[#1C2E4A]">
              {totalActive} symptôme{totalActive !== 1 ? 's' : ''} sélectionné{totalActive !== 1 ? 's' : ''}
            </p>
            <p className="font-[Poppins] text-[12px] text-[#718096] mt-0.5">
              Le modèle CatBoost va générer le Top 3 des diagnostics probables.
            </p>
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading || totalActive === 0}
            className="flex items-center gap-2 px-6 py-3 bg-[var(--color-primary)] text-white rounded-xl font-[Poppins] font-semibold text-[14px] hover:bg-[var(--color-secondary)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Analyse…
              </>
            ) : (
              <>
                <Send size={16} />
                Lancer le diagnostic
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
