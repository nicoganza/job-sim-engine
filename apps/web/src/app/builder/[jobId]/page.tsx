'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, X, GripVertical, ChevronRight, Zap, CheckCircle, Trash2, AlignLeft, List, Mail, Phone, LayoutGrid, Sparkles, Table2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button, Badge, Alert } from '@/components/ui';
import { ConfigEditor } from './ConfigEditor';

type Step = {
  id: string;
  orderIndex: number;
  type: string;
  title: string;
  instructions: string;
  config: any;
  timeLimitSeconds?: number;
};

type Job = { id: string; title: string; status: string };
type Sim = { id: string; title: string; status: string; steps: Step[] };

const MODULE_LABELS: Record<string, string> = {
  welcome:               'Benvenuto / Onboarding',
  multiple_choice:       'Scelta multipla',
  free_text:             'Testo libero',
  crm_prioritization:    'Prioritizzazione CRM',
  notification_reaction: 'Reazione notifiche',
  email_response:        'Risposta email',
  simulated_call:        'Chiamata simulata',
  spreadsheet_edit:      'Foglio di calcolo',
};

const MODULE_ICONS: Record<string, React.ReactNode> = {
  welcome:               <CheckCircle size={14} />,
  multiple_choice:       <List size={14} />,
  free_text:             <AlignLeft size={14} />,
  crm_prioritization:    <LayoutGrid size={14} />,
  notification_reaction: <Zap size={14} />,
  email_response:        <Mail size={14} />,
  simulated_call:        <Phone size={14} />,
  spreadsheet_edit:      <Table2 size={14} />,
};

const MODULE_COLORS: Record<string, string> = {
  welcome:               'bg-indigo-50 text-indigo-700',
  multiple_choice:       'bg-blue-50 text-blue-700',
  free_text:             'bg-ink-100 text-ink-700',
  crm_prioritization:    'bg-purple-50 text-purple-700',
  notification_reaction: 'bg-yellow-50 text-yellow-700',
  email_response:        'bg-green-50 text-green-700',
  simulated_call:        'bg-brand-subtle text-brand',
  spreadsheet_edit:      'bg-emerald-50 text-emerald-700',
};

function validateStepConfig(type: string, config: any): string[] {
  const keys: string[] = [];
  const miss = (key: string) => keys.push(key);
  switch (type) {
    case 'welcome': {
      const hasTts = !!(config.slides?.length || config.persona);
      if (!hasTts) {
        if (!config.founderName?.trim()) miss('founderName');
        if (!config.founderMessage?.trim()) miss('founderMessage');
      } else {
        if (!config.persona?.name?.trim()) miss('persona');
        if (!config.slides?.length || config.slides.some((s: any) => !s.text?.trim())) miss('slides');
      }
      break;
    }
    case 'multiple_choice':
      if (!config.question?.trim()) miss('question');
      if (!config.options?.length || config.options.length < 2) miss('options');
      else if (!config.options.some((o: any) => o.isCorrect)) miss('options_correct');
      break;
    case 'free_text':
      if (!config.prompt?.trim()) miss('prompt');
      break;
    case 'crm_prioritization':
      if (!config.scenarioContext?.trim()) miss('scenarioContext');
      if (!config.taskPrompt?.trim()) miss('taskPrompt');
      if (!config.records?.length) miss('records');
      if (!config.expectedTopRecordIds?.length) miss('expectedTopRecordIds');
      break;
    case 'notification_reaction':
      if (!config.scenarioContext?.trim()) miss('scenarioContext');
      if (!config.taskPrompt?.trim()) miss('taskPrompt');
      if (config.workspace) {
        if (!config.workspace.name?.trim()) miss('workspace');
        if (!config.teamMembers?.length) miss('teamMembers');
        if (!config.welcomeSequence?.length) miss('welcomeSequence');
      } else {
        if (!config.notifications?.length) miss('notifications');
      }
      break;
    case 'email_response':
      if (!config.scenarioContext?.trim()) miss('scenarioContext');
      if (!config.taskPrompt?.trim()) miss('taskPrompt');
      if (!config.emailThread?.length) miss('emailThread');
      break;
    case 'simulated_call':
      if (!config.publicCandidateBrief?.trim()) miss('publicCandidateBrief');
      if (!config.aiPersona?.name?.trim()) miss('aiPersona');
      break;
    case 'spreadsheet_edit':
      if (!config.scenarioContext?.trim()) miss('scenarioContext');
      if (!config.taskPrompt?.trim()) miss('taskPrompt');
      if (!config.templateSheetUrl?.trim() || config.templateSheetUrl === 'PLACEHOLDER_TEMPLATE_ID') miss('templateSheetUrl');
      if (!config.cells?.length) miss('cells');
      break;
  }
  return keys;
}

