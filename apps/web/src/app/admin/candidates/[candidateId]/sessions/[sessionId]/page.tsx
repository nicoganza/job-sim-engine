'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

type Submission = {
  id: string;
  stepId: string;
  stepType: string;
  status: string;
  answer: any;
  score: any;
  scoringStatus: string;
  submittedAt?: string;
};

type Result = {
  result: { totalScore?: number; recommendation?: string; skillScores?: Record<string, number>; redFlags?: any[]; summary?: string };
  submissions: Submission[];
  events: Array<{ id: string; eventType: string; stepId?: string; createdAt: string }>;
};

const STEP_LABELS: Record<string, string> = {
  multiple_choice:       'Scelta multipla',
  free_text:             'Testo libero',
  crm_prioritization:    'Prioritizzazione CRM',
  notification_reaction: 'Reazione notifiche',
  email_response:        'Risposta email',
  simulated_call:        'Chiamata simulata',
};

const STATUS_LABELS: Record<string, string> = {
  completed: 'Completato',
  pending:   'In attesa',
  started:   'Avviato',
  skipped:   'Saltato',
  timeout:   'Scaduto',
};

const SCORING_LABELS: Record<string, string> = {
  scored:  'Valutato',
  pending: 'In corso',
  failed:  'Errore',
  skipped: 'Saltato',
};

const REC_LABELS: Record<string, string> = {
  strong_yes:      'Altamente idoneo',
  yes:             'Idoneo',
  maybe:           'Da valutare',
  no:              'Non idoneo',
  review_required: 'Richiede revisione',
};

const EVENT_LABELS: Record<string, string> = {
  session_started:   'Sessione avviata',
  session_completed: 'Sessione completata',
  step_started:      'Step avviato',
  step_completed:    'Step completato',
  step_skipped:      'Step saltato',
  step_timeout:      'Step scaduto',
  scoring_started:   'Valutazione avviata',
  scoring_completed: 'Valutazione completata',
};

const recColor: Record<string, string> = {
  strong_yes: 'text-green-700', yes: 'text-blue-700',
  maybe: 'text-yellow-700', no: 'text-red-700', review_required: 'text-orange-700',
};

const ACTION_LABELS: Record<string, string> = {
  reply:             'Risposta inviata',
  ignore:            'Ignorata',
  escalate:          'Escalation',
  schedule_followup: 'Follow-up pianificato',
  create_task:       'Task creata',
};

function labelFor(map: Record<string, string>, key: string): string {
  return map[key] ?? key.replace(/_/g, ' ');
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">{children}</div>
  );
}

