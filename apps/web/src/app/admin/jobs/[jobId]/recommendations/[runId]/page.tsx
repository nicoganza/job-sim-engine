'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

type Run = { id: string; status: string; result?: { roleProfile?: any; extractedSkills?: any[]; recommendedSteps?: any[]; risksAndBiasNotes?: string[] }};

export default function RecommendationsPage() {
  const { jobId, runId } = useParams<{ jobId: string; runId: string }>();
  const router = useRouter();
  const [run, setRun] = useState<Run | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [accepting, setAccepting] = useState(false);
  const [simId, setSimId] = useState('');

  useEffect(() => {
    api.get<Run>(`/api/ai-recommendation-runs/${runId}`).then(setRun);
    api.get<{id?: string}>(`/api/jobs/${jobId}/simulation`).then(s => { if (s.id) setSimId(s.id); }).catch(() => {});
  }, [runId, jobId]);

  async function accept() {
    if (!simId || selected.size === 0) return;
    setAccepting(true);
    try {
      await api.post(`/api/ai-recommendation-runs/${runId}/accept`, { simulationId: simId, selectedRecommendationStepIds: [...selected] });
      router.push(`/admin/jobs/${jobId}/simulation`);
    } finally { setAccepting(false); }
  }

  if (!run) return <div className="text-gray-500">Caricamento...</div>;
  const result = run.result;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Raccomandazione AI simulazione</h1>
        <span className={`text-xs px-3 py-1 rounded-full font-medium ${run.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{run.status}</span>
      </div>

      {result?.roleProfile && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold mb-3">Profilo del ruolo</h2>
          <div className="grid grid-cols-3 gap-4 text-sm">
            {Object.entries(result.roleProfile).map(([k, v]) => (
              <div key={k}><span className="text-gray-500 capitalize">{k.replace(/([A-Z])/g, ' $1')}: </span><span className="font-medium">{String(v)}</span></div>
            ))}
          </div>
        </div>
      )}

      {result?.risksAndBiasNotes && result.risksAndBiasNotes.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="font-semibold text-amber-800 mb-2">⚠ Note su rischi e bias</h3>
          {result.risksAndBiasNotes.map((note, i) => <p key={i} className="text-sm text-amber-700">• {note}</p>)}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Step consigliati ({result?.recommendedSteps?.length ?? 0})</h2>
          <div className="flex gap-3 items-center">
            <span className="text-sm text-gray-500">{selected.size} selezionati</span>
            <button onClick={accept} disabled={accepting || selected.size === 0 || !simId}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
              {accepting ? 'Aggiunta...' : 'Aggiungi alla simulazione'}
            </button>
          </div>
        </div>

        {result?.recommendedSteps?.map(step => (
          <div key={step.id} className={`bg-white rounded-xl border p-5 cursor-pointer transition ${selected.has(step.id) ? 'border-purple-400 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}
            onClick={() => setSelected(s => { const n = new Set(s); n.has(step.id) ? n.delete(step.id) : n.add(step.id); return n; })}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={selected.has(step.id)} onChange={() => {}} className="mt-0.5" />
                <div>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">{step.type}</span>
                  <h3 className="font-semibold mt-1">{step.title}</h3>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{Math.round(step.confidence * 100)}% confidence</div>
                <div className="text-xs text-gray-400">{step.estimatedDurationMinutes} min</div>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2 ml-7">{step.reason}</p>
            {step.targetSkills?.length > 0 && (
              <div className="flex gap-1 mt-2 ml-7 flex-wrap">
                {step.targetSkills.map((sk: string) => <span key={sk} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{sk}</span>)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