function getDefaultConfig(type: string): Record<string, unknown> {
  const defaults: Record<string, unknown> = {
    welcome: { founderName: '', founderRole: '', founderMessage: '', minReadSeconds: 15 },
    multiple_choice: { question: 'Question here?', options: [{ id: 'a', label: 'Option A', isCorrect: true }, { id: 'b', label: 'Option B', isCorrect: false }], allowMultiple: false, randomizeOptions: false },
    free_text: { prompt: 'Describe your approach...', expectedSignals: [], redFlags: [], rubric: [] },
    crm_prioritization: { scenarioContext: '', taskPrompt: '', records: [], requiredExplanation: true, expectedTopRecordIds: [], timeLimitSeconds: 900, maxRankedItems: 5, scoringWeights: { topChoiceAccuracy: 0.35, rankingQuality: 0.30, explanationQuality: 0.25, riskAwareness: 0.10 } },
    notification_reaction: { scenarioContext: '', taskPrompt: '', notifications: [], allowedActions: ['reply', 'ignore', 'escalate', 'schedule_followup', 'create_task'], scoringWeights: { actionChoice: 0.4, prioritization: 0.3, communication: 0.2, escalationJudgment: 0.1 } },
    email_response: { scenarioContext: '', emailThread: [], taskPrompt: '', expectedSignals: [], redFlags: [], rubric: [] },
    simulated_call: { callType: 'sales_discovery', title: '', publicCandidateBrief: '', estimatedDurationSeconds: 600, maxDurationSeconds: 720, aiPersona: { name: 'Alex', role: 'Prospect', personality: 'Professional and direct.', communicationStyle: 'Concise.', baselineMood: 'neutral' }, publicBusinessContext: { knownContext: [] }, hiddenBuyerState: { initialInterestLevel: 50, initialTrustLevel: 40, initialUrgencyLevel: 30, hiddenObjections: [], buyingCriteria: [], dealBreakers: [] }, allowedOutcomes: ['schedule_follow_up', 'schedule_demo'], guardrails: { doNotRevealHiddenObjectionsDirectly: true, requireCandidateDiscoveryBeforeRevealingObjections: true, preventEasyAgreement: true, stayInPersona: true, refuseOutOfScenarioRequests: true }, scoringRubric: [] },
    spreadsheet_edit: { scenarioContext: '', taskPrompt: '', templateSheetUrl: '', cells: [], textRubric: [], expectedSignals: [], redFlags: [] },
  };
  return (defaults[type] ?? {}) as Record<string, unknown>;
}

