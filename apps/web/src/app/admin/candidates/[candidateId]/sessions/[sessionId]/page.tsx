'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

type Result = {
  result: { totalScore?: number; recommendation?: string; skillScores?: Record<string, number>; redFlags?: any[]; summary?: string };
  submissions: Array<{ id: string; stepId: string; stepType: string; status: string; answer: any; score: any; scoringStatus: string; submittedAt?: string }>;
  events: Array<{ id: string; eventType: string; stepId?: string; createdAt: string }>;
};

const recColor: Record<string, string> = { strong_yes: 'text-green-700', yes: 'text-blue-700', maybe: 'text-yellow-700', no: 'text-red-700', review_required: 'text-orange-700' };

export default function CandidateDetailPage() {
  const { sessionId } = useParams<{ candidateId: string; sessionId: string }>();
  const [data, setData] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Result>(`/api/sessions/${sessionId}/result`).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) return <div className="text-gray-500">Caricamento...</div>;
  if (!data) return <div className="text-red-600">Impossibile caricare i risultati.</div>;

  const { result, submissions, events } = data;

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold">Risultato candidato</h1>

      {/* Summary card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex gap-8">
        <div className="text-center">
          <div className="text-4xl font-bold text-blue-600">{result.totalScore != null ? `${result.totalScore}%` : '—'}</div>
          <div className="text-sm text-gray-500 mt-1">Punteggio totale</div>
        </div>
        <div className="border-l border-gray-200 pl-8">
          <div className={`text-xl font-bold ${recColor[result.recommendation ?? ''] ?? 'text-gray-700'}`}>{result.recommendation?.replace(/_/g, ' ').toUpperCase() ?? '—'}</div>
          <div className="text-sm text-gray-500 mt-1">Raccomandazione</div>
          {result.summary && <p className="text-sm text-gray-600 mt-3">{result.summary}</p>}
        </div>
        {result.skillScores && Object.keys(result.skillScores).length > 0 && (
          <div className="border-l border-gray-200 pl-8 flex-1">
            <div className="text-sm font-medium text-gray-700 mb-2">Punteggi per competenza</div>
            {Object.entries(result.skillScores).map(([skill, score]) => (
              <div key={skill} className="flex items-center gap-2 mb-1">
                <div className="text-xs text-gray-600 w-36 truncate">{skill}</div>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${score}%` }} />
                </div>
                <div className="text-xs font-medium w-8 text-right">{score}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Red flags */}
      {result.redFlags && result.redFlags.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="font-semibold text-red-700 mb-2">Segnali critici</h3>
          {result.redFlags.map((f: any, i: number) => (
            <div key={i} className="flex items-start gap-2 text-sm text-red-600">
              <span className={`mt-0.5 text-xs px-1.5 py-0.5 rounded ${f.severity === 'high' ? 'bg-red-200' : f.severity === 'medium' ? 'bg-orange-200 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}>{f.severity}</span>
              <span>{f.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Step submissions */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 font-semibold">Risultati per step</div>
        <div className="divide-y divide-gray-100">
          {submissions.map(sub => (
            <div key={sub.id} className="px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium mr-2">{sub.stepType}</span>
                  <span className="text-sm font-medium">{sub.status}</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">{sub.score?.totalScore != null ? `${sub.score.totalScore}%` : '—'}</div>
                  <div className="text-xs text-gray-400">{sub.scoringStatus}</div>
                </div>
              </div>
              {sub.score?.summary && <p className="text-sm text-gray-600 mt-1">{sub.score.summary}</p>}
              {sub.score?.criteria && sub.score.criteria.length > 0 && (
                <div className="mt-3 space-y-1">
                  {sub.score.criteria.map((c: any) => (
                    <div key={c.key} className="flex items-start gap-3 text-xs">
                      <span className="text-gray-500 w-36 shrink-0">{c.label}</span>
                      <span className="font-medium">{c.score}/{c.maxScore}</span>
                      {c.evidence && <span className="text-gray-400">{c.evidence}</span>}
                    </div>
                  ))}
                </div>
              )}
              {/* Show transcript for call steps */}
              {sub.stepType === 'simulated_call' && sub.answer?.transcript?.length > 0 && (
                <details className="mt-3">
                  <summary className="text-xs text-blue-600 cursor-pointer hover:underline">Mostra trascrizione ({sub.answer.transcript.length} turni)</summary>
                  <div className="mt-2 space-y-2 max-h-64 overflow-auto bg-gray-50 rounded p-3">
                    {sub.answer.transcript.map((t: any, i: number) => (
                      <div key={i} className={`text-xs ${t.speaker === 'candidate' ? 'text-blue-800' : 'text-gray-700'}`}>
                        <span className="font-medium">{t.speaker === 'candidate' ? 'CANDIDATO' : 'BUYER'}: </span>{t.text}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold mb-3">Timeline sessione</h3>
        <div className="space-y-1 max-h-48 overflow-auto">
          {events.map(evt => (
            <div key={evt.id} className="flex items-center gap-3 text-xs text-gray-600">
              <span className="text-gray-400 w-40 shrink-0">{new Date(evt.createdAt).toLocaleTimeString()}</span>
              <span className="font-mono">{evt.eventType}</span>
              {evt.stepId && <span className="text-gray-400">step:{evt.stepId.slice(-6)}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
