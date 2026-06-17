'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

type Step = { id: string; orderIndex: number; type: string; title: string; instructions: string; timeLimitSeconds?: number };
type Sim = { id: string; title: string; status: string; steps: Step[] };

const MODULE_LABELS: Record<string, string> = {
  multiple_choice: 'Scelta multipla',
  free_text: 'Testo libero',
  crm_prioritization: 'Prioritizzazione CRM',
  notification_reaction: 'Reazione notifiche',
  email_response: 'Risposta email',
  simulated_call: 'Chiamata simulata',
};

export default function SimulationBuilderPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [sim, setSim] = useState<Sim | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Step | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [msg, setMsg] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.get<Sim>(`/api/jobs/${jobId}/simulation`).then(setSim).catch(() => setSim(null)).finally(() => setLoading(false));
  }, [jobId]);

  async function createSim() {
    setCreating(true);
    const s = await api.post<Sim>(`/api/jobs/${jobId}/simulation`, { title: 'New Simulation', description: '' });
    setSim(s);
    setCreating(false);
  }

  async function addStep(type: string) {
    if (!sim) return;
    const step = await api.post<Step>(`/api/simulations/${sim.id}/steps`, {
      type, title: `New ${MODULE_LABELS[type]} Step`, instructions: 'Instructions here.',
      config: getDefaultConfig(type),
    });
    setSim(s => s ? { ...s, steps: [...s.steps, step] } : s);
    setSelected(step);
  }

  async function publish() {
    if (!sim) return;
    setPublishing(true); setMsg('');
    try {
      await api.post(`/api/simulations/${sim.id}/publish`);
      setMsg('Simulation published as new version!');
    } catch (e: any) { setMsg(e.message); } finally { setPublishing(false); }
  }

  if (loading) return <div className="text-gray-500">Caricamento...</div>;

  if (!sim) return (
    <div className="text-center py-16">
      <p className="text-gray-500 mb-4">Nessuna simulazione per questa offerta.</p>
      <button onClick={createSim} disabled={creating} className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
        {creating ? 'Creazione...' : 'Crea simulazione'}
      </button>
    </div>
  );

  return (
    <div className="flex gap-0 h-full">
      {/* Step list */}
      <div className="w-72 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-sm">{sim.title}</h2>
          <span className="text-xs text-gray-500">{sim.steps.length} step · {sim.status}</span>
        </div>
        <div className="flex-1 overflow-auto p-2 space-y-1">
          {sim.steps.sort((a, b) => a.orderIndex - b.orderIndex).map(step => (
            <button key={step.id} onClick={() => setSelected(step)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${selected?.id === step.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}`}>
              <div className="font-medium truncate">{step.title}</div>
              <div className="text-xs text-gray-400">{MODULE_LABELS[step.type] ?? step.type}</div>
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-gray-200">
          <p className="text-xs font-medium text-gray-500 mb-2">Aggiungi step</p>
          <div className="grid grid-cols-2 gap-1">
            {Object.entries(MODULE_LABELS).map(([type, label]) => (
              <button key={type} onClick={() => addStep(type)}
                className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1.5 rounded text-left transition">
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Step editor */}
      <div className="flex-1 p-6 bg-gray-50 overflow-auto">
        {msg && <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${msg.includes('!') ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-600'}`}>{msg}</div>}
        {selected ? (
          <StepEditor step={selected} simId={sim.id} onSave={(updated) => {
            setSim(s => s ? { ...s, steps: s.steps.map(st => st.id === updated.id ? updated : st) } : s);
            setSelected(updated);
          }} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            Seleziona uno step da modificare o aggiungine uno nuovo.
          </div>
        )}
      </div>

      {/* Right panel - actions */}
      <div className="w-56 border-l border-gray-200 bg-white p-4 flex flex-col gap-3">
        <h3 className="font-semibold text-sm">Pubblica</h3>
        <p className="text-xs text-gray-500">La pubblicazione crea una versione immutabile. I candidati useranno questa versione.</p>
        <button onClick={publish} disabled={publishing} className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
          {publishing ? 'Pubblicazione...' : '🚀 Pubblica versione'}
        </button>
      </div>
    </div>
  );
}

function StepEditor({ step, simId, onSave }: { step: Step; simId: string; onSave: (s: Step) => void }) {
  const [form, setForm] = useState({ title: step.title, instructions: step.instructions, timeLimitSeconds: step.timeLimitSeconds ?? '' });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api.patch(`/api/simulations/${simId}/steps/${step.id}`, { ...form, timeLimitSeconds: form.timeLimitSeconds ? Number(form.timeLimitSeconds) : null });
      onSave({ ...step, ...form, timeLimitSeconds: form.timeLimitSeconds ? Number(form.timeLimitSeconds) : undefined });
    } finally { setSaving(false); }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">{step.type}</span>
        <h3 className="font-semibold">Modifica step</h3>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Titolo</label>
        <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Istruzioni</label>
        <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[100px]" value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Limite di tempo (secondi)</label>
        <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.timeLimitSeconds} onChange={e => setForm(f => ({ ...f, timeLimitSeconds: e.target.value }))} />
      </div>
      <button onClick={save} disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
        {saving ? 'Salvataggio...' : 'Salva modifiche'}
      </button>
    </div>
  );
}

function getDefaultConfig(type: string): Record<string, unknown> {
  const defaults: Record<string, unknown> = {
    multiple_choice: { question: 'Question here?', options: [{ id: 'a', label: 'Option A', isCorrect: true }, { id: 'b', label: 'Option B', isCorrect: false }], allowMultiple: false, randomizeOptions: false },
    free_text: { prompt: 'Describe your approach...', expectedSignals: [], redFlags: [], rubric: [] },
    crm_prioritization: { scenarioContext: '', taskPrompt: '', records: [], requiredExplanation: true, expectedTopRecordIds: [], scoringWeights: { topChoiceAccuracy: 0.35, rankingQuality: 0.30, explanationQuality: 0.25, riskAwareness: 0.10 } },
    notification_reaction: { scenarioContext: '', taskPrompt: '', notifications: [], allowedActions: ['reply', 'ignore', 'escalate', 'schedule_followup', 'create_task'], scoringWeights: { actionChoice: 0.4, prioritization: 0.3, communication: 0.2, escalationJudgment: 0.1 } },
    email_response: { scenarioContext: '', emailThread: [], taskPrompt: '', expectedSignals: [], redFlags: [], rubric: [] },
    simulated_call: { callType: 'sales_discovery', title: '', publicCandidateBrief: '', estimatedDurationSeconds: 600, maxDurationSeconds: 720, aiPersona: { name: 'Alex', role: 'Prospect', personality: 'Professional and direct.', communicationStyle: 'Concise.', baselineMood: 'neutral' }, publicBusinessContext: { knownContext: [] }, hiddenBuyerState: { initialInterestLevel: 50, initialTrustLevel: 40, initialUrgencyLevel: 30, hiddenObjections: [], buyingCriteria: [], dealBreakers: [] }, allowedOutcomes: ['schedule_follow_up', 'schedule_demo'], guardrails: { doNotRevealHiddenObjectionsDirectly: true, requireCandidateDiscoveryBeforeRevealingObjections: true, preventEasyAgreement: true, stayInPersona: true, refuseOutOfScenarioRequests: true }, scoringRubric: [] },
  };
  return (defaults[type] ?? {}) as Record<string, unknown>;
}