function StepEditor({ step, simId, onSave, errors = [] }: { step: Step; simId: string; onSave: (s: Step) => void; errors?: string[] }) {
  const [form, setForm] = useState({ title: step.title, instructions: step.instructions });
  const [config, setConfig] = useState<any>(step.config ?? {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [aiFilling, setAiFilling] = useState(false);
  const [aiError, setAiError] = useState('');
  const localErrors = useMemo(() => validateStepConfig(step.type, config), [step.type, config]);

  useEffect(() => {
    setForm({ title: step.title, instructions: step.instructions });
    setConfig(step.config ?? {});
    setSaved(false);
  }, [step.id]);

  async function save() {
    setSaving(true);
    try {
      await api.patch(`/api/simulations/${simId}/steps/${step.id}`, { ...form, config });
      onSave({ ...step, ...form, config });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  }

  async function aiFill() {
    setAiFilling(true);
    setAiError('');
    try {
      const { jobId } = await api.post<{ jobId: string }>(`/api/simulations/${simId}/steps/${step.id}/ai-fill`, {});
      // Poll until the worker finishes (max ~2 min)
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const poll = await api.get<{ status: string; config?: any }>(`/api/simulations/${simId}/steps/${step.id}/ai-fill/${jobId}`);
        if (poll.status === 'completed') { setConfig(poll.config); return; }
        if (poll.status === 'failed') throw new Error('failed');
      }
      throw new Error('timeout');
    } catch {
      setAiError('Generazione AI fallita — riprova.');
    } finally { setAiFilling(false); }
  }

  const color = MODULE_COLORS[step.type] ?? 'bg-ink-100 text-ink-700';
  const icon = MODULE_ICONS[step.type];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-7 pt-6 pb-4 border-b border-ink-100 flex items-center justify-between">
        <span className={`inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-lg ${color}`}>
          {icon}
          {MODULE_LABELS[step.type] ?? step.type}
        </span>
        <div className="flex items-center gap-2">
          {aiError && <span className="text-[12px] text-danger">{aiError}</span>}
          <button
            type="button"
            onClick={aiFill}
            disabled={aiFilling}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-600 border border-ink-200 rounded-lg px-3 py-1.5 hover:bg-ink-50 disabled:opacity-50 transition-colors"
          >
            <Sparkles size={13} className={aiFilling ? 'animate-pulse' : ''} />
            {aiFilling ? 'Generazione AI…' : 'Compila con AI'}
          </button>
        </div>
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
            rows={4}
            className="w-full border border-ink-200 rounded-xl px-4 py-3 text-[14px] text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition resize-y leading-relaxed"
            placeholder="Descrivi il contesto e cosa il candidato deve fare..."
          />
        </div>

        {/* Type-specific config */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-px flex-1 bg-ink-100" />
            <span className="text-[11px] font-bold text-ink-400 uppercase tracking-widest">Configurazione step</span>
            <div className="h-px flex-1 bg-ink-100" />
          </div>
          <ConfigEditor type={step.type} config={config} onChange={setConfig} errors={localErrors} />
        </div>
      </div>

      {/* Footer */}
      <div className="px-7 py-4 border-t border-ink-100 flex items-center justify-between bg-white">
        {saved ? (
          <span className="flex items-center gap-1.5 text-[13px] text-success font-medium">
            <CheckCircle size={14} /> Salvato
          </span>
        ) : <span />}
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
  const [stepErrors, setStepErrors] = useState<Record<string, string[]>>({});
  const dragIndex = useRef<number | null>(null);

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

  async function deleteStep(stepId: string) {
    if (!sim) return;
    await api.delete(`/api/simulations/${sim.id}/steps/${stepId}`);
    setSim(s => s ? { ...s, steps: s.steps.filter(st => st.id !== stepId) } : s);
    if (selected?.id === stepId) setSelected(null);
  }

  function handleDragStart(index: number) {
    dragIndex.current = index;
  }

  async function handleDrop(targetIndex: number) {
    if (!sim || dragIndex.current === null || dragIndex.current === targetIndex) return;
    const reordered = [...sortedSteps];
    const [moved] = reordered.splice(dragIndex.current, 1);
    reordered.splice(targetIndex, 0, moved);
    const withIndex = reordered.map((s, i) => ({ ...s, orderIndex: i }));
    setSim(s => s ? { ...s, steps: withIndex } : s);
    dragIndex.current = null;
    await api.post(`/api/simulations/${sim.id}/steps/reorder`, { stepIds: withIndex.map(s => s.id) });
  }

  async function publish() {
    if (!sim) return;
    // Client-side validation first
    const allErrors: Record<string, string[]> = {};
    for (const step of sortedSteps) {
      const errs = validateStepConfig(step.type, step.config ?? {});
      if (errs.length) allErrors[step.id] = errs;
    }
    if (Object.keys(allErrors).length > 0) {
      setStepErrors(allErrors);
      const firstBad = sortedSteps.find(s => allErrors[s.id]);
      if (firstBad) setSelected(firstBad);
      const count = Object.keys(allErrors).length;
      setMsg({ tone: 'danger', text: `${count} step ${count === 1 ? 'ha' : 'hanno'} campi obbligatori mancanti — i campi in rosso devono essere compilati prima di pubblicare.` });
      return;
    }
    setStepErrors({});
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
              const hasErrors = (stepErrors[step.id]?.length ?? 0) > 0;
              return (
                <div
                  key={step.id}
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => handleDrop(i)}
                  className={`group flex items-start gap-2 px-3 py-3 transition-colors cursor-default ${
                    isActive ? 'bg-ink-100' : hasErrors ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-ink-50'
                  }`}
                >
                  <GripVertical size={14} className="text-ink-300 group-hover:text-ink-400 mt-0.5 shrink-0 cursor-grab active:cursor-grabbing" />
                  <button
                    type="button"
                    onClick={() => setSelected(step)}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-ink-400 shrink-0">{i + 1}</span>
                      <div className="text-[13px] font-semibold text-ink-900 truncate">{step.title}</div>
                      {hasErrors && <span className="ml-auto shrink-0 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">!</span>}
                    </div>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold mt-1 px-1.5 py-0.5 rounded ${color}`}>
                      {icon}
                      {MODULE_LABELS[step.type] ?? step.type}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteStep(step.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-danger-subtle text-ink-400 hover:text-danger shrink-0 mt-0.5"
                    title="Elimina step"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
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
              errors={stepErrors[selected.id] ?? []}
              onSave={updated => {
                setSim(s => s ? { ...s, steps: s.steps.map(st => st.id === updated.id ? updated : st) } : s);
                setSelected(updated);
                setStepErrors(prev => { const n = { ...prev }; delete n[updated.id]; return n; });
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
