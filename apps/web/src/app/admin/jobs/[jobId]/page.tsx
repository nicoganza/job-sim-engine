'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users, Zap, Sparkles, CheckCircle, Clock, ChevronRight, Pencil, Trash2, X, AlertTriangle, Plus, GripVertical } from 'lucide-react';
import { api } from '@/lib/api';
import { Button, Badge, Card, Stat, Progress, Alert, Input, CityAutocomplete } from '@/components/ui';

type SimSkill = { icon: string; title: string; description: string };

type Job = {
  id: string;
  title: string;
  description: string;
  status: string;
  department?: string;
  seniority?: string;
  location?: string;
  remotePolicy?: string;
  employmentType?: string;
  activeSimulationVersionId?: string;
  simulationSkills?: SimSkill[] | null;
};

type EditForm = {
  title: string;
  description: string;
  department: string;
  seniority: string;
  location: string;
  remotePolicy: string;
  employmentType: string;
  simulationSkills: SimSkill[];
};

type Analytics = {
  totalApplications: number;
  completedResults: number;
  averageScore?: number;
  results: Array<{ totalScore?: number; recommendation?: string }>;
};

type AiRun = { id: string; status: string; result?: { recommendedSteps?: unknown[] } };

const STATUS: Record<string, { label: string; tone: 'success' | 'warning' | 'neutral' | 'danger' | 'brand' }> = {
  published: { label: 'Pubblicata', tone: 'success' },
  draft:     { label: 'Bozza',      tone: 'warning' },
  closed:    { label: 'Chiusa',     tone: 'neutral' },
  archived:  { label: 'Archiviata',tone: 'danger'  },
};

const REC_LABELS: Record<string, { label: string; color: string }> = {
  strong_yes:     { label: 'Fortemente sì', color: 'bg-success' },
  yes:            { label: 'Sì',            color: 'bg-blue-500' },
  maybe:          { label: 'Forse',         color: 'bg-warning' },
  no:             { label: 'No',            color: 'bg-danger' },
  review_required:{ label: 'Da rivedere',   color: 'bg-ink-400' },
};

const REMOTE: Record<string, string> = {
  remote: 'Remoto', hybrid: 'Ibrido', onsite: 'In sede',
};

function jobToForm(job: Job): EditForm {
  return {
    title:            job.title ?? '',
    description:      job.description ?? '',
    department:       job.department ?? '',
    seniority:        job.seniority ?? '',
    location:         job.location ?? '',
    remotePolicy:     job.remotePolicy ?? '',
    employmentType:   job.employmentType ?? '',
    simulationSkills: job.simulationSkills ?? [],
  };
}

