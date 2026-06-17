'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

type ApplicationRow = { id: string; status: string; candidate: { name?: string; email: string }; simulationSessions: { id: string; status: string; candidateResult?: { totalScore?: number; recommendation?: string } }[] };

const recColor: Record<string, string> = {
  strong_yes: 'text-green-700 bg-green-100',
  yes: 'text-blue-700 bg-blue-100',
  maybe: 'text-yellow-700 bg-yellow-100',
  no: 'text-red-700 bg-red-100',
  review_required: 'text-orange-700 bg-orange-100',
};

export default function CandidatesPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [apps, setApps] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    api.get<ApplicationRow[]>(`/api/jobs/${jobId}/candidates`).then(setApps).finally(() => setLoading(false));
  }, [jobId]);

  async function invite() {
    if (!inviteEmail) return;
    setInviting(true);
    try {
      const { application } = await api.post<{ application: ApplicationRow; candidate: unknown }>(`/api/jobs/${jobId}/candidates/invite`, { email: inviteEmail });
      setApps(prev => [...prev, { ...application, simulationSessions: [] } as any]);
      setInviteEmail('');
    } finally { setInviting(false); }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Candidati</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold mb-3">Invita candidato</h2>
        <div className="flex gap-2">
          <input type="email" placeholder="candidato@email.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <button onClick={invite} disabled={inviting} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {inviting ? 'Invio...' : 'Invita'}
          </button>
        </div>
      </div>

      {loading ? <p className="text-gray-500">Caricamento...</p> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['Nome', 'Email', 'Stato candidatura', 'Stato sim.', 'Punteggio', 'Raccomandazione', 'Azioni'].map(h => <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {apps.map(app => {
                const session = app.simulationSessions?.[0];
                const result = session?.candidateResult;
                return (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{app.candidate.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{app.candidate.email}</td>
                    <td className="px-4 py-3 text-xs">{app.status}</td>
                    <td className="px-4 py-3 text-xs">{session?.status ?? '—'}</td>
                    <td className="px-4 py-3 font-medium">{result?.totalScore != null ? `${result.totalScore}%` : '—'}</td>
                    <td className="px-4 py-3">
                      {result?.recommendation ? <span className={`text-xs px-2 py-1 rounded-full font-medium ${recColor[result.recommendation] ?? ''}`}>{result.recommendation}</span> : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {session?.id && <Link href={`/admin/candidates/${app.candidate.email}/sessions/${session.id}`} className="text-blue-600 hover:underline text-xs">Vedi</Link>}
                    </td>
                  </tr>
                );
              })}
              {apps.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Nessun candidato ancora.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
