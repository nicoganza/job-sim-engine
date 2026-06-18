'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, MapPin, Briefcase, Zap, Play, ArrowRight, Check, CheckCircle,
  Clock, Send, X, TrendingUp,
} from 'lucide-react';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import { Button, Badge, Tag, Card, Avatar, Progress, Alert } from '@/components/ui';

type Job = {
  id: string;
  title: string;
  description: string;
  department?: string;
  location?: string;
  remotePolicy?: string;
  seniority?: string;
  employmentType?: string;
  activeSimulationVersionId?: string;
  organization: { name: string };
};

type CandidateProfile = {
  id: string;
  email: string;
  name?: string;
  avatarData?: string;
};

const SIM_TASKS = [
  { id: 1, type: 'Brief',       title: 'Leggi il brief del progetto',       est: '5 min',  kind: 'read' as const,
    prompt: 'Studia il materiale allegato relativo al ruolo. Il contesto e i vincoli ti serviranno per i task successivi.',
    placeholder: '' },
  { id: 2, type: 'Analisi',     title: 'Individua i 3 problemi principali', est: '15 min', kind: 'text' as const,
    prompt: 'Elenca i tre ostacoli che, secondo te, causano le maggiori difficoltà nel flusso attuale. Motiva ogni scelta.',
    placeholder: '1. …\n2. …\n3. …' },
  { id: 3, type: 'Proposta',    title: 'Proponi la tua soluzione',           est: '20 min', kind: 'text' as const,
    prompt: 'Descrivi la tua proposta per affrontare i problemi individuati. Spiega le scelte e i trade-off.',
    placeholder: 'La mia proposta è…' },
  { id: 4, type: 'Riflessione', title: 'Come misureresti il successo?',     est: '10 min', kind: 'text' as const,
    prompt: 'Quali metriche useresti per capire se la tua soluzione funziona? Indica la metrica principale e due di supporto.',
    placeholder: 'Metrica principale: …' },
];

type SimTask = typeof SIM_TASKS[number];

function SimTaskView({ task, value, onChange }: { task: SimTask; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <Badge tone="brand">{task.type}</Badge>
        <span className="text-[13px] text-ink-500 flex items-center gap-1.5">
          <Clock size={13} /> {task.est}
        </span>
      </div>
      <h3 className="text-[22px] font-bold text-ink-950 mb-3">{task.title}</h3>
      <div className="p-4 bg-ink-50 rounded-lg text-[15px] leading-relaxed text-ink-700 mb-5">
        {task.prompt}
      </div>
      {task.kind === 'read' ? (
        <Alert tone="info" title="Materiali del brief">
          Il contesto del progetto è descritto sopra. Prenditi il tempo necessario prima di continuare.
        </Alert>
      ) : (
        <textarea
          rows={7}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={task.placeholder}
          className="w-full border border-ink-200 rounded-lg px-3.5 py-2.5 text-[14px] text-ink-900 placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-brand transition bg-white resize-none"
        />
      )}
    </div>
  );
}

