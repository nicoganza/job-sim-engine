'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, ChevronRight, LogIn, Briefcase, ArrowRight } from 'lucide-react';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import { Button, Badge, Card, Avatar, Progress, Stat, Tabs } from '@/components/ui';

type Profile = {
  id: string;
  email: string;
  name?: string;
  avatarData?: string;
};

type AppStatus =
  | 'invited' | 'started' | 'simulation_in_progress' | 'simulation_completed'
  | 'review_pending' | 'shortlisted' | 'rejected' | 'hired';

type Application = {
  id: string;
  status: AppStatus;
  createdAt: string;
  updatedAt: string;
  jobPosting: {
    id: string;
    title: string;
    department?: string;
    location?: string;
    remotePolicy?: string;
    employmentType?: string;
  };
  session: { id: string; status: string; completedAt: string | null } | null;
  result: { totalScore: number | null; recommendation: string | null } | null;
};

const STATUS_DISPLAY: Record<AppStatus, { label: string; tone: 'brand' | 'warning' | 'success' | 'neutral' | 'danger' }> = {
  invited:                { label: 'Invitato',              tone: 'neutral' },
  started:                { label: 'Iniziata',              tone: 'brand' },
  simulation_in_progress: { label: 'Simulazione in corso',  tone: 'brand' },
  simulation_completed:   { label: 'Simulazione completata', tone: 'success' },
  review_pending:         { label: 'In revisione',           tone: 'warning' },
  shortlisted:            { label: 'Shortlist',              tone: 'success' },
  rejected:               { label: 'Non selezionato',        tone: 'neutral' },
  hired:                  { label: 'Assunto',                tone: 'success' },
};

const REMOTE_LABELS: Record<string, string> = {
  remote: 'Remoto', hybrid: 'Ibrido', onsite: 'In sede',
};

function simProgress(app: Application): { value: number; max: number } {
  if (!app.session) return { value: 0, max: 1 };
  if (app.session.status === 'completed') return { value: 1, max: 1 };
  return { value: 0, max: 1 };
}

function AppRow({ app }: { app: Application }) {
  const s = STATUS_DISPLAY[app.status] ?? { label: app.status, tone: 'neutral' as const };
  const { value, max } = simProgress(app);
  const tone: 'brand' | 'success' =
    app.status === 'simulation_completed' || app.status === 'shortlisted' || app.status === 'hired'
      ? 'success'
      : 'brand';
  const updatedAgo = (() => {
    const d = new Date(app.updatedAt);
    const diff = Date.now() - d.getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Oggi';
    if (days === 1) return 'Ieri';
    return `${days} giorni fa`;
  })();

  return (
    <Link href={`/jobs/${app.jobPosting.id}`} className="block group">
      <Card padding="md" interactive>
        <div className="flex items-center gap-4">
          <Avatar name={app.jobPosting.title} square size="lg" />
          <div className="flex-1 min-w-0">
            <div className="text-[17px] font-bold text-ink-950 font-display group-hover:text-brand transition-colors">
              {app.jobPosting.title}
            </div>
            <div className="text-[14px] text-ink-500">
              {app.jobPosting.department ?? '—'}
              {app.jobPosting.location ? ` · ${app.jobPosting.location}` : ''}
              {app.jobPosting.remotePolicy ? ` · ${REMOTE_LABELS[app.jobPosting.remotePolicy] ?? app.jobPosting.remotePolicy}` : ''}
              {' · '}
              {updatedAgo}
            </div>
          </div>
          <div className="w-40 hidden sm:block">
            <Progress value={value} max={max} showValue={false} tone={tone} />
          </div>
          <div className="hidden md:flex justify-end w-52">
            <Badge tone={s.tone} dot>{s.label}</Badge>
          </div>
          <ChevronRight size={17} className="text-ink-300 flex-none" />
        </div>
      </Card>
    </Link>
  );
}

