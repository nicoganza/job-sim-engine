'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

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

export default function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/public/jobs/${jobId}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => { setJob(data); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, [jobId]);

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setApplying(true);
    try {
      const res = await fetch(`/api/public/jobs/${jobId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Application failed.'); return; }
      router.push(`/apply/${data.applicationToken}`);
    } catch {
      setError('Network error — please try again.');
    } finally {
      setApplying(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400">Caricamento…</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <p className="text-slate-500">Questa posizione non è più disponibile.</p>
        <Link href="/jobs" className="text-indigo-600 text-sm hover:underline">← Tutte le offerte</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Nav */}
      <nav className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">JS</span>
          </div>
          <span className="font-semibold text-slate-900">JobSim</span>
        </Link>
        <Link href="/jobs" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
          ← Tutte le offerte
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto w-full px-6 py-12">
        {/* Job header */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 mb-6">
          <p className="text-sm text-indigo-600 font-medium mb-2">{job.organization.name}</p>
          <h1 className="text-2xl font-bold text-slate-900 mb-4">{job.title}</h1>
          <div className="flex flex-wrap gap-2 mb-6">
            {job.department && <Tag>{job.department}</Tag>}
            {job.seniority && <Tag>{job.seniority}</Tag>}
            {job.employmentType && <Tag>{job.employmentType}</Tag>}
            {job.location && <Tag>📍 {job.location}</Tag>}
            {job.remotePolicy && <Tag>🌐 {job.remotePolicy}</Tag>}
          </div>
          <div className="prose prose-slate prose-sm max-w-none">
            <p className="text-slate-600 leading-relaxed whitespace-pre-line">{job.description}</p>
          </div>
        </div>

        {/* Simulation notice */}
        {job.activeSimulationVersionId && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 mb-6">
            <div className="flex gap-3">
              <span className="text-2xl">🎯</span>
              <div>
                <h3 className="font-semibold text-indigo-900 mb-1">Simulazione di lavoro inclusa</h3>
                <p className="text-indigo-700 text-sm leading-relaxed">
                  Questo ruolo utilizza una breve simulazione di lavoro invece di una lettera di presentazione. Completerai task realistici che ti permettono di mostrare le tue competenze direttamente.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Apply card */}
        {!showForm ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
            <h2 className="font-semibold text-slate-900 text-lg mb-2">Sei interessato a questo ruolo?</h2>
            <p className="text-slate-500 text-sm mb-6">Candidati in meno di un minuto — nessuna lettera di presentazione richiesta.</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-indigo-600 text-white font-semibold px-8 py-3 rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Candidati ora
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <h2 className="font-semibold text-slate-900 text-lg mb-6">I tuoi dati</h2>
            <form onSubmit={handleApply} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome e cognome</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Mario Rossi"
                  required
                  className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Indirizzo email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="mario@email.com"
                  required
                  className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-slate-200 text-slate-600 font-medium py-2.5 rounded-lg hover:bg-slate-50 transition-colors text-sm"
                >
                  Indietro
                </button>
                <button
                  type="submit"
                  disabled={applying}
                  className="flex-1 bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm"
                >
                  {applying ? 'Invio…' : 'Invia candidatura'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center bg-slate-100 text-slate-600 text-xs font-medium px-2.5 py-1 rounded-full">
      {children}
    </span>
  );
}