function SimulationPanel({ job, onClose }: { job: Job; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [done, setDone] = useState(false);
  const tasks = SIM_TASKS;
  const task = tasks[step];
  const completed = tasks.filter((t, i) =>
    t.kind === 'read' ? i < step || done : (answers[t.id] && answers[t.id].length > 4)
  ).length;
  const canContinue = task.kind === 'read' || (answers[task.id] && answers[task.id].length > 4);
  const isLast = step === tasks.length - 1;

  if (done) {
    return (
      <div className="text-center py-6">
        <div className="w-16 h-16 rounded-full bg-success-subtle flex items-center justify-center mx-auto mb-5">
          <CheckCircle size={32} className="text-success" />
        </div>
        <h2 className="text-[26px] font-bold text-ink-950 mb-2">Simulazione inviata</h2>
        <p className="text-[15px] text-ink-600 max-w-[360px] mx-auto leading-relaxed mb-6">
          Hai completato tutte le {tasks.length} task per <strong>{job.title}</strong>. Riceverai feedback
          entro 3 giorni lavorativi.
        </p>
        <div className="flex gap-2.5 justify-center">
          <Button onClick={onClose}>Torna all'offerta</Button>
          <Button variant="secondary" onClick={() => { setDone(false); setStep(0); setAnswers({}); }}>
            Ricomincia
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[13px] text-ink-500">Simulazione · {job.title}</div>
          <div className="text-[12px] font-mono text-ink-400">Task {step + 1} di {tasks.length}</div>
        </div>
        <button type="button" onClick={onClose} className="text-ink-400 hover:text-ink-700 transition-colors">
          <X size={20} />
        </button>
      </div>
      <Progress value={completed} max={tasks.length} label="Avanzamento" tone="success" />
      <div className="flex gap-1.5 mt-5 mb-6">
        {tasks.map((t, i) => (
          <div key={t.id} className={`flex-1 h-1 rounded-full transition-colors ${i <= step ? 'bg-brand' : 'bg-ink-200'}`} />
        ))}
      </div>
      <SimTaskView
        task={task}
        value={answers[task.id] ?? ''}
        onChange={v => setAnswers(a => ({ ...a, [task.id]: v }))}
      />
      <div className="flex justify-between mt-7">
        <Button variant="ghost" disabled={step === 0} onClick={() => setStep(s => Math.max(0, s - 1))} iconLeft={<ArrowLeft size={16} />}>
          Indietro
        </Button>
        {isLast ? (
          <Button disabled={!canContinue} onClick={() => setDone(true)} iconRight={<Send size={15} />}>
            Invia simulazione
          </Button>
        ) : (
          <Button disabled={!canContinue} onClick={() => setStep(s => s + 1)} iconRight={<ArrowRight size={15} />}>
            Continua
          </Button>
        )}
      </div>
    </div>
  );
}

const EMPLOYMENT_LABELS: Record<string, string> = {
  full_time: 'Full-time', part_time: 'Part-time', contract: 'Contratto', internship: 'Stage',
};
const REMOTE_LABELS: Record<string, string> = {
  remote: 'Remoto', hybrid: 'Ibrido', onsite: 'In sede',
};

export default function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [simOpen, setSimOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile | null>(null);

  useEffect(() => {
    fetch(`/api/public/jobs/${jobId}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => setJob(data))
      .catch(() => {})
      .finally(() => setLoading(false));

    const token = typeof window !== 'undefined' ? localStorage.getItem('candidateToken') : null;
    if (token) {
      fetch('/api/candidate/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(p => {
          if (p && !p.error) { setCandidateProfile(p); setName(p.name ?? ''); setEmail(p.email ?? ''); }
        })
        .catch(() => {});
    }
  }, [jobId]);

  async function handleApply(e?: React.FormEvent) {
    e?.preventDefault();
    setError('');
    setApplying(true);
    try {
      const res = await fetch(`/api/public/jobs/${jobId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Candidatura non riuscita.'); return; }
      router.push(`/apply/${data.applicationToken}`);
    } catch {
      setError('Errore di rete — riprova.');
    } finally {
      setApplying(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-50 flex items-center justify-center">
        <div className="text-ink-400 text-[15px]">Caricamento…</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-ink-50 flex flex-col items-center justify-center gap-4">
        <p className="text-ink-500">Questa posizione non è più disponibile.</p>
        <Link href="/" className="text-blue-600 text-[14px] font-semibold hover:underline">
          ← Torna alle offerte
        </Link>
      </div>
    );
  }

  const initials = (candidateProfile?.name ?? name)
    .split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  const tags = [
    job.department,
    job.seniority,
    job.employmentType ? EMPLOYMENT_LABELS[job.employmentType] : undefined,
    job.remotePolicy ? REMOTE_LABELS[job.remotePolicy] : undefined,
  ].filter(Boolean) as string[];

  return (
    <div className="min-h-screen flex flex-col bg-ink-50">
      <TopNav />

      <div className="max-w-container mx-auto w-full px-6 py-7">
        <Link href="/" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink-500 hover:text-ink-900 transition-colors mb-5">
          <ArrowLeft size={15} /> Tutte le offerte
        </Link>

        <div className="grid gap-7" style={{ gridTemplateColumns: '1fr 360px', alignItems: 'start' }}>
          {/* Main */}
          <div className="flex flex-col gap-5">
            <Card padding="lg">
              <div className="flex gap-4 items-start">
                <Avatar name={job.organization.name} square size="xl" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-[30px]">{job.title}</h1>
                    {job.activeSimulationVersionId && <Badge tone="brand">Simulazione inclusa</Badge>}
                  </div>
                  <div className="text-[16px] text-ink-600 mt-1">{job.organization.name}</div>
                  <div className="flex gap-4 mt-3 text-[14px] text-ink-500 flex-wrap">
                    {job.location && (
                      <span className="flex items-center gap-1.5">
                        <MapPin size={14} /> {job.location}
                        {job.remotePolicy ? ` · ${REMOTE_LABELS[job.remotePolicy]}` : ''}
                      </span>
                    )}
                    {job.employmentType && (
                      <span className="flex items-center gap-1.5">
                        <Briefcase size={14} /> {EMPLOYMENT_LABELS[job.employmentType]}
                      </span>
                    )}
                  </div>
                  {tags.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap mt-4">
                      {tags.map(t => <Tag key={t}>{t}</Tag>)}
                    </div>
                  )}
                </div>
              </div>
            </Card>

            <Card padding="lg">
              <h2 className="text-[20px] mb-3">Il ruolo</h2>
              <p className="text-[15px] leading-relaxed text-ink-700 whitespace-pre-line">{job.description}</p>
              <h3 className="text-[16px] font-bold text-ink-950 mt-6 mb-3">Cosa offriamo</h3>
              <ul className="flex flex-col gap-2.5">
                {['Ambiente di lavoro aperto e collaborativo', 'Budget annuale per formazione', 'Flessibilità sugli orari e sulla sede', 'Feedback rapido dopo la simulazione'].map(b => (
                  <li key={b} className="flex gap-2.5 text-[15px] text-ink-700">
                    <Check size={17} className="text-success flex-none mt-0.5" /> {b}
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="sticky top-[88px] flex flex-col gap-4">
            <Card padding="lg" style={{ border: '1.5px solid #B8C9FF' }}>
              {simOpen ? (
                <SimulationPanel job={job} onClose={() => setSimOpen(false)} />
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <Zap size={17} className="text-brand" />
                    <span className="text-[12px] font-bold tracking-[.04em] uppercase text-blue-700">
                      {job.activeSimulationVersionId ? 'Simulazione richiesta' : 'Candidatura'}
                    </span>
                  </div>
                  <h2 className="text-[22px] mb-2">Mostra cosa sai fare</h2>
                  <p className="text-[14px] text-ink-600 leading-relaxed mb-4">
                    {job.activeSimulationVersionId
                      ? `Completa ${SIM_TASKS.length} task reali del ruolo. Tempo stimato: ~50 minuti.`
                      : 'Candidati in meno di un minuto — nessuna lettera di presentazione.'}
                  </p>

                  {job.activeSimulationVersionId && (
                    <div className="flex flex-col gap-2 mb-4">
                      {SIM_TASKS.map((t, i) => (
                        <div key={t.id} className="flex items-center gap-2.5 text-[14px] text-ink-700">
                          <span className="w-5 h-5 rounded-full bg-ink-100 text-ink-500 text-[12px] font-bold flex items-center justify-center flex-none">{i + 1}</span>
                          {t.title}
                        </div>
                      ))}
                    </div>
                  )}

                  {candidateProfile ? (
                    <div>
                      <div className="flex items-center gap-3 bg-ink-50 border border-ink-200 rounded-lg p-3 mb-4">
                        {candidateProfile.avatarData ? (
                          <img src={candidateProfile.avatarData} alt="avatar" className="w-10 h-10 rounded-full object-cover flex-none" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold font-display text-[14px] flex-none">
                            {initials}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-ink-950 text-[14px] truncate">{candidateProfile.name}</div>
                          <div className="text-[12px] text-ink-400 truncate">{candidateProfile.email}</div>
                        </div>
                        <Link href="/candidate/profile" className="text-[12px] text-blue-600 hover:underline flex-none">Modifica</Link>
                      </div>
                      {error && <div className="bg-danger-subtle border border-danger/20 text-danger-dark text-[14px] rounded-lg px-4 py-3 mb-3">{error}</div>}
                      <Button block size="lg" onClick={job.activeSimulationVersionId ? () => setSimOpen(true) : () => handleApply()} disabled={applying} iconLeft={job.activeSimulationVersionId ? <Play size={16} /> : undefined}>
                        {applying ? 'Avvio…' : job.activeSimulationVersionId ? 'Inizia la simulazione' : 'Candidati ora'}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      <Button block size="lg" iconLeft={job.activeSimulationVersionId ? <Play size={16} /> : undefined}
                        onClick={() => router.push(`/candidate/login?mode=register&redirect=/jobs/${jobId}`)}>
                        {job.activeSimulationVersionId ? 'Inizia la simulazione' : 'Candidati ora'}
                      </Button>
                      <Link href={`/candidate/login?redirect=/jobs/${jobId}`} className="text-center text-[13px] font-semibold text-ink-500 hover:text-ink-700 transition-colors">
                        Hai già un account? Accedi
                      </Link>
                    </div>
                  )}
                </>
              )}
            </Card>

            {!simOpen && (
              <Card padding="md">
                <div className="flex items-center gap-2 text-[14px] text-ink-700">
                  <TrendingUp size={16} className="text-success flex-none" />
                  Chi completa la simulazione ha 4× più probabilità di colloquio
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
