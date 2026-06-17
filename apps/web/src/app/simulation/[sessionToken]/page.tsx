'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

type SessionData = { session: { status: string; currentStepId?: string }; steps: Array<{ id: string; type: string; title: string; orderIndex: number }>; submissions: Array<{ stepId: string; status: string }> };

export default function SimulationOverviewPage() {
  const { sessionToken } = useParams<{ sessionToken: string }>();
  const router = useRouter();
  const [data, setData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<SessionData>(`/api/candidate/sessions/${sessionToken}`).then(setData).finally(() => setLoading(false));
  }, [sessionToken]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Caricamento...</div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center text-red-600">Sessione non trovata.</div>;

  const { session, steps, submissions } = data;
  const submittedIds = new Set(submissions.filter(s => s.status === 'submitted').map(s => s.stepId));
  const current = session.currentStepId;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 max-w-lg w-full p-8 space-y-6">
        <h1 className="text-2xl font-bold">Panoramica simulazione</h1>
        <p className="text-gray-600 text-sm">Completa tutti gli step per terminare la simulazione. Il tuo progresso viene salvato automaticamente.</p>

        <div className="space-y-2">
          {steps.sort((a, b) => a.orderIndex - b.orderIndex).map((step, i) => {
            const done = submittedIds.has(step.id);
            const isCurrent = step.id === current;
            return (
              <div key={step.id} className={`flex items-center gap-3 p-3 rounded-xl border text-sm ${done ? 'border-green-200 bg-green-50' : isCurrent ? 'border-blue-200 bg-blue-50' : 'border-gray-200'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${done ? 'bg-green-500 text-white' : isCurrent ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {done ? '✓' : i + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{step.title}</div>
                  <div className="text-xs text-gray-400 capitalize">{step.type.replace(/_/g, ' ')}</div>
                </div>
                {isCurrent && !done && (
                  <button onClick={() => router.push(`/simulation/${sessionToken}/step/${step.id}`)}
                    className="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-medium hover:bg-blue-700">
                    Inizia
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {session.status === 'completed' ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <p className="font-semibold text-green-700">Simulazione completata!</p>
            <p className="text-sm text-green-600 mt-1">Grazie. Le tue risposte sono state inviate per la revisione.</p>
          </div>
        ) : current ? (
          <button onClick={() => router.push(`/simulation/${sessionToken}/step/${current}`)}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition">
            Continua →
          </button>
        ) : null}
      </div>
    </div>
  );
}
