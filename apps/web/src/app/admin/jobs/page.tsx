'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

type Job = { id: string; title: string; status: string; department?: string; createdAt: string };

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Job[]>('/api/jobs').then(setJobs).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const statusColor: Record<string, string> = {
    draft: 'bg-yellow-100 text-yellow-800',
    published: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-800',
    archived: 'bg-red-100 text-red-800',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Offerte di lavoro</h1>
        <Link href="/admin/jobs/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
          + Nuova offerta
        </Link>
      </div>

      {loading && <p className="text-gray-500">Caricamento...</p>}
      {error && <p className="text-red-600">{error}</p>}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Titolo', 'Dipartimento', 'Stato', 'Creata', 'Azioni'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {jobs.map(job => (
              <tr key={job.id} className="hover:bg-gray-50 transition">
                <td className="px-4 py-3 font-medium">{job.title}</td>
                <td className="px-4 py-3 text-gray-500">{job.department ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[job.status] ?? 'bg-gray-100'}`}>
                    {job.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{new Date(job.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 flex gap-2">
                  <Link href={`/admin/jobs/${job.id}`} className="text-blue-600 hover:underline text-xs">Modifica</Link>
                  <Link href={`/admin/jobs/${job.id}/candidates`} className="text-gray-600 hover:underline text-xs">Candidati</Link>
                </td>
              </tr>
            ))}
            {!loading && jobs.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Nessuna offerta ancora. Creane una.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
