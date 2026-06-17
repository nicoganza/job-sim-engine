'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

type Job = { id: string; title: string; description: string; status: string; department?: string; seniority?: string };
type AiRun = { id: string; status: string; result?: any };

export default function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [aiRun, setAiRun] = useState<AiRun | null>(null);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get<Job>(`/api/jobs/${jobId}`).then(setJob);
  }, [jobId]);

  async function generateSimulation() {
    setGenerating(true); setMsg('');
    try {
      const run = await api.post<AiRun>(`/api/jobs/${jobId}/recommend-simulation`);
      setAiRun(run);
      setMsg('AI recommendation queued. Polling for results...');
      poll(run.id);
    } catch (e: any) { setMsg(e.message); } finally { setGenerating(false); }
  }

  function poll(runId: string) {
    const interval = setInterval(async () => {
      const run = await api.get<AiRun>(`/api/ai-recommendation-runs/${runId}`);
      setAiRun(run);
      if (run.status === 'completed' || run.status === 'failed') clearInterval(interval);
    }, 3000);
  }

  async function publishJob() {
    setPublishing(true);
    try { await api.post(`/api/jobs/${jobId}/publish`); setMsg('Job published!'); } catch (e: any) { setMsg(e.message); } finally { setPublishing(false); }
  }

  if (!job) return <div className="text-gray-500">Caricamento...</div>;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">{job.title}</h1>
          <span className="text-sm text-gray-500">{job.status} · {job.department}</span>
        </div>
      </div>

      {msg && <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">{msg}</div>}

      <div className="grid grid-cols-2 gap-4">
        <ActionCard title="Costruttore simulazione" description="Aggiungi, modifica e riordina gli step della simulazione." href={`/admin/jobs/${jobId}/simulation`} btnLabel="Apri costruttore" />
        <ActionCard title="Candidati" description="Vedi tutti i candidati e i loro risultati." href={`/admin/jobs/${jobId}/candidates`} btnLabel="Vedi candidati" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold">Raccomandazione AI simulazione</h2>
        <p className="text-sm text-gray-600">Lascia che l&apos;AI analizzi questa offerta e raccomandi gli step di simulazione in base ai requisiti del ruolo.</p>
        <button onClick={generateSimulation} disabled={generating} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
          {generating ? 'Richiesta in corso...' : '✨ Genera simulazione con AI'}
        </button>

        {aiRun && (
          <div className="mt-4 border-t pt-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium">Stato AI:</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${aiRun.status === 'completed' ? 'bg-green-100 text-green-700' : aiRun.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{aiRun.status}</span>
            </div>
            {aiRun.status === 'completed' && aiRun.result && (
              <Link href={`/admin/jobs/${jobId}/recommendations/${aiRun.id}`} className="text-purple-600 hover:underline text-sm">
                → Vedi raccomandazioni AI ({aiRun.result.recommendedSteps?.length ?? 0} step)
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button onClick={publishJob} disabled={publishing} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
          {publishing ? 'Pubblicazione...' : 'Pubblica offerta'}
        </button>
      </div>
    </div>
  );
}

function ActionCard({ title, description, href, btnLabel }: { title: string; description: string; href: string; btnLabel: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-2">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
      <Link href={href} className="inline-block mt-2 text-blue-600 hover:underline text-sm font-medium">{btnLabel} →</Link>
    </div>
  );
}
