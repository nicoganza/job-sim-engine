'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, X, GripVertical, ChevronRight, Zap, CheckCircle, Clock, AlignLeft, List, Mail, Phone, LayoutGrid } from 'lucide-react';
import { api } from '@/lib/api';
import { Button, Badge, Alert } from '@/components/ui';

type Step = {
  id: string;
  orderIndex: number;
  type: string;
  title: string;
  instructions: string;
  timeLimitSeconds?: number;
};

type Job = { id: string; title: string; status: string };
type Sim = { id: string; title: string; status: string; steps: Step[] };

const MODULE_LABELS: Record<string, string> = {
  multiple_choice:       'Scelta multipla',
  free_text:             'Testo libero',
  crm_prioritization:    'Prioritizzazione CRM',
  notification_reaction: 'Reazione notifiche',
  email_response:        'Risposta email',
  simulated_call:        'Chiamata simulata',
};

const MODULE_ICONS: Record<string, React.ReactNode> = {
  multiple_choice:       <List size={14} />,
  free_text:             <AlignLeft size={14} />,
  crm_prioritization:    <LayoutGrid size={14} />,
  notification_reaction: <Zap size={14} />,
  email_response:        <Mail size={14} />,
  simulated_call:        <Phone size={14} />,
};

const MODULE_COLORS: Record<string, string> = {
  multiple_choice:       'bg-blue-50 text-blue-700',
  free_text:             'bg-ink-100 text-ink-700',
  crm_prioritization:    'bg-purple-50 text-purple-700',
  notification_reaction: 'bg-yellow-50 text-yellow-700',
  email_response:        'bg-green-50 text-green-700',
  simulated_call:        'bg-brand-subtle text-brand',
};

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

function StepEditor({ step, simId, onSave }: { step: Step; simId: string; onSave: (s: Step) => void }) {
  const [form, setForm] = useState({
    title: step.title,
    instructions: step.instructions,
    timeLimitSeconds: step.timeLimitSeconds != null ? String(step.timeLimitSeconds) : '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm({
      title: step.title,
      instructions: step.instructions,
      timeLimitSeconds: step.timeLimitSeconds != null ? String(step.timeLimitSeconds) : '',
    });
    setSaved(false);
  }, [step.id]);

  async function save() {
    setSaving(true);
    try {
      await api.patch(`/api/simulations/${simId}/steps/${step.id}`, {
        ...form,
        timeLimitSeconds: form.timeLimitSeconds ? Number(form.timeLimitSeconds) : null,
      });
      onSave({ ...step, ...form, timeLimitSeconds: form.timeLimitSeconds ? Number(form.timeLimitSeconds) : undefined });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  const color = MODULE_COLORS[step.type] ?? 'bg-ink-100 text-ink-700';
  const icon = MODULE_ICONS[step.type];

  return (
    <div className="flex flex-col h-full">
      {/* Editor header */}
      <div className="px-7 pt-6 pb-4 border-b border-ink-100 flex items-center gap-3">
        <span className={`inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-lg ${color}`}>
          {icon}
          {MODULE_LABELS[step.type] ?? step.type}
        </span>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-auto px-7 py-6 flex flex-col gap-6">
        <div>
          <label className="block text-[13px] font-semibold text-ink-700 mb-2">Titolo dello step</label>
          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full border border-ink-200 rounded-xl px-4 py-2.5 text-[14px] text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
            placeholder="es. Risposta a un'email di un cliente arrabbiato"
          />
        </div>

        <div>
          <label className="block text-[13px] font-semibold text-ink-700 mb-2">Istruzioni per il candidato</label>
          <textarea
            value={form.instructions}
            onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))}
            rows={8}
            className="w-full border border-ink-200 rounded-xl px-4 py-3 text-[14px] text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition resize-y leading-relaxed"
            placeholder="Descrivi il contesto e cosa il candidato deve fare..."
          />
        </div>

        <div className="max-w-xs">
          <label className="block text-[13px] font-semibold text-ink-700 mb-2">
            Limite di tempo
            <span className="text-ink-400 font-normal ml-1">(secondi, opzionale)</span>
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={form.timeLimitSeconds}
              onChange={e => setForm(f => ({ ...f, timeLimitSeconds: e.target.value }))}
              className="w-32 border border-ink-200 rounded-xl px-4 py-2.5 text-[14px] text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
              placeholder="600"
              min={0}
            />
            {form.timeLimitSeconds && (
              <span className="text-[13px] text-ink-500">
                = {Math.floor(Number(form.timeLimitSeconds) / 60)}m {Number(form.timeLimitSeconds) % 60}s
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-7 py-4 border-t border-ink-100 flex items-center justify-between bg-white">
        {saved && (
          <span className="flex items-center gap-1.5 text-[13px] text-success font-medium">
            <CheckCircle size={14} /> Salvato
          </span>
        )}
        {!saved && <span />}
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? 'Salvataggio…' : 'Salva modifiche'}
        </Button>
      </div>
    </div>
  );
}