function LoginGate() {
  return (
    <div className="min-h-screen flex flex-col bg-ink-50">
      <TopNav />
      <div className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-[400px] w-full text-center">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-6">
            <LogIn size={28} className="text-blue-600" />
          </div>
          <h1 className="text-[28px] mb-2">Le tue candidature</h1>
          <p className="text-[16px] text-ink-500 leading-relaxed mb-8">
            Accedi per vedere lo stato delle tue candidature, le simulazioni in corso e i feedback ricevuti.
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/candidate/login?redirect=/dashboard">
              <Button block size="lg" iconRight={<ArrowRight size={16} />}>Accedi</Button>
            </Link>
            <Link href="/candidate/login?redirect=/dashboard">
              <Button block size="lg" variant="secondary">Crea account gratuito</Button>
            </Link>
          </div>
          <p className="text-[13px] text-ink-400 mt-6">
            Non hai ancora candidature?{' '}
            <Link href="/" className="text-blue-600 font-semibold hover:underline">
              Sfoglia le offerte
            </Link>
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default function DashboardPage() {
  const [authState, setAuthState] = useState<'loading' | 'guest' | 'authenticated'>('loading');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [apps, setApps] = useState<Application[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [tab, setTab] = useState('tutte');

  useEffect(() => {
    const token = localStorage.getItem('candidateToken');
    if (!token) { setAuthState('guest'); return; }

    fetch('/api/candidate/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((p: Profile) => {
        setProfile(p);
        setAuthState('authenticated');
        return fetch('/api/candidate/auth/applications', { headers: { Authorization: `Bearer ${token}` } });
      })
      .then(r => r.ok ? r.json() : [])
      .then((data: Application[]) => setApps(data))
      .catch(() => setAuthState('guest'))
      .finally(() => setAppsLoading(false));

    setAppsLoading(true);
  }, []);

  if (authState === 'loading') {
    return (
      <div className="min-h-screen flex flex-col bg-ink-50">
        <TopNav />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-ink-200 border-t-brand rounded-full animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  if (authState === 'guest') return <LoginGate />;

  const displayName = profile?.name ?? profile?.email ?? 'Candidato';
  const firstWord = displayName.split(' ')[0];

  const inProgress = apps.filter(a => a.status === 'simulation_in_progress' || a.status === 'started');
  const filtered =
    tab === 'in-corso' ? inProgress :
    tab === 'completate' ? apps.filter(a => ['simulation_completed', 'review_pending', 'shortlisted', 'hired', 'rejected'].includes(a.status)) :
    apps;

  const stats = {
    attive: apps.filter(a => !['rejected'].includes(a.status)).length,
    completate: apps.filter(a => ['simulation_completed', 'review_pending', 'shortlisted', 'hired'].includes(a.status)).length,
    shortlist: apps.filter(a => a.status === 'shortlisted' || a.status === 'hired').length,
    inCorso: inProgress.length,
  };

  return (
    <div className="min-h-screen flex flex-col bg-ink-50">
      <TopNav />

      <div className="max-w-container mx-auto px-6 py-9 w-full flex-1">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Avatar name={displayName} size="xl" src={profile?.avatarData} />
          <div className="flex-1 min-w-0">
            <h1 className="text-[30px]">Ciao, {firstWord}</h1>
            <p className="text-[16px] text-ink-500 mt-1">
              {inProgress.length > 0
                ? `Hai ${inProgress.length} simulazion${inProgress.length === 1 ? 'e' : 'i'} in corso.`
                : apps.length === 0
                ? 'Nessuna candidatura ancora. Inizia a esplorare le offerte.'
                : 'Tutte le tue candidature sono aggiornate.'}
            </p>
          </div>
          <Link href="/">
            <Button iconLeft={<Search size={15} />}>Trova nuove offerte</Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <Card padding="md"><Stat value={String(apps.length)} label="Candidature totali" /></Card>
          <Card padding="md"><Stat value={String(stats.inCorso)} label="Simulazioni in corso" /></Card>
          <Card padding="md"><Stat value={String(stats.completate)} label="Completate" /></Card>
          <Card padding="md"><Stat value={String(stats.shortlist)} label="In shortlist" /></Card>
        </div>

        {/* Tabs + list */}
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'tutte',      label: 'Tutte',        count: apps.length },
            { id: 'in-corso',   label: 'In corso',     count: stats.inCorso },
            { id: 'completate', label: 'Completate',   count: stats.completate },
          ]}
        />

        <div className="flex flex-col gap-3 mt-5">
          {appsLoading ? (
            <div className="flex justify-center py-14">
              <div className="w-6 h-6 border-2 border-ink-200 border-t-brand rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-12 h-12 rounded-full bg-ink-100 flex items-center justify-center mx-auto mb-4">
                <Briefcase size={22} className="text-ink-400" />
              </div>
              <p className="text-ink-500 text-[16px] font-semibold mb-1">
                {apps.length === 0 ? 'Nessuna candidatura ancora' : 'Nessuna candidatura in questa sezione'}
              </p>
              <p className="text-ink-400 text-[14px] mb-5">
                {apps.length === 0 ? 'Esplora le offerte e candidati con la tua simulazione.' : ''}
              </p>
              {apps.length === 0 && (
                <Link href="/">
                  <Button iconRight={<ArrowRight size={15} />}>Sfoglia le offerte</Button>
                </Link>
              )}
            </div>
          ) : (
            filtered.map(a => <AppRow key={a.id} app={a} />)
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
