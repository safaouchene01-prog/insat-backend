import { useState, useRef, useEffect } from 'react';
import { Activity, Check, RotateCcw } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Questions posées au patient (clé = nom exact du symptôme attendu par le modèle)
const QUESTIONS: { key: string; text: string }[] = [
  { key: 'humeur_depressive_persistante', text: "Vous sentez-vous triste ou déprimé(e) presque tous les jours ?" },
  { key: 'perte_interet_plaisir', text: "Avez-vous perdu l'intérêt ou le plaisir pour vos activités habituelles ?" },
  { key: 'fatigue_perte_energie', text: "Ressentez-vous une fatigue ou un manque d'énergie persistant ?" },
  { key: 'troubles_sommeil', text: "Avez-vous des troubles du sommeil (insomnie ou trop dormir) ?" },
  { key: 'difficulte_concentration', text: "Avez-vous des difficultés à vous concentrer ?" },
  { key: 'devalorisation_culpabilite', text: "Vous sentez-vous souvent dévalorisé(e) ou coupable ?" },
  { key: 'pensees_recurrentes_mort', text: "Avez-vous des pensées récurrentes liées à la mort ?" },
  { key: 'anxiete_excessive_persistante', text: "Ressentez-vous une anxiété excessive et persistante ?" },
  { key: 'difficulte_controle_inquietudes', text: "Avez-vous du mal à contrôler vos inquiétudes ?" },
  { key: 'palpitations', text: "Avez-vous des palpitations ou le cœur qui s'emballe sans raison ?" },
  { key: 'peur_mourir', text: "Avez-vous parfois une peur soudaine de mourir ?" },
  { key: 'pensees_intrusives', text: "Avez-vous des pensées intrusives que vous n'arrivez pas à chasser ?" },
  { key: 'verifications_repetees', text: "Faites-vous des vérifications répétées (portes, gaz, etc.) ?" },
  { key: 'lavages_excessifs', text: "Vous lavez-vous de façon excessive ?" },
  { key: 'reviviscences_traumatiques', text: "Revivez-vous un événement traumatisant (souvenirs, flashbacks) ?" },
  { key: 'cauchemars', text: "Faites-vous des cauchemars répétés ?" },
  { key: 'hypervigilance', text: "Êtes-vous constamment sur vos gardes (hypervigilance) ?" },
  { key: 'humeur_expansive', text: "Avez-vous parfois des périodes d'euphorie ou d'énergie débordante ?" },
  { key: 'reduction_besoin_sommeil', text: "Avez-vous des périodes où vous dormez très peu sans être fatigué(e) ?" },
  { key: 'irritabilite', text: "Êtes-vous facilement irritable ?" },
  { key: 'retrait_social', text: "Avez-vous tendance à vous isoler des autres ?" },
  { key: 'difficulte_maintien_attention', text: "Avez-vous du mal à maintenir votre attention sur une tâche ?" },
  { key: 'agitation_motrice', text: "Ressentez-vous une agitation, un besoin de bouger en permanence ?" },
  { key: 'craving', text: "Ressentez-vous un besoin irrépressible de consommer une substance ?" },
];

interface Msg { from: 'bot' | 'user'; text: string; }