export default function SimulationBuilderPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const router = useRouter();

  const [job, setJob]         = useState<Job | null>(null);
  const [sim, setSim]         = useState<Sim | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Step | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished]   = useState(false);
  const [creating, setCreating]     = useState(false);
  const [msg, setMsg]               = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace(`/company/login?redirect=/builder/${jobId}`);
    }
  }, [jobId, router]);

  useEffect(() => {
    api.get<Job>(`/api/jobs/${jobId}`).then(setJob).catch(() => {});
    api.get<Sim>(`/api/jobs/${jobId}/simulation`)
      .then(s => { setSim(s); if (s.steps.length > 0) setSelected(s.steps[0]); })
      .catch(() => setSim(null))
      .finally(() => setLoading(false));
  }, [jobId]);

  async function createSim() {
    setCreating(true);
    try {
      const s = await api.post<Sim>(`/api/jobs/${jobId}/simulation`, { title: 'Simulazione', description: '' });
      setSim({ ...s, steps: s.steps ?? [] });
    } finally { setCreating(false); }
  }

  async function addStep(type: string) {
    if (!sim) return;
    const step = await api.post<Step>(`/api/simulations/${sim.id}/steps`, {
      type,
      title: `Nuovo step — ${MODULE_LABELS[type]}`,
      instructions: '',
      config: getDefaultConfig(type),
    });
    setSim(s => s ? { ...s, steps: [...s.steps, step] } : s);
    setSelected(step);
  }

  async function publish() {
    if (!sim) return;
    setPublishing(true); setMsg(null);
    try {
      await api.post(`/api/simulations/${sim.id}/publish`);
      setPublished(true);
      setMsg({ tone: 'success', text: 'Simulazione pubblicata — i candidati vedranno questa versione.' });
    } catch (e: any) {
      setMsg({ tone: 'danger', text: e.message });
    } finally { setPublishing(false); }
  }

  function closeTab() {
    window.close();
    // fallback if window.close() is blocked
    setTimeout(() => router.back(), 200);
  }

  const sortedSteps = (sim?.steps ?? []).slice().sort((a, b) => a.orderIndex - b.orderIndex);

  // ─── Loading ───
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-ink-200 border-t-brand rounded-full animate-spin" />
      </div>
    );
  }

  // ─── No simulation yet ───
  if (!sim) {
    return (
      <>
        {/* Topbar */}
        <header className="h-[56px] flex items-center px-6 border-b border-ink-200 bg-white shrink-0 gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-brand rounded-md flex items-center justify-center shrink-0">
              <span className="text-white text-[12px] font-bold font-display">M</span>
            </div>
            <span className="font-semibold text-[15px] text-ink-950">Simulazione</span>
            {job && <><span className="text-ink-300">·</span><span className="text-[14px] text-ink-500">{job.title}</span></>}
          </div>
          <div className="ml-auto">
            <button onClick={closeTab} className="text-ink-400 hover:text-ink-700 transition-colors p-1">
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center flex-col gap-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-subtle flex items-center justify-center mb-2">
            <Zap size={26} className="text-brand" />
          </div>
          <h2 className="text-[20px] font-semibold text-ink-950">Nessuna simulazione</h2>
          <p className="text-[14px] text-ink-500 max-w-xs text-center">
            Crea la prima simulazione per questa offerta e aggiungi gli step che i candidati dovranno completare.
          </p>
          <Button onClick={createSim} disabled={creating} iconLeft={<Plus size={15} />}>
            {creating ? 'Creazione…' : 'Crea simulazione'}
          </Button>
        </div>
      </>
    );
  }

  // ─── Builder ───
  return (
    <>
      {/* Topbar */}
      <header className="h-[56px] flex items-center px-6 border-b border-ink-200 bg-white shrink-0 gap-4 z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 bg-brand rounded-md flex items-center justify-center shrink-0">
            <span className="text-white text-[12px] font-bold font-display">M</span>
          </div>
          <span className="font-semibold text-[15px] text-ink-950 shrink-0">Simulazione</span>
          {job && (
            <>
              <span className="text-ink-300 shrink-0">·</span>
              <span className="text-[14px] text-ink-600 truncate">{job.title}</span>
            </>
          )}
        </div>

        <div className="ml-auto flex items-center gap-3 shrink-0">
          <span className="text-[12px] text-ink-400 hidden sm:block">
            {sortedSteps.length} {sortedSteps.length === 1 ? 'step' : 'step'}
          </span>
          <Badge
            tone={sim.status === 'published' || published ? 'success' : 'warning'}
            dot
          >
            {sim.status === 'published' || published ? 'Pubblicata' : 'Bozza'}
          </Badge>
          <Button
            size="sm"
            onClick={publish}
            disabled={publishing || sortedSteps.length === 0}
          >
            {publishing ? 'Pubblicazione…' : 'Pubblica versione'}
          </Button>
          <div className="w-px h-5 bg-ink-200" />
          <button onClick={closeTab} className="text-ink-400 hover:text-ink-700 transition-colors p-1">
            <X size={18} />
          </button>
        </div>
      </header>

      {/* Alert */}
      {msg && (
        <div className="px-6 pt-3 shrink-0">
          <Alert tone={msg.tone}>{msg.text}</Alert>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left: step list ── */}
        <aside className="w-[260px] border-r border-ink-200 bg-white flex flex-col shrink-0">
          <div className="px-4 py-3 border-b border-ink-100">
            <p className="text-[11px] font-semibold text-ink-400 uppercase tracking-widest">Step</p>
          </div>

          <div className="flex-1 overflow-auto py-2">
            {sortedSteps.length === 0 && (
              <p className="text-[13px] text-ink-400 text-center mt-8 px-4">
                Nessuno step ancora.<br />Aggiungine uno qui sotto.
              </p>
            )}
            {sortedSteps.map((step, i) => {
              const isActive = selected?.id === step.id;
              const color = MODULE_COLORS[step.type] ?? 'bg-ink-100 text-ink-700';
              const icon = MODULE_ICONS[step.type];
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setSelected(step)}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${
                    isActive ? 'bg-ink-100' : 'hover:bg-ink-50'
                  }`}
                >
                  <span className="text-[11px] font-bold text-ink-400 mt-0.5 w-4 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-ink-900 truncate">{step.title}</div>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold mt-1 px-1.5 py-0.5 rounded ${color}`}>
                      {icon}
                      {MODULE_LABELS[step.type] ?? step.type}
                    </span>
                  </div>
                  {isActive && <ChevronRight size={13} className="text-ink-400 mt-0.5 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Add step */}
          <div className="border-t border-ink-100 px-4 py-3">
            <p className="text-[11px] font-semibold text-ink-400 uppercase tracking-widest mb-2">Aggiungi step</p>
            <div className="flex flex-col gap-1">
              {Object.entries(MODULE_LABELS).map(([type, label]) => {
                const icon = MODULE_ICONS[type];
                const color = MODULE_COLORS[type];
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => addStep(type)}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] font-medium text-ink-700 hover:bg-ink-50 transition-colors text-left"
                  >
                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded ${color}`}>{icon}</span>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* ── Center: step editor ── */}
        <main className="flex-1 overflow-hidden bg-white flex flex-col">
          {selected ? (
            <StepEditor
              key={selected.id}
              step={selected}
              simId={sim.id}
              onSave={updated => {
                setSim(s => s ? { ...s, steps: s.steps.map(st => st.id === updated.id ? updated : st) } : s);
                setSelected(updated);
              }}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-ink-400 gap-3">
              <GripVertical size={32} className="text-ink-200" />
              <p className="text-[14px]">Seleziona uno step dalla lista per modificarlo.</p>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
