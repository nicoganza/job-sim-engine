'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Briefcase, Users, Zap, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { Button, Badge, Card, Avatar, Stat } from '@/components/ui';

type Job = {
  id: string;
  title: string;
  status: string;
  department?: string;
  location?: string;
  remotePolicy?: string;
  employmentType?: string;
  activeSimulationVersionId?: string;
  createdAt: string;
  updatedAt: string;
};

const STATUS: Record<string, { label: string; tone: 'success' | 'warning' | 'neutral' | 'danger' | 'brand' }> = {
  published: { label: 'Pubblicata',  tone: 'success'  },
  draft:     { label: 'Bozza',       tone: 'warning'  },
  closed:    { label: 'Chiusa',      tone: 'neutral'  },
  archived:  { label: 'Archiviata', tone: 'danger'   },
};

const REMOTE: Record<string, string> = {
  remote: 'Remoto', hybrid: 'Ibrido', onsite: 'In sede',
};

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Oggi';
  if (days === 1) return 'Ieri';
  if (days < 30) return `${days}g fa`;
  return `${Math.floor(days / 30)}m fa`;
}

export default function AdminJobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Job[]>('/api/jobs')
      .then(setJobs)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const published  = jobs.filter(j => j.status === 'published').length;
  const drafts     = jobs.filter(j => j.status === 'draft').length;
  const withSim    = jobs.filter(j => j.activeSimulationVersionId).length;
  const missingSim = jobs.filter(j => !j.activeSimulationVersionId && j.status !== 'archived').length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[28px]">Offerte di lavoro</h1>
          <p className="text-[15px] text-ink-500 mt-1">Gestisci le posizioni aperte e le simulazioni collegate.</p>
        </div>
        <Link href="/admin/jobs/new">
          <Button iconLeft={<Plus size={16} />}>Nuova offerta</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card padding="md"><Stat value={String(jobs.length)} label="Totali" /></Card>
        <Card padding="md"><Stat value={String(published)} label="Pubblicate" /></Card>
        <Card padding="md"><Stat value={String(drafts)} label="Bozze" /></Card>
        <Card padding="md"><Stat value={String(withSim)} label="Con simulazione" /></Card>
      </div>

      {/* Missing simulation banner */}
      {missingSim > 0 && (
        <div className="flex items-center gap-3 bg-warning-subtle border border-warning/20 rounded-xl px-4 py-3 mb-5 text-[13px]">
          <AlertTriangle size={15} className="text-warning shrink-0" />
          <span className="text-warning-dark font-medium">
            {missingSim} {missingSim === 1 ? 'offerta non ha' : 'offerte non hanno'} ancora una simulazione — aggiungila per ricevere candidature qualificate.
          </span>
        </div>
      )}

      {/* Job list */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-ink-200 p-5 animate-pulse h-20" />
          ))}
        </div>
      ) : error ? (
        <Card padding="lg">
          <p className="text-danger text-[14px]">{error}</p>
        </Card>
      ) : jobs.length === 0 ? (
        <Card padding="lg">
          <div className="text-center py-10">
            <div className="w-12 h-12 rounded-full bg-ink-100 flex items-center justify-center mx-auto mb-4">
              <Briefcase size={22} className="text-ink-400" />
            </div>
            <p className="text-ink-500 font-semibold mb-1">Nessuna offerta ancora</p>
            <p className="text-ink-400 text-[14px] mb-5">Crea la tua prima posizione con simulazione.</p>
            <Link href="/admin/jobs/new">
              <Button iconLeft={<Plus size={15} />}>Crea offerta</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {jobs.map(job => {
            const s = STATUS[job.status] ?? { label: job.status, tone: 'neutral' as const };
            const subtitle = [
              job.department,
              job.location,
              job.remotePolicy ? REMOTE[job.remotePolicy] : undefined,
            ].filter(Boolean).join(' · ');
            const hasSim = !!job.activeSimulationVersionId;

            return (
              <Card
                key={job.id}
                padding="md"
                interactive
                onClick={() => router.push(`/admin/jobs/${job.id}`)}
              >
                <div className="flex items-center gap-4">
                  <Avatar name={job.title} square size="lg" />

                  <div className="flex-1 min-w-0">
                    <div className="text-[16px] font-bold text-ink-950 font-display leading-snug">
                      {job.title}
                    </div>
                    <div className="text-[13px] text-ink-500 mt-0.5">
                      {subtitle || '—'}{' · '}{timeAgo(job.updatedAt)}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {hasSim ? (
                      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-brand-subtle rounded-md">
                        <Zap size={12} className="text-blue-600" />
                        <span className="text-[12px] text-blue-700 font-semibold">Simulazione</span>
                      </div>
                    ) : (
                      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-warning-subtle rounded-md">
                        <AlertTriangle size={12} className="text-warning" />
                        <span className="text-[12px] text-warning-dark font-semibold">Senza simulazione</span>
                      </div>
                    )}
                    <Badge tone={s.tone} dot>{s.label}</Badge>
                  </div>

                  {/* Candidati link — stopPropagation so card click doesn't fire */}
                  <div className="flex items-center gap-1 ml-2">
                    <Link
                      href={`/admin/jobs/${job.id}/candidates`}
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-ink-600 hover:bg-ink-100 rounded-lg transition-colors"
                    >
                      <Users size={14} />
                      <span className="hidden sm:inline">Candidati</span>
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