export default function SymptomeChatbot() {
  const { user } = useAuthStore();

  // Étape 0 = choix du médecin, ensuite le questionnaire
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [messages, setMessages] = useState<Msg[]>([]);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Charger la liste des médecins
  useEffect(() => {
    fetch(`${API_URL}/therapeutes/`)
      .then(r => r.json())
      .then(data => setDoctors(Array.isArray(data) ? data : []))
      .catch(() => setDoctors([]));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, result]);

  const startQuestionnaire = (doctor: any) => {
    setSelectedDoctor(doctor);
    setMessages([
      { from: 'bot', text: `Vous avez choisi Dr. ${doctor.nom} ${doctor.prenom}. Je vais vous poser quelques questions ; répondez par Oui ou Non.` },
      { from: 'bot', text: QUESTIONS[0].text },
    ]);
  };

  const answer = async (value: 0 | 1) => {
    const q = QUESTIONS[current];
    const newAnswers = { ...answers, [q.key]: value };
    setAnswers(newAnswers);
    setMessages(m => [...m, { from: 'user', text: value === 1 ? 'Oui' : 'Non' }]);

    const next = current + 1;
    if (next < QUESTIONS.length) {
      setCurrent(next);
      setTimeout(() => {
        setMessages(m => [...m, { from: 'bot', text: QUESTIONS[next].text }]);
      }, 300);
    } else {
      setFinished(true);
      setMessages(m => [...m, { from: 'bot', text: "Merci ! J'analyse vos réponses…" }]);
      await sendToModel(newAnswers);
    }
  };

  const sendToModel = async (finalAnswers: Record<string, number>) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/diagnostic/predire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptomes: finalAnswers,
          idPatient: user?.id ? Number(user.id) : null,
          idTherapeute: selectedDoctor
            ? Number(selectedDoctor.idtherapeute || selectedDoctor.idTherapeute || selectedDoctor.id)
            : null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data);
      setMessages(m => [...m, { from: 'bot', text: `Vos réponses ont bien été enregistrées et transmises à Dr. ${selectedDoctor?.nom} ${selectedDoctor?.prenom}.` }]);
    } catch (e: any) {
      setMessages(m => [...m, { from: 'bot', text: "Une erreur est survenue lors de l'analyse. Réessayez plus tard." }]);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const restart = () => {
    setCurrent(0);
    setAnswers({});
    setFinished(false);
    setResult(null);
    setSelectedDoctor(null);
    setMessages([]);
  };

  const progress = Math.round((current / QUESTIONS.length) * 100);

  return (
    <div>
      <h2 className="text-xl font-bold text-[var(--color-dark)] mb-6 flex items-center gap-2">
        <Activity className="text-[var(--color-primary)]" size={22} /> Questionnaire de symptômes
      </h2>

      {/* ÉTAPE 0 : choix du médecin */}
      {!selectedDoctor && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-gray-700 mb-4 font-medium">
            Choisissez le médecin qui recevra vos réponses :
          </p>
          {doctors.length === 0 ? (
            <p className="text-gray-400 text-sm">Chargement des médecins…</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {doctors.map((d, i) => (
                <button
                  key={i}
                  onClick={() => startQuestionnaire(d)}
                  className="flex items-center gap-3 p-4 rounded-xl border-2 border-gray-100 hover:border-[var(--color-primary)] hover:bg-cyan-50 text-left transition-all"
                >
                  <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-700 font-bold flex-shrink-0">
                    {d.nom?.[0]}{d.prenom?.[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">Dr. {d.nom} {d.prenom}</p>
                    <p className="text-xs text-gray-500">{d.specialite || 'Spécialiste'}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ÉTAPE 1+ : le chatbot */}
      {selectedDoctor && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col" style={{ height: '520px' }}>

          {!finished && (
            <div className="px-5 pt-4">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Question {current + 1} / {QUESTIONS.length}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full">
                <div className="h-2 bg-[var(--color-primary)] rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
                  m.from === 'user'
                    ? 'bg-[var(--color-primary)] text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}

            {result && (
              <div className="mt-4 p-4 rounded-2xl bg-cyan-50 border border-cyan-100">
                <p className="flex items-center gap-2 font-bold text-[var(--color-dark)] mb-2">
                  <Check size={18} className="text-[var(--color-primary)]" /> Questionnaire terminé
                </p>
                <p className="text-sm text-gray-600">
                  Vos réponses ont été transmises à votre médecin. Lui seul interprétera le résultat lors de votre consultation.
                </p>
              </div>
            )}
          </div>

          {!finished && (
            <div className="p-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => answer(1)}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] transition-colors"
              >
                Oui
              </button>
              <button
                onClick={() => answer(0)}
                className="flex-1 py-3 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Non
              </button>
            </div>
          )}

          {finished && (
            <div className="p-4 border-t border-gray-100 flex justify-center">
              <button
                onClick={restart}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2 rounded-xl font-medium text-[var(--color-primary)] hover:bg-cyan-50 transition-colors"
              >
                <RotateCcw size={16} /> Refaire le questionnaire
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