function AnswerView({ stepType, answer }: { stepType: string; answer: any }) {
  if (!answer) {
    return <p className="text-[13px] text-gray-400 italic">Nessuna risposta registrata.</p>;
  }

  if (stepType === 'free_text') {
    const text: string = answer.text ?? answer.response ?? '';
    if (!text) return <p className="text-[13px] text-gray-400 italic">Nessuna risposta.</p>;
    return (
      <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">{text}</p>
    );
  }

  if (stepType === 'email_response') {
    const subject: string = answer.subject ?? '';
    const body: string = answer.body ?? answer.text ?? '';
    if (!subject && !body) return <p className="text-[13px] text-gray-400 italic">Nessuna risposta.</p>;
    return (
      <div className="rounded-lg border border-gray-200 overflow-hidden text-[13px]">
        {subject && (
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex gap-2">
            <span className="text-gray-400 shrink-0 font-medium">Oggetto:</span>
            <span className="font-semibold text-gray-800">{subject}</span>
          </div>
        )}
        {body && (
          <div className="px-3 py-3 text-gray-700 leading-relaxed whitespace-pre-wrap">{body}</div>
        )}
      </div>
    );
  }

  if (stepType === 'multiple_choice') {
    const selected: string[] = answer.selectedOptionIds ?? (answer.selectedOptionId ? [answer.selectedOptionId] : []);
    if (!selected.length) return <p className="text-[13px] text-gray-400 italic">Nessuna selezione.</p>;
    return (
      <div className="flex flex-wrap gap-2">
        {selected.map((id: string) => (
          <span key={id} className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-[12px] font-semibold px-2.5 py-1.5 rounded-lg">
            ✓ {id}
          </span>
        ))}
      </div>
    );
  }

  if (stepType === 'crm_prioritization') {
    const items: any[] = answer.rankedItems ?? answer.orderedRecords ?? [];
    const explanation: string = answer.explanation ?? '';
    if (!items.length && !explanation) return <p className="text-[13px] text-gray-400 italic">Nessuna risposta.</p>;
    return (
      <div className="space-y-3">
        {items.length > 0 && (
          <div className="space-y-2">
            {items.map((item: any, i: number) => (
              <div key={i} className="flex items-start gap-3 text-[13px]">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <div>
                  <span className="text-gray-800 font-medium">{item.name ?? item.company ?? item.id ?? String(item)}</span>
                  {item.reason && <p className="text-gray-400 text-[12px] mt-0.5">{item.reason}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
        {explanation && (
          <div className="pt-3 border-t border-gray-100">
            <p className="text-[12px] text-gray-400 font-medium mb-1">Spiegazione</p>
            <p className="text-[13px] text-gray-700 leading-relaxed">{explanation}</p>
          </div>
        )}
      </div>
    );
  }

  if (stepType === 'notification_reaction') {
    const actions: any[] = answer.actions ?? answer.reactions ?? [];
    if (!actions.length) return <p className="text-[13px] text-gray-400 italic">Nessuna azione registrata.</p>;
    return (
      <div className="space-y-2">
        {actions.map((a: any, i: number) => (
          <div key={i} className="rounded-lg border border-gray-200 p-3 text-[13px]">
            <span className="font-semibold text-gray-800">{ACTION_LABELS[a.action] ?? a.action}</span>
            {a.note && <p className="text-gray-500 mt-1 text-[12px]">{a.note}</p>}
            {a.response && <p className="text-gray-600 mt-1 leading-relaxed whitespace-pre-wrap">{a.response}</p>}
          </div>
        ))}
      </div>
    );
  }

  if (stepType === 'simulated_call') {
    const transcript: any[] = answer.transcript ?? [];
    if (!transcript.length) return <p className="text-[13px] text-gray-400 italic">Nessuna trascrizione.</p>;
    return (
      <div className="space-y-2 max-h-80 overflow-auto pr-1">
        {transcript.map((t: any, i: number) => {
          const isCandidate = t.speaker === 'candidate';
          return (
            <div key={i} className={`flex gap-2 text-[12px] ${isCandidate ? 'flex-row-reverse' : ''}`}>
              <div className={`rounded-xl px-3 py-2 max-w-[85%] leading-relaxed ${
                isCandidate
                  ? 'bg-blue-600 text-white rounded-tr-sm'
                  : 'bg-gray-100 text-gray-700 rounded-tl-sm'
              }`}>
                <div className={`text-[10px] font-semibold mb-0.5 ${isCandidate ? 'text-blue-200' : 'text-gray-400'}`}>
                  {isCandidate ? 'Candidato' : 'Interlocutore'}
                </div>
                {t.text}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return null;
}

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
    <div className="space-y-6 max-w-6xl">
      <h1 className="text-2xl font-bold">Risultato candidato</h1>

      {/* Summary card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex gap-8">
        <div className="text-center shrink-0">
          <div className="text-4xl font-bold text-blue-600">
            {result.totalScore != null ? `${result.totalScore}%` : '—'}
          </div>
          <div className="text-sm text-gray-500 mt-1">Punteggio totale</div>
        </div>
        <div className="border-l border-gray-200 pl-8 shrink-0">
          <div className={`text-xl font-bold ${recColor[result.recommendation ?? ''] ?? 'text-gray-700'}`}>
            {result.recommendation ? labelFor(REC_LABELS, result.recommendation) : '—'}
          </div>
          <div className="text-sm text-gray-500 mt-1">Raccomandazione</div>
          {result.summary && <p className="text-sm text-gray-600 mt-3 max-w-sm">{result.summary}</p>}
        </div>
        {result.skillScores && Object.keys(result.skillScores).length > 0 && (
          <div className="border-l border-gray-200 pl-8 flex-1">
            <div className="text-sm font-medium text-gray-700 mb-2">Punteggi per competenza</div>
            {Object.entries(result.skillScores).map(([skill, score]) => (
              <div key={skill} className="flex items-center gap-2 mb-1">
                <div className="text-xs text-gray-600 w-40 truncate">{skill}</div>
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
              <span className={`mt-0.5 text-xs px-1.5 py-0.5 rounded shrink-0 ${
                f.severity === 'high' ? 'bg-red-200' : f.severity === 'medium' ? 'bg-orange-200 text-orange-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {f.severity}
              </span>
              <span>{f.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Step submissions — 2-col layout */}
      <div className="space-y-4">
        {submissions.map((sub, idx) => (
          <div key={sub.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Step header */}
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3 bg-gray-50">
              <span className="text-[11px] font-bold text-gray-500">Step {idx + 1}</span>
              <span className="text-[12px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold">
                {labelFor(STEP_LABELS, sub.stepType)}
              </span>
              <span className="text-[12px] text-gray-500">{labelFor(STATUS_LABELS, sub.status)}</span>
              {sub.submittedAt && (
                <span className="text-[12px] text-gray-400 ml-auto">
                  {new Date(sub.submittedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>

            {/* Body: 2 columns */}
            <div className="grid grid-cols-2 divide-x divide-gray-100">

              {/* LEFT — candidate answer */}
              <div className="p-5">
                <SectionLabel>Risposta del candidato</SectionLabel>
                <AnswerView stepType={sub.stepType} answer={sub.answer} />
              </div>

              {/* RIGHT — AI analysis */}
              <div className="p-5">
                <SectionLabel>Analisi AI</SectionLabel>

                {/* Score */}
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-3xl font-bold text-gray-900">
                    {sub.score?.totalScore != null ? `${sub.score.totalScore}%` : '—'}
                  </span>
                  <span className="text-[12px] text-gray-400">{labelFor(SCORING_LABELS, sub.scoringStatus)}</span>
                </div>

                {/* Summary */}
                {sub.score?.summary && (
                  <p className="text-[13px] text-gray-600 italic mb-4 leading-relaxed">
                    "{sub.score.summary}"
                  </p>
                )}

                {/* Criteria */}
                {sub.score?.criteria && sub.score.criteria.length > 0 && (
                  <div className="space-y-2.5">
                    {sub.score.criteria.map((c: any) => (
                      <div key={c.key}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[12px] text-gray-600">{c.label}</span>
                          <span className="text-[12px] font-semibold text-gray-800">{c.score}/{c.maxScore}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${c.maxScore > 0 ? (c.score / c.maxScore) * 100 : 0}%` }}
                          />
                        </div>
                        {c.evidence && (
                          <p className="text-[11px] text-gray-400 mt-1">{c.evidence}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {!sub.score && (
                  <p className="text-[13px] text-gray-400 italic">Valutazione non ancora disponibile.</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold mb-3">Timeline sessione</h3>
        <div className="space-y-1 max-h-48 overflow-auto">
          {events.map(evt => (
            <div key={evt.id} className="flex items-center gap-3 text-xs text-gray-600">
              <span className="text-gray-400 w-40 shrink-0">
                {new Date(evt.createdAt).toLocaleTimeString()}
              </span>
              <span>{labelFor(EVENT_LABELS, evt.eventType)}</span>
              {evt.stepId && <span className="text-gray-400">step:{evt.stepId.slice(-6)}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