export default function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const router = useRouter();

  const [job, setJob]               = useState<Job | null>(null);
  const [analytics, setAnalytics]   = useState<Analytics | null>(null);
  const [aiRun, setAiRun]           = useState<AiRun | null>(null);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [msg, setMsg]               = useState<{ tone: 'success' | 'danger' | 'info'; text: string } | null>(null);

  // Edit mode
  const [editing, setEditing]   = useState(false);
  const [form, setForm]         = useState<EditForm | null>(null);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    api.get<Job>(`/api/jobs/${jobId}`).then(j => { setJob(j); setForm(jobToForm(j)); });
    api.get<Analytics>(`/api/jobs/${jobId}/analytics`).then(setAnalytics).catch(() => {});
  }, [jobId]);

  function startEdit() { setEditing(true); setMsg(null); }
  function cancelEdit() { setEditing(false); if (job) setForm(jobToForm(job)); setConfirmDelete(false); }

  function setField(k: keyof EditForm, v: string) {
    setForm(f => f ? { ...f, [k]: v } : f);
  }

  async function saveJob() {
    if (!form) return;
    setSaving(true); setMsg(null);
    try {
      const updated = await api.patch<Job>(`/api/jobs/${jobId}`, {
        title:            form.title,
        description:      form.description,
        department:       form.department || undefined,
        seniority:        form.seniority || undefined,
        location:         form.location || undefined,
        remotePolicy:     form.remotePolicy || undefined,
        employmentType:   form.employmentType || undefined,
        simulationSkills: form.simulationSkills.length > 0 ? form.simulationSkills : null,
      });
      setJob(j => j ? { ...j, ...form } : j);
      setEditing(false);
      setMsg({ tone: 'success', text: 'Offerta aggiornata con successo.' });
    } catch (e: any) {
      setMsg({ tone: 'danger', text: e.message });
    } finally {
      setSaving(false);
    }
  }

  async function deleteJob() {
    setDeleting(true);
    try {
      await api.post(`/api/jobs/${jobId}/archive`);
      router.push('/admin/jobs');
    } catch (e: any) {
      setMsg({ tone: 'danger', text: e.message });
      setDeleting(false);
    }
  }

  async function generateSimulation() {
    setGenerating(true); setMsg(null);
    try {
      const run = await api.post<AiRun>(`/api/jobs/${jobId}/recommend-simulation`);
      setAiRun(run);
      setMsg({ tone: 'info', text: 'Analisi AI avviata — attendi qualche secondo…' });
      const interval = setInterval(async () => {
        const updated = await api.get<AiRun>(`/api/ai-recommendation-runs/${run.id}`);
        setAiRun(updated);
        if (updated.status === 'completed' || updated.status === 'failed') {
          clearInterval(interval);
          setMsg(updated.status === 'completed'
            ? { tone: 'success', text: 'Raccomandazione AI pronta.' }
            : { tone: 'danger',  text: 'Generazione fallita — riprova.' });
        }
      }, 3000);
    } catch (e: any) {
      setMsg({ tone: 'danger', text: e.message });
    } finally {
      setGenerating(false);
    }
  }

  async function publishJob() {
    setPublishing(true); setMsg(null);
    try {
      await api.post(`/api/jobs/${jobId}/publish`);
      setJob(j => j ? { ...j, status: 'published' } : j);
      setMsg({ tone: 'success', text: 'Offerta pubblicata con successo.' });
    } catch (e: any) {
      setMsg({ tone: 'danger', text: e.message });
    } finally {
      setPublishing(false);
    }
  }

  if (!job || !form) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-ink-200 border-t-brand rounded-full animate-spin" />
      </div>
    );
  }

  const s = STATUS[job.status] ?? { label: job.status, tone: 'neutral' as const };

  const recCounts = analytics?.results.reduce((acc: Record<string, number>, r) => {
    if (r.recommendation) acc[r.recommendation] = (acc[r.recommendation] ?? 0) + 1;
    return acc;
  }, {}) ?? {};
  const completionRate = analytics && analytics.totalApplications > 0
    ? Math.round((analytics.completedResults / analytics.totalApplications) * 100) : 0;
  const shortlisted = analytics?.results.filter(
    r => r.recommendation === 'strong_yes' || r.recommendation === 'yes'
  ).length ?? 0;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <button
          type="button"
          onClick={() => router.push('/admin/jobs')}
          className="text-ink-400 hover:text-ink-700 transition-colors flex items-center gap-1 text-[14px]"
        >
          <ArrowLeft size={15} /> Offerte
        </button>
      </div>

      {/* ─── EDIT MODE ─── */}
      {editing ? (
        <div className="flex flex-col gap-5 max-w-2xl">
          <div className="flex items-center justify-between">
            <h1 className="text-[22px] font-semibold">Modifica offerta</h1>
            <button
              type="button"
              onClick={cancelEdit}
              className="text-ink-400 hover:text-ink-700 transition-colors flex items-center gap-1 text-[14px]"
            >
              <X size={15} /> Annulla
            </button>
          </div>

          {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}

          {/* Basic info */}
          <Card padding="lg">
            <h2 className="text-[14px] font-semibold text-ink-700 mb-4">Informazioni principali</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-[13px] font-medium text-ink-700 mb-1.5">Titolo *</label>
                <Input
                  value={form.title}
                  onChange={e => setField('title', e.target.value)}
                  placeholder="es. Sales Development Representative"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-ink-700 mb-1.5">Descrizione *</label>
                <textarea
                  value={form.description}
                  onChange={e => setField('description', e.target.value)}
                  rows={6}
                  className="w-full border border-ink-200 rounded-xl px-3.5 py-2.5 text-[14px] text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition resize-y"
                  placeholder="Descrivi il ruolo, le responsabilità e i requisiti..."
                />
              </div>
            </div>
          </Card>

          {/* Details */}
          <Card padding="lg">
            <h2 className="text-[14px] font-semibold text-ink-700 mb-4">Dettagli</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-ink-700 mb-1.5">Dipartimento</label>
                <Input value={form.department} onChange={e => setField('department', e.target.value)} placeholder="es. Sales" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-ink-700 mb-1.5">Seniority</label>
                <Input value={form.seniority} onChange={e => setField('seniority', e.target.value)} placeholder="es. Junior, Senior" />
              </div>
              <CityAutocomplete
                label="Sede"
                placeholder="es. Milano"
                value={form.location}
                onChange={v => setField('location', v)}
              />
              <div>
                <label className="block text-[13px] font-medium text-ink-700 mb-1.5">Modalità</label>
                <select
                  value={form.remotePolicy}
                  onChange={e => setField('remotePolicy', e.target.value)}
                  className="w-full border border-ink-200 rounded-xl px-3.5 py-2.5 text-[14px] text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition bg-white"
                >
                  <option value="">— Seleziona —</option>
                  <option value="onsite">In sede</option>
                  <option value="hybrid">Ibrido</option>
                  <option value="remote">Remoto</option>
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-ink-700 mb-1.5">Tipo di contratto</label>
                <select
                  value={form.employmentType}
                  onChange={e => setField('employmentType', e.target.value)}
                  className="w-full border border-ink-200 rounded-xl px-3.5 py-2.5 text-[14px] text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition bg-white"
                >
                  <option value="">— Seleziona —</option>
                  <option value="full_time">Full-time</option>
                  <option value="part_time">Part-time</option>
                  <option value="contract">Contratto</option>
                  <option value="internship">Stage</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Skills editor */}
          <Card padding="lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[14px] font-semibold text-ink-700">Skills you will learn and practice</h2>
                <p className="text-[12px] text-ink-400 mt-0.5">Visibili nell'offerta pubblica. Auto-generate dalla simulazione, ma modificabili manualmente.</p>
              </div>
              <button
                type="button"
                onClick={() => setForm(f => f ? { ...f, simulationSkills: [...f.simulationSkills, { icon: '⭐', title: '', description: '' }] } : f)}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-brand border border-brand/30 rounded-lg px-3 py-1.5 hover:bg-brand-subtle transition-colors"
              >
                <Plus size={13} /> Aggiungi skill
              </button>
            </div>
            {form.simulationSkills.length === 0 ? (
              <p className="text-[13px] text-ink-400 text-center py-4">Nessuna skill ancora — verranno generate automaticamente alla prossima pubblicazione della simulazione.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {form.simulationSkills.map((skill, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <div className="flex items-center justify-center w-9 h-9 mt-0.5 text-[18px] shrink-0 cursor-grab">
                      <GripVertical size={14} className="text-ink-300" />
                    </div>
                    <input
                      value={skill.icon}
                      onChange={e => setForm(f => {
                        if (!f) return f;
                        const s = [...f.simulationSkills];
                        s[i] = { ...s[i], icon: e.target.value };
                        return { ...f, simulationSkills: s };
                      })}
                      className="w-14 border border-ink-200 rounded-lg px-2 py-2 text-[18px] text-center focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                      placeholder="⭐"
                      maxLength={4}
                    />
                    <div className="flex-1 flex flex-col gap-1.5">
                      <input
                        value={skill.title}
                        onChange={e => setForm(f => {
                          if (!f) return f;
                          const s = [...f.simulationSkills];
                          s[i] = { ...s[i], title: e.target.value };
                          return { ...f, simulationSkills: s };
                        })}
                        className="w-full border border-ink-200 rounded-lg px-3 py-1.5 text-[13px] font-semibold text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                        placeholder="Titolo skill (es. CRM Management)"
                      />
                      <input
                        value={skill.description}
                        onChange={e => setForm(f => {
                          if (!f) return f;
                          const s = [...f.simulationSkills];
                          s[i] = { ...s[i], description: e.target.value };
                          return { ...f, simulationSkills: s };
                        })}
                        className="w-full border border-ink-200 rounded-lg px-3 py-1.5 text-[13px] text-ink-600 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                        placeholder="Descrizione breve (es. Practice managing leads in a real CRM pipeline)"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm(f => {
                        if (!f) return f;
                        const s = f.simulationSkills.filter((_, idx) => idx !== i);
                        return { ...f, simulationSkills: s };
                      })}
                      className="mt-1 p-1.5 rounded hover:bg-danger-subtle text-ink-400 hover:text-danger transition-colors shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Simulation link */}
          <Card padding="lg">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-brand-subtle flex items-center justify-center flex-none">
                <Zap size={16} className="text-brand" />
              </div>
              <div className="flex-1">
                <h2 className="text-[14px] font-semibold text-ink-700">Simulazione</h2>
                <p className="text-[12px] text-ink-500 mt-0.5">
                  {job.activeSimulationVersionId
                    ? 'Simulazione attiva — clicca per modificare gli step.'
                    : 'Nessuna simulazione — aggiungila per ricevere candidature qualificate.'}
                </p>
              </div>
              <Link href={`/builder/${jobId}`} target="_blank" rel="noopener noreferrer" onClick={cancelEdit}>
                <Button size="sm" variant={job.activeSimulationVersionId ? 'secondary' : 'primary'}>
                  {job.activeSimulationVersionId ? 'Modifica simulazione' : 'Aggiungi simulazione'}
                </Button>
              </Link>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div>
              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 text-[13px] text-danger hover:text-danger font-medium transition-colors"
                >
                  <Trash2 size={14} /> Elimina offerta
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-[13px] text-danger font-medium">Sei sicuro? L'offerta verrà archiviata.</span>
                  <button
                    type="button"
                    onClick={deleteJob}
                    disabled={deleting}
                    className="text-[13px] font-bold text-danger border border-danger/30 rounded-lg px-3 py-1.5 hover:bg-danger-subtle transition-colors disabled:opacity-50"
                  >
                    {deleting ? 'Eliminazione…' : 'Sì, elimina'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="text-[13px] text-ink-500 hover:text-ink-700 transition-colors"
                  >
                    Annulla
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={cancelEdit}>Annulla</Button>
              <Button size="sm" onClick={saveJob} disabled={saving || !form.title.trim()}>
                {saving ? 'Salvataggio…' : 'Salva modifiche'}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* ─── VIEW MODE ─── */
        <>
          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-1.5">
                <h1 className="text-[28px]">{job.title}</h1>
                <Badge tone={s.tone} dot>{s.label}</Badge>
                {!job.activeSimulationVersionId && (
                  <div className="flex items-center gap-1.5 text-[12px] text-warning-dark bg-warning-subtle px-2.5 py-1 rounded-md font-semibold">
                    <AlertTriangle size={12} /> Senza simulazione
                  </div>
                )}
              </div>
              <p className="text-[14px] text-ink-500">
                {[job.department, job.seniority, job.remotePolicy ? REMOTE[job.remotePolicy] : undefined, job.location]
                  .filter(Boolean).join(' · ') || '—'}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-none">
              <Button variant="secondary" size="sm" onClick={startEdit} iconLeft={<Pencil size={14} />}>
                Modifica
              </Button>
              <Link href={`/builder/${jobId}`} target="_blank" rel="noopener noreferrer">
                <Button variant="secondary" size="sm" iconLeft={<Zap size={14} />}>Simulazione</Button>
              </Link>
              <Link href={`/admin/jobs/${jobId}/candidates`}>
                <Button variant="secondary" size="sm" iconLeft={<Users size={14} />}>Candidati</Button>
              </Link>
              {job.status !== 'published' && (
                <Button size="sm" onClick={publishJob} disabled={publishing}>
                  {publishing ? 'Pubblicazione…' : 'Pubblica'}
                </Button>
              )}
            </div>
          </div>

          {msg && <Alert tone={msg.tone} className="mb-6">{msg.text}</Alert>}

          {/* Missing simulation CTA */}
          {!job.activeSimulationVersionId && (
            <div className="flex items-center justify-between gap-4 bg-warning-subtle border border-warning/20 rounded-xl px-5 py-4 mb-6">
              <div className="flex items-center gap-3">
                <AlertTriangle size={18} className="text-warning shrink-0" />
                <div>
                  <p className="text-[14px] font-semibold text-warning-dark">Questa offerta non ha ancora una simulazione.</p>
                  <p className="text-[13px] text-ink-600 mt-0.5">Tutte le offerte devono avere una simulazione per ricevere candidature qualificate.</p>
                </div>
              </div>
              <Link href={`/builder/${jobId}`} target="_blank" rel="noopener noreferrer" className="flex-none">
                <Button size="sm" iconLeft={<Zap size={14} />}>Aggiungi simulazione</Button>
              </Link>
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-4 mb-7">
            <Card padding="md"><Stat value={String(analytics?.totalApplications ?? 0)} label="Candidature" /></Card>
            <Card padding="md"><Stat value={String(analytics?.completedResults ?? 0)} label="Completate" /></Card>
            <Card padding="md">
              <Stat
                value={analytics?.averageScore != null ? `${Math.round(analytics.averageScore)}%` : '—'}
                label="Punteggio medio"
              />
            </Card>
            <Card padding="md"><Stat value={String(shortlisted)} label="Idonei (sì / forte sì)" /></Card>
          </div>

          <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 320px' }}>
            {/* ─── Left: analytics + AI ─── */}
            <div className="flex flex-col gap-5">
              <Card padding="lg">
                <h2 className="text-[16px] font-semibold mb-4">Tasso di completamento</h2>
                {analytics && analytics.totalApplications > 0 ? (
                  <div className="flex flex-col gap-3">
                    <Progress
                      value={completionRate}
                      max={100}
                      showValue
                      label={`${analytics.completedResults} su ${analytics.totalApplications} candidature completate`}
                      tone={completionRate >= 50 ? 'success' : 'brand'}
                    />
                    <div className="flex gap-4 mt-1">
                      <div className="flex items-center gap-1.5 text-[13px] text-ink-500">
                        <CheckCircle size={13} className="text-success" />
                        {analytics.completedResults} completate
                      </div>
                      <div className="flex items-center gap-1.5 text-[13px] text-ink-500">
                        <Clock size={13} className="text-warning" />
                        {analytics.totalApplications - analytics.completedResults} in corso / non avviate
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-[14px] text-ink-400">Nessun dato ancora — i dati appariranno man mano che i candidati completano la simulazione.</p>
                )}
              </Card>

              {Object.keys(recCounts).length > 0 && (
                <Card padding="lg">
                  <h2 className="text-[16px] font-semibold mb-4">Distribuzione raccomandazioni</h2>
                  <div className="flex flex-col gap-3">
                    {Object.entries(recCounts)
                      .sort(([, a], [, b]) => b - a)
                      .map(([rec, count]) => {
                        const meta = REC_LABELS[rec] ?? { label: rec, color: 'bg-ink-300' };
                        const pct = analytics!.completedResults > 0
                          ? Math.round((count / analytics!.completedResults) * 100) : 0;
                        return (
                          <div key={rec} className="flex items-center gap-3">
                            <span className="text-[13px] text-ink-600 w-32 shrink-0">{meta.label}</span>
                            <div className="flex-1 bg-ink-100 rounded-full h-2.5 overflow-hidden">
                              <div className={`${meta.color} h-2.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[13px] font-semibold text-ink-700 w-8 text-right">{count}</span>
                            <span className="text-[12px] text-ink-400 w-10 text-right">{pct}%</span>
                          </div>
                        );
                      })}
                  </div>
                </Card>
              )}

              <Card padding="lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-ink-950 flex items-center justify-center flex-none">
                    <Sparkles size={17} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-semibold">Simulazione con AI</h2>
                    <p className="text-[13px] text-ink-500">Genera automaticamente gli step in base ai requisiti del ruolo.</p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={generateSimulation}
                  disabled={generating}
                  iconLeft={<Sparkles size={14} />}
                >
                  {generating ? 'Generazione…' : 'Genera con AI'}
                </Button>
                {aiRun && (
                  <div className="mt-4 pt-4 border-t border-ink-100 flex items-center gap-3">
                    <Badge
                      tone={aiRun.status === 'completed' ? 'success' : aiRun.status === 'failed' ? 'danger' : 'warning'}
                      dot
                    >
                      {aiRun.status === 'completed' ? 'Completato' : aiRun.status === 'failed' ? 'Fallito' : 'In elaborazione'}
                    </Badge>
                    {aiRun.status === 'completed' && aiRun.result && (
                      <Link
                        href={`/admin/jobs/${jobId}/recommendations/${aiRun.id}`}
                        className="text-[13px] font-semibold text-brand hover:underline flex items-center gap-1"
                      >
                        Vedi {(aiRun.result.recommendedSteps as unknown[])?.length ?? 0} step raccomandati
                        <ChevronRight size={13} />
                      </Link>
                    )}
                  </div>
                )}
              </Card>
            </div>

            {/* ─── Right: job info ─── */}
            <div className="flex flex-col gap-5">
              <Card padding="md">
                <h2 className="text-[14px] font-semibold text-ink-700 mb-3">Dettagli offerta</h2>
                <div className="flex flex-col gap-2.5">
                  {[
                    { label: 'Stato',        value: s.label },
                    { label: 'Dipartimento', value: job.department },
                    { label: 'Seniority',    value: job.seniority },
                    { label: 'Sede',         value: job.location },
                    { label: 'Modalità',     value: job.remotePolicy ? REMOTE[job.remotePolicy] : undefined },
                    { label: 'Tipo',         value: job.employmentType },
                  ].filter(r => r.value).map(({ label, value }) => (
                    <div key={label} className="flex items-start justify-between gap-2">
                      <span className="text-[13px] text-ink-500 shrink-0">{label}</span>
                      <span className="text-[13px] font-medium text-ink-800 text-right">{value}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card padding="md">
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={14} className="text-brand" />
                  <h2 className="text-[14px] font-semibold text-ink-700">Simulazione</h2>
                </div>
                <p className="text-[13px] text-ink-500 mb-3">
                  {job.activeSimulationVersionId
                    ? 'Simulazione attiva e visibile ai candidati.'
                    : 'Nessuna simulazione ancora — aggiungila per ricevere candidature.'}
                </p>
                <Link href={`/builder/${jobId}`} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant={job.activeSimulationVersionId ? 'secondary' : 'primary'} block>
                    {job.activeSimulationVersionId ? 'Modifica simulazione' : 'Aggiungi simulazione'}
                  </Button>
                </Link>
              </Card>

              <Card padding="md">
                <h2 className="text-[14px] font-semibold text-ink-700 mb-2">Descrizione</h2>
                <p className="text-[13px] text-ink-600 leading-relaxed line-clamp-6">{job.description}</p>
              </Card>

              <Link href={`/admin/jobs/${jobId}/candidates`}>
                <Card padding="md" interactive>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-ink-100 flex items-center justify-center flex-none">
                      <Users size={16} className="text-ink-600" />
                    </div>
                    <div className="flex-1">
                      <div className="text-[14px] font-semibold text-ink-800">Vedi tutti i candidati</div>
                      <div className="text-[12px] text-ink-500">{analytics?.totalApplications ?? 0} candidature ricevute</div>
                    </div>
                    <ChevronRight size={15} className="text-ink-300" />
                  </div>
                </Card>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
