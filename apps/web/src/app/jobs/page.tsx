'use client';
import { useEffect, useState } from 'react';
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
  createdAt: string;
  organization: { name: string };
};

export default function JobsBoardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/public/jobs')
      .then(r => r.json())
      .then(data => { setJobs(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = jobs.filter(j =>
    !search || j.title.toLowerCase().includes(search.toLowerCase()) || j.department?.toLowerCase().includes(search.toLowerCase()) || j.organization.name.toLowerCase().includes(search.toLowerCase())
  );

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
        <Link href="/login/company" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
          Accesso aziende →
        </Link>
      </nav>

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-12 text-center">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Posizioni aperte</h1>
        <p className="text-slate-500 mb-8">Candidati e completa una simulazione di lavoro reale per distinguerti.</p>
        <div className="max-w-md mx-auto">
          <input
            type="text"
            placeholder="Cerca per titolo, dipartimento o azienda…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>
      </div>

      {/* Job list */}
      <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-10">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse">
                <div className="h-5 bg-slate-200 rounded w-48 mb-3" />
                <div className="h-4 bg-slate-100 rounded w-32" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            {jobs.length === 0 ? 'Nessuna posizione aperta al momento. Torna a controllare presto.' : 'Nessuna offerta corrisponde alla ricerca.'}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(job => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="block bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:border-indigo-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-slate-900 text-lg group-hover:text-indigo-600 transition-colors truncate">{job.title}</h2>
                    <p className="text-sm text-slate-500 mt-0.5">{job.organization.name}</p>
                    <p className="text-sm text-slate-600 mt-3 line-clamp-2 leading-relaxed">{job.description}</p>
                  </div>
                  <span className="text-indigo-600 text-sm font-medium shrink-0 mt-1 group-hover:translate-x-0.5 transition-transform">Candidati →</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {job.department && <Tag>{job.department}</Tag>}
                  {job.seniority && <Tag>{job.seniority}</Tag>}
                  {job.employmentType && <Tag>{job.employmentType}</Tag>}
                  {job.location && <Tag>📍 {job.location}</Tag>}
                  {job.remotePolicy && <Tag>🌐 {job.remotePolicy}</Tag>}
                </div>
              </Link>
            ))}
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
