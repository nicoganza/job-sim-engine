'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, MapPin, Briefcase, Zap, Play, Check, TrendingUp,
} from 'lucide-react';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import { Button, Badge, Tag, Card, Avatar } from '@/components/ui';

type SimulationSkill = {
  icon: string;
  title: string;
  description: string;
};

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
  simulationSkills?: SimulationSkill[] | null;
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

  async function handleApply(openInNewTab = false) {
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
      const url = `/apply/${data.applicationToken}`;
      if (openInNewTab) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        router.push(url);
      }
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

            {job.simulationSkills && job.simulationSkills.length > 0 && (
              <Card padding="lg">
                <h2 className="text-[20px] mb-1">Skills you will learn and practice</h2>
                <p className="text-[14px] text-ink-500 mb-5">Completing the simulation develops these real-world skills.</p>
                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
                  {job.simulationSkills.map((skill, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <div className="w-9 h-9 rounded-xl bg-brand-subtle flex items-center justify-center text-[18px] flex-none">
                        {skill.icon}
                      </div>
                      <div>
                        <div className="text-[14px] font-semibold text-ink-900">{skill.title}</div>
                        <div className="text-[13px] text-ink-500 leading-relaxed mt-0.5">{skill.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="sticky top-[88px] flex flex-col gap-4">
            <Card padding="lg" style={{ border: '1.5px solid #B8C9FF' }}>
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
                      <Button block size="lg" onClick={() => handleApply(!!job.activeSimulationVersionId)} disabled={applying} iconLeft={job.activeSimulationVersionId ? <Play size={16} /> : undefined}>
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
            </Card>

            <Card padding="md">
              <div className="flex items-center gap-2 text-[14px] text-ink-700">
                <TrendingUp size={16} className="text-success flex-none" />
                Chi completa la simulazione ha 4× più probabilità di colloquio
              </div>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
