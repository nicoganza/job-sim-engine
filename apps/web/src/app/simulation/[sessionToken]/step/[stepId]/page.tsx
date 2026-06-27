'use client';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

type StepData = {
  step: { id: string; type: string; title: string; instructions: string; timeLimitSeconds?: number; publicConfig: any };
  stepIndex: number;
  totalSteps: number;
  submission?: { status: string } | null;
  autosavedAnswer?: any;
  organization?: { logoUrl: string | null; name: string | null };
};

export default function StepPage() {
  const { sessionToken, stepId } = useParams<{ sessionToken: string; stepId: string }>();
  const router = useRouter();
  const [data, setData] = useState<StepData | null>(null);
  const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  // timeLeft is kept for internal auto-submit only — not displayed
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const autosaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const welcomeSubmitDone = useRef(false);

  useEffect(() => {
    api.get<StepData>(`/api/candidate/sessions/${sessionToken}/steps/${stepId}`)
      .then(d => {
        setData(d);
        if (d.autosavedAnswer) setAnswer(d.autosavedAnswer);
        if (d.step.timeLimitSeconds) setTimeLeft(d.step.timeLimitSeconds);
      })
      .catch(e => setError(e.message)).finally(() => setLoading(false));

    api.post(`/api/candidate/sessions/${sessionToken}/steps/${stepId}/events`, { eventType: 'step_started' }).catch(() => {});
  }, [sessionToken, stepId]);

  // Internal timer — auto-submits when time is up, not shown to candidate
  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) { handleSubmit(); return; }
    const t = setTimeout(() => setTimeLeft(t => (t !== null ? t - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [timeLeft]);

  useEffect(() => {
    autosaveRef.current = setInterval(() => {
      if (answer) api.post(`/api/candidate/sessions/${sessionToken}/steps/${stepId}/autosave`, { answer }).catch(() => {});
    }, 8000);
    return () => { if (autosaveRef.current) clearInterval(autosaveRef.current); };
  }, [answer, sessionToken, stepId]);

  async function handleSubmit() {
    if (submitting || !answer) return;
    setSubmitting(true);
    try {
      const result = await api.post<{ nextStepId?: string }>(`/api/candidate/sessions/${sessionToken}/steps/${stepId}/submit`, { answer });
      if (result.nextStepId) {
        router.push(`/simulation/${sessionToken}/step/${result.nextStepId}`);
      } else {
        await api.post(`/api/candidate/sessions/${sessionToken}/complete`);
        router.push(`/simulation/${sessionToken}/completed`);
      }
    } catch (e: any) { setError(e.message); } finally { setSubmitting(false); }
  }

  // Auto-submit for welcome step — fires when enough time has passed (classic) or all slides done (TTS)
  useEffect(() => {
    if (!data || data.step.type !== 'welcome' || welcomeSubmitDone.current || submitting) return;
    const cfg = data.step.publicConfig;
    const minRead = cfg?.minReadSeconds ?? 15;
    const isSlides = !!(cfg?.slides?.length);
    const slidesTotal: number = cfg?.slides?.length ?? 0;
    const ready = isSlides
      ? (answer?.slidesCompleted ?? 0) >= slidesTotal && slidesTotal > 0
      : answer?.acknowledged && (answer?.timeSpentSeconds ?? 0) >= minRead;
    if (ready) {
      welcomeSubmitDone.current = true;
      handleSubmit();
    }
  }, [answer]); // eslint-disable-line react-hooks/exhaustive-deps

  const trackEvent = useCallback((eventType: string, payload?: unknown) => {
    api.post(`/api/candidate/sessions/${sessionToken}/steps/${stepId}/events`, { eventType, payload }).catch(() => {});
  }, [sessionToken, stepId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Caricamento...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-600">{error}</div>;
  if (!data) return null;

  const { step, stepIndex, totalSteps } = data;
  const alreadySubmitted = data.submission?.status === 'submitted';
  const progress = totalSteps > 0 ? (stepIndex / totalSteps) * 100 : 0;
  const logoUrl = data.organization?.logoUrl ?? null;
  const orgName = data.organization?.name ?? null;

  const isCrm = step.type === 'crm_prioritization';

  const header = (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {(logoUrl || orgName) && (
            <div className="flex items-center gap-2 flex-shrink-0 border-r border-gray-100 pr-3 mr-1">
              {logoUrl && <img src={logoUrl} alt={orgName ?? 'logo'} className="h-6 w-auto object-contain" />}
              {orgName && <span className="text-sm font-medium text-gray-700 whitespace-nowrap">{orgName}</span>}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-semibold text-gray-900 text-sm truncate">{step.title}</h1>
            <p className="text-xs text-gray-400 capitalize">{step.type.replace(/_/g, ' ')}</p>
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          <span className="text-sm font-bold text-gray-700">{stepIndex}</span>
          <span className="text-sm text-gray-400">/{totalSteps}</span>
        </div>
      </div>
      <div className="h-1 bg-gray-100">
        <div className="h-1 bg-blue-500 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
      <div className="px-6 py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className={`flex-shrink-0 rounded-full transition-all duration-300 ${
            i < stepIndex - 1 ? 'w-2 h-2 bg-blue-500' :
            i === stepIndex - 1 ? 'w-3 h-3 bg-blue-600 ring-2 ring-blue-200' :
            'w-2 h-2 bg-gray-200'
          }`} />
        ))}
      </div>
    </div>
  );

  if (isCrm) {
    return (
      <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
        {header}
        {alreadySubmitted ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
              <p className="font-semibold text-green-700">Step completato</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 mx-4 mt-3 rounded-xl px-4 py-2">{error}</p>}
            <StepRenderer
              type={step.type}
              config={step.publicConfig}
              answer={answer}
              onAnswerChange={setAnswer}
              onTrackEvent={trackEvent}
              onSubmit={handleSubmit}
              submitting={submitting}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {header}

      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-sm text-blue-800 leading-relaxed">{step.instructions}</p>
        </div>

        {alreadySubmitted ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <p className="font-semibold text-green-700">Step completato</p>
          </div>
        ) : (
          <>
            <StepRenderer type={step.type} config={step.publicConfig} answer={answer} onAnswerChange={setAnswer} onTrackEvent={trackEvent} />

            {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-2">{error}</p>}

            {step.type === 'welcome' ? (
              submitting && (
                <div className="flex items-center justify-center gap-2 py-3 text-sm text-gray-400">
                  <span className="w-4 h-4 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
                  Avanzamento...
                </div>
              )
            ) : (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-gray-400">Step {stepIndex} di {totalSteps}</span>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !answer}
                  className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-40 transition flex items-center gap-2 text-sm"
                >
                  {submitting ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Invio...</>
                  ) : (
                    <>Avanti {stepIndex < totalSteps ? `(${stepIndex + 1}/${totalSteps})` : '— Completa'} <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg></>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// --- Step renderers ---

function StepRenderer({ type, config, answer, onAnswerChange, onTrackEvent, onSubmit, submitting }: { type: string; config: any; answer: any; onAnswerChange: (a: any) => void; onTrackEvent: (e: string, p?: any) => void; onSubmit?: () => void; submitting?: boolean }) {
  switch (type) {
    case 'multiple_choice': return <MultipleChoiceRenderer config={config} answer={answer} onChange={onAnswerChange} />;
    case 'free_text': return <FreeTextRenderer config={config} answer={answer} onChange={onAnswerChange} />;
    case 'email_response': return <EmailResponseRenderer config={config} answer={answer} onChange={onAnswerChange} />;
    case 'crm_prioritization': return <RichCrmRenderer config={config} answer={answer} onChange={onAnswerChange} onTrackEvent={onTrackEvent} onSubmit={onSubmit} submitting={submitting} />;
    case 'notification_reaction': return config.workspace
      ? <SlackWorkspaceRenderer config={config} answer={answer} onChange={onAnswerChange} />
      : <NotificationReactionRenderer config={config} answer={answer} onChange={onAnswerChange} />;
    case 'simulated_call': return <SimulatedCallRenderer config={config} answer={answer} onChange={onAnswerChange} onTrackEvent={onTrackEvent} />;
    case 'welcome': return config.slides?.length
      ? <TtsSlidesRenderer config={config} answer={answer} onChange={onAnswerChange} />
      : <WelcomeRenderer config={config} answer={answer} onChange={onAnswerChange} />;
    case 'spreadsheet_edit': return <SpreadsheetEditRenderer config={config} answer={answer} onChange={onAnswerChange} />;
    default: return <div className="text-gray-500">Unknown step type: {type}</div>;
  }
}

function MultipleChoiceRenderer({ config, answer, onChange }: any) {
  const selected: string[] = answer?.selectedOptionIds ?? [];
  function toggle(id: string) {
    if (config.allowMultiple) {
      onChange({ selectedOptionIds: selected.includes(id) ? selected.filter((s: string) => s !== id) : [...selected, id] });
    } else {
      onChange({ selectedOptionIds: [id] });
    }
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <p className="font-medium">{config.question}</p>
      <div className="space-y-2">
        {config.options?.map((opt: any) => (
          <button key={opt.id} onClick={() => toggle(opt.id)}
            className={`w-full text-left px-4 py-3 rounded-xl border transition ${selected.includes(opt.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-${config.allowMultiple ? 'sm' : 'full'} border-2 flex-shrink-0 ${selected.includes(opt.id) ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`} />
              <span className="text-sm">{opt.label}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function FreeTextRenderer({ config, answer, onChange }: any) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
      <p className="font-medium text-sm">{config.prompt}</p>
      <textarea className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm min-h-[200px] focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Write your response here..."
        value={answer?.text ?? ''}
        onChange={e => onChange({ text: e.target.value })} />
      {config.minWords && <p className="text-xs text-gray-400">Minimum {config.minWords} words</p>}
    </div>
  );
}

function EmailResponseRenderer({ config, answer, onChange }: any) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      {config.emailThread?.map((email: any) => (
        <div key={email.id} className="border border-gray-200 rounded-xl p-4 text-sm space-y-2">
          <div className="flex gap-4 text-xs text-gray-500">
            <span><strong>From:</strong> {email.from}</span>
            <span><strong>Subject:</strong> {email.subject}</span>
          </div>
          <p className="whitespace-pre-wrap text-gray-700">{email.body}</p>
        </div>
      ))}
      <div className="space-y-2 pt-2">
        <p className="text-sm font-medium text-gray-700">{config.taskPrompt}</p>
        <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Subject line..." value={answer?.subject ?? ''} onChange={e => onChange({ ...answer, subject: e.target.value })} />
        <textarea className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm min-h-[200px]" placeholder="Write your reply..." value={answer?.body ?? ''} onChange={e => onChange({ ...answer, body: e.target.value })} />
      </div>
    </div>
  );
}

function NotificationReactionRenderer({ config, answer, onChange }: any) {
  const actions: Record<string, any> = {};
  (answer?.actions ?? []).forEach((a: any) => { actions[a.notificationId] = a; });

  function setAction(notifId: string, update: Partial<{ actionType: string; responseText: string; priorityRank: number }>) {
    const updated = { ...(actions[notifId] ?? { notificationId: notifId }), ...update };
    const newActions = { ...actions, [notifId]: updated };
    onChange({ actions: Object.values(newActions) });
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <p className="text-sm text-gray-600">{config.scenarioContext}</p>
      {config.notifications?.map((notif: any) => (
        <div key={notif.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded capitalize">{notif.channel}</span>
            <span className="text-sm font-medium">{notif.senderName}</span>
            <span className="text-xs text-gray-400">({notif.senderRole})</span>
          </div>
          <p className="text-sm text-gray-700">{notif.message}</p>
          <div className="flex gap-2 flex-wrap">
            {config.allowedActions?.map((action: string) => (
              <button key={action} onClick={() => setAction(notif.id, { actionType: action })}
                className={`text-xs px-3 py-1.5 rounded-lg border transition ${actions[notif.id]?.actionType === action ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'}`}>
                {action.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
          {['reply', 'ask_clarification'].includes(actions[notif.id]?.actionType) && (
            <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[80px]" placeholder="Write your reply..." value={actions[notif.id]?.responseText ?? ''} onChange={e => setAction(notif.id, { responseText: e.target.value })} />
          )}
        </div>
      ))}
    </div>
  );
}

function WelcomeRenderer({ config, answer, onChange }: any) {
  const startTime = useMemo(() => Date.now(), []);

  useEffect(() => {
    const timer = setInterval(() => {
      const spent = Math.round((Date.now() - startTime) / 1000);
      onChange({ acknowledged: true, timeSpentSeconds: spent });
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime, onChange]);

  const spent = answer?.timeSpentSeconds ?? 0;

  return (
    <div className="space-y-4">
      {/* Founder message card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
            {config.founderName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) ?? 'F'}
          </div>
          <div>
            <p className="font-semibold text-sm">{config.founderName}</p>
            {config.founderRole && <p className="text-xs text-gray-500">{config.founderRole}</p>}
          </div>
        </div>
        {config.videoUrl ? (
          <div className="rounded-xl overflow-hidden bg-black aspect-video">
            <video src={config.videoUrl} controls className="w-full h-full" />
          </div>
        ) : null}
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{config.founderMessage}</p>
      </div>

      {/* Slack message */}
      {config.slackMessage && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 flex items-center justify-center">
              <svg viewBox="0 0 54 54" className="w-5 h-5"><path d="M19.712.133a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386h5.376V5.52A5.381 5.381 0 0 0 19.712.133m0 14.365H5.376A5.381 5.381 0 0 0 0 19.884a5.381 5.381 0 0 0 5.376 5.387h14.336a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386" fill="#36C5F0"/><path d="M53.76 19.884a5.381 5.381 0 0 0-5.376-5.386 5.381 5.381 0 0 0-5.376 5.386v5.387h5.376a5.381 5.381 0 0 0 5.376-5.387m-14.336 0V5.52A5.381 5.381 0 0 0 34.048.133a5.381 5.381 0 0 0-5.376 5.387v14.364a5.381 5.381 0 0 0 5.376 5.387 5.381 5.381 0 0 0 5.376-5.387" fill="#2EB67D"/><path d="M34.048 54a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386h-5.376v5.386A5.381 5.381 0 0 0 34.048 54m0-14.365h14.336a5.381 5.381 0 0 0 5.376-5.386 5.381 5.381 0 0 0-5.376-5.387H34.048a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386" fill="#ECB22E"/><path d="M0 34.249a5.381 5.381 0 0 0 5.376 5.386 5.381 5.381 0 0 0 5.376-5.386v-5.387H5.376A5.381 5.381 0 0 0 0 34.249m14.336 0v14.364A5.381 5.381 0 0 0 19.712 54a5.381 5.381 0 0 0 5.376-5.387V34.249a5.381 5.381 0 0 0-5.376-5.387 5.381 5.381 0 0 0-5.376 5.387" fill="#E01E5A"/></svg>
            </div>
            <span className="text-xs font-semibold text-[#1D1C1D]"># general</span>
          </div>
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded bg-indigo-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {config.slackMessage.sender?.[0] ?? 'M'}
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-bold text-[#1D1C1D]">{config.slackMessage.sender}</span>
                {config.slackMessage.role && <span className="text-xs text-gray-400">{config.slackMessage.role}</span>}
              </div>
              <p className="text-sm text-[#1D1C1D] mt-0.5">{config.slackMessage.message}</p>
            </div>
          </div>
        </div>
      )}

      {spent > 0 && <p className="text-xs text-gray-400 text-right">Reading time: {spent}s</p>}
    </div>
  );
}

type ChatMsg = { role: 'candidate' | 'ai_buyer'; text: string; ts: number };

function SimulatedCallRenderer({ config, answer, onChange, onTrackEvent }: any) {
  const { sessionToken, stepId } = useParams<{ sessionToken: string; stepId: string }>();
  const [callState, setCallState] = useState<'pre' | 'active' | 'ended'>('pre');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [aiTyping, setAiTyping] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, aiTyping]);

  function buildOpenAiHistory(msgs: ChatMsg[]) {
    return msgs.map(m => ({
      role: m.role === 'candidate' ? 'user' as const : 'assistant' as const,
      content: m.text,
    }));
  }

  function updateAnswer(msgs: ChatMsg[], durationSeconds: number) {
    onChange({
      callSessionId: 'chat-' + (answer?.callSessionId?.split('-')[1] ?? Date.now()),
      transcript: msgs.map(m => ({ speaker: m.role, text: m.text, timestampMs: m.ts })),
      outcome: { selectedOutcome: 'no_next_step', aiBuyerInterestFinal: 50, aiBuyerTrustFinal: 40, aiBuyerUrgencyFinal: 30, nextStepAgreed: false },
      metrics: { durationSeconds },
    });
  }

  async function fetchAiReply(history: ChatMsg[]) {
    setAiTyping(true);
    try {
      const res = await api.post<{ message: string }>(
        `/api/candidate/sessions/${sessionToken}/steps/${stepId}/call-chat`,
        { messages: buildOpenAiHistory(history) }
      );
      const aiMsg: ChatMsg = { role: 'ai_buyer', text: res.message, ts: Date.now() };
      const updated = [...history, aiMsg];
      setMessages(updated);
      updateAnswer(updated, elapsed);
      return aiMsg;
    } catch {
      const fallback: ChatMsg = { role: 'ai_buyer', text: 'Scusa, hai detto qualcosa?', ts: Date.now() };
      const updated = [...history, fallback];
      setMessages(updated);
      updateAnswer(updated, elapsed);
    } finally {
      setAiTyping(false);
    }
  }

  async function startCall() {
    setCallState('active');
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    onTrackEvent('call_started');
    const callId = 'chat-' + Date.now();
    onChange({ callSessionId: callId, transcript: [], outcome: { selectedOutcome: 'no_next_step', aiBuyerInterestFinal: 50, aiBuyerTrustFinal: 40, aiBuyerUrgencyFinal: 30, nextStepAgreed: false }, metrics: { durationSeconds: 0 } });
    // Get AI's opening line
    await fetchAiReply([]);
    inputRef.current?.focus();
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || aiTyping) return;
    setInput('');
    const userMsg: ChatMsg = { role: 'candidate', text, ts: Date.now() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    updateAnswer(updated, elapsed);
    await fetchAiReply(updated);
    inputRef.current?.focus();
  }

  function endCall() {
    if (timerRef.current) clearInterval(timerRef.current);
    setCallState('ended');
    onTrackEvent('call_ended');
    updateAnswer(messages, elapsed);
  }

  const persona = config.aiPersona;
  const initials = persona?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) ?? 'AI';
  const maxDuration = config.maxDurationSeconds ?? 720;

  // Pre-call screen
  if (callState === 'pre') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 text-white text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-indigo-500 flex items-center justify-center text-2xl font-bold mx-auto">
            {initials}
          </div>
          <div>
            <p className="font-semibold text-lg">{persona?.name}</p>
            <p className="text-slate-300 text-sm">{persona?.role}{persona?.company ? ` · ${persona.company}` : ''}</p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Scenario Brief</p>
            <p className="text-sm text-amber-900 leading-relaxed">{config.publicCandidateBrief}</p>
          </div>
          <p className="text-xs text-gray-400 text-center">Questa è una simulazione testuale. Scrivi come parleresti davvero in una chiamata reale.</p>
          <button onClick={startCall} className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 active:scale-[0.98] transition flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
            Inizia la chiamata
          </button>
        </div>
      </div>
    );
  }

  // Post-call screen
  if (callState === 'ended') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-slate-800 px-6 py-4 flex items-center gap-3 text-white">
          <div className="w-9 h-9 rounded-full bg-slate-600 flex items-center justify-center text-sm font-bold">{initials}</div>
          <div className="flex-1">
            <p className="font-semibold text-sm">{persona?.name}</p>
            <p className="text-xs text-slate-400">Chiamata terminata · {Math.floor(elapsed / 60)}m {elapsed % 60}s</p>
          </div>
        </div>
        <div className="p-4 max-h-64 overflow-y-auto space-y-3 bg-slate-50">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'candidate' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${m.role === 'candidate' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'}`}>
                {m.text}
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 bg-green-50 border-t border-green-200">
          <p className="text-sm font-semibold text-green-700 text-center">Chiamata completata — clicca "Avanti →" per procedere</p>
        </div>
      </div>
    );
  }

  // Active call — chat interface
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col" style={{ height: '520px' }}>
      {/* Header */}
      <div className="bg-slate-800 px-4 py-3 flex items-center gap-3 text-white flex-shrink-0">
        <div className="relative">
          <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center text-sm font-bold">{initials}</div>
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-slate-800" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight">{persona?.name}</p>
          <p className="text-xs text-slate-400 truncate">{persona?.role}{persona?.company ? ` · ${persona.company}` : ''}</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-300 bg-slate-700 px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
          {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
        {messages.length === 0 && !aiTyping && (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">Connessione in corso...</div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex items-end gap-2 ${m.role === 'candidate' ? 'flex-row-reverse' : 'flex-row'}`}>
            {m.role === 'ai_buyer' && (
              <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mb-0.5">{initials}</div>
            )}
            <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${m.role === 'candidate' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'}`}>
              {m.text}
            </div>
          </div>
        ))}
        {aiTyping && (
          <div className="flex items-end gap-2">
            <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">{initials}</div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center h-4">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white p-3 space-y-2">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            rows={2}
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Scrivi la tua risposta... (Invio per inviare)"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            disabled={aiTyping}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || aiTyping}
            className="h-[60px] px-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 transition flex items-center justify-center"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
        <button onClick={endCall} className="w-full py-2 rounded-xl text-sm font-semibold border-2 border-red-300 text-red-600 hover:bg-red-50 transition flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>
          Termina chiamata
        </button>
      </div>
    </div>
  );
}

function SpreadsheetEditRenderer({ config, answer, onChange }: any) {
  const { sessionToken, stepId } = useParams<{ sessionToken: string; stepId: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const sheetUrl: string | null = answer?.sheetUrl ?? null;

  async function openSheet() {
    setLoading(true);
    setError('');
    try {
      const data = await api.post<{ sheetId: string; sheetUrl: string }>(
        `/api/candidate/sessions/${sessionToken}/steps/${stepId}/spreadsheet-start`,
        {},
      );
      onChange({ sheetOpened: true, sheetId: data.sheetId, sheetUrl: data.sheetUrl });
      window.open(data.sheetUrl, '_blank', 'noopener,noreferrer');
    } catch {
      setError('Impossibile creare il foglio. Riprova.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Scenario context */}
      {config.scenarioContext && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Scenario</p>
          <p className="text-sm text-gray-700 leading-relaxed">{config.scenarioContext}</p>
        </div>
      )}

      {/* Task prompt */}
      {config.taskPrompt && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-800">{config.taskPrompt}</p>
        </div>
      )}

      {/* Cells reference table */}
      {config.cells?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Celle da compilare</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 w-16">Cella</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Descrizione</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 w-24">Tipo</th>
              </tr>
            </thead>
            <tbody>
              {config.cells.map((cell: any, i: number) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-4 py-2.5 font-mono text-sm text-blue-700 font-semibold">{cell.ref}</td>
                  <td className="px-4 py-2.5 text-gray-700">{cell.label}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      cell.cellType === 'numeric' ? 'bg-blue-50 text-blue-700' :
                      cell.cellType === 'formula' ? 'bg-purple-50 text-purple-700' :
                      'bg-green-50 text-green-700'
                    }`}>{cell.cellType}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sheet action */}
      {!sheetUrl ? (
        <div className="space-y-3">
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">{error}</p>}
          <button
            onClick={openSheet}
            disabled={loading}
            className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Preparazione foglio...</>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/></svg>
                Apri il foglio Google Sheets
              </>
            )}
          </button>
          <p className="text-xs text-gray-400 text-center">Si aprirà una nuova scheda con il tuo foglio personale. Torna qui quando hai finito.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-emerald-800">Foglio aperto</p>
              <a href={sheetUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 hover:underline truncate block">
                Riaprire il foglio →
              </a>
            </div>
          </div>
          <p className="text-sm text-gray-600 text-center">Quando hai compilato tutte le celle, clicca <strong>Avanti</strong> qui sotto per inviare le tue risposte.</p>
        </div>
      )}
    </div>
  );
}

// ─── TTS Slide Presenter ───────────────────────────────────────────────────────
function TtsSlidesRenderer({ config, answer, onChange }: any) {
  const slides: { text: string; html?: string }[] = config.slides ?? [];
  const persona = config.persona ?? { name: config.founderName ?? 'Presenter', title: config.founderRole };
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [audioCache, setAudioCache] = useState<(HTMLAudioElement | null)[]>(Array(slides.length).fill(null));
  const [started, setStarted] = useState(false);
  const startTime = useMemo(() => Date.now(), []);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function fetchAudio(idx: number): Promise<HTMLAudioElement | null> {
    if (audioCache[idx]) return audioCache[idx];
    const slide = slides[idx];
    try {
      const res = await fetch('/api/candidate/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: slide.text, voice: persona.voice ?? 'ash', voiceInstructions: persona.voiceInstructions }),
      });
      if (!res.ok) return null;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      await new Promise<void>(r => { audio.onloadedmetadata = () => r(); audio.onerror = () => r(); });
      setAudioCache(prev => { const next = [...prev]; next[idx] = audio; return next; });
      return audio;
    } catch { return null; }
  }

  async function playSlide(idx: number) {
    setPlaying(true);
    const audio = await fetchAudio(idx);
    audioRef.current = audio;
    if (audio) {
      await new Promise<void>(r => {
        audio.onended = () => r();
        audio.onerror = () => r();
        audio.play().catch(() => r());
      });
    } else {
      await new Promise<void>(r => setTimeout(r, 3500));
    }
    setPlaying(false);

    const spent = Math.round((Date.now() - startTime) / 1000);
    onChange({ acknowledged: true, timeSpentSeconds: spent, slidesCompleted: idx + 1 });

    if (idx + 1 < slides.length) {
      setCurrent(idx + 1);
      fetchAudio(idx + 2).catch(() => {});
      playSlide(idx + 1);
    }
  }

  async function start() {
    setStarted(true);
    // Preload first two slides
    fetchAudio(0);
    fetchAudio(1);
    await new Promise(r => setTimeout(r, 300));
    playSlide(0);
  }

  const slide = slides[current];
  const initials = persona.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() ?? 'P';

  if (!started) {
    return (
      <div className="min-h-[300px] flex flex-col items-center justify-center gap-6 py-10">
        <div className="text-center space-y-2">
          {persona.photoUrl
            ? <img src={persona.photoUrl} alt={persona.name} className="w-20 h-20 rounded-full mx-auto object-cover border-4 border-white shadow-lg" />
            : <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center mx-auto text-white text-2xl font-bold shadow-lg">{initials}</div>
          }
          <p className="font-bold text-gray-900">{persona.name}</p>
          {persona.title && <p className="text-sm text-gray-500">{persona.title}</p>}
        </div>
        <button onClick={start} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition flex items-center gap-2 shadow-md">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polygon points="5 3 19 12 5 21 5 3" fill="currentColor" strokeWidth={0}/></svg>
          Inizia presentazione
        </button>
        <p className="text-xs text-gray-400">{slides.length} slide · con audio</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Persona header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50">
          {persona.photoUrl
            ? <img src={persona.photoUrl} alt={persona.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
            : <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{initials}</div>
          }
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-900">{persona.name}</p>
            {persona.title && <p className="text-xs text-gray-500">{persona.title}</p>}
          </div>
          {/* Audio wave */}
          {playing && (
            <div className="flex items-end gap-0.5 h-5">
              {[3, 5, 8, 5, 3, 7, 4].map((h, i) => (
                <div key={i} className="w-1 rounded-full bg-indigo-500 animate-pulse" style={{ height: `${h * 2}px`, animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
          )}
        </div>

        {/* Slide caption */}
        <div className="px-6 py-8 min-h-[140px] flex items-center">
          <p className="text-lg text-gray-800 leading-relaxed font-medium" dangerouslySetInnerHTML={{ __html: slide?.html ?? slide?.text ?? '' }} />
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-1.5 pb-5">
          {slides.map((_, i) => (
            <div key={i} className={`rounded-full transition-all duration-300 ${i === current ? 'w-5 h-2 bg-indigo-600' : i < current ? 'w-2 h-2 bg-indigo-300' : 'w-2 h-2 bg-gray-200'}`} />
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center">
        <span className="text-xs text-gray-400">{current + 1} / {slides.length}</span>
      </div>
    </div>
  );
}

// ─── Slack Workspace Renderer ──────────────────────────────────────────────────
type SlackMsg = { id: string; memberId: string; memberName: string; memberInitials: string; memberColor: string; text: string; channel: string; time: string; grouped?: boolean };

function SlackWorkspaceRenderer({ config, answer, onChange }: any) {
  const workspace = config.workspace ?? { name: 'Workspace' };
  const channels: { id: string; name: string; topic: string }[] = config.channels ?? [{ id: 'welcome', name: 'welcome', topic: 'Benvenuto nel team' }];
  const members: any[] = config.teamMembers ?? [];
  const welcomeSeq: { memberId: string; text: string; channel: string; delayMs?: number }[] = config.welcomeSequence ?? [];
  const maxReplies: number = config.maxRepliesPerChannel ?? 3;

  const [activeChannel, setActiveChannel] = useState(channels[0]?.id ?? 'welcome');
  const [messages, setMessages] = useState<Record<string, SlackMsg[]>>({});
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState('');
  const [replyCounts, setReplyCounts] = useState<Record<string, number>>({});
  const [seqDone, setSeqDone] = useState(false);
  const [ctaVisible, setCtaVisible] = useState(false);
  const startTime = useMemo(() => Date.now(), []);
  const msgsSentRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  function now() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  function getMember(id: string) {
    return members.find(m => m.id === id) ?? { id, name: id, initials: id.slice(0, 2).toUpperCase(), color: 'linear-gradient(135deg,#6366f1,#7c3aed)', role: '' };
  }

  function addMsg(msg: SlackMsg) {
    setMessages(prev => {
      const ch = prev[msg.channel] ?? [];
      const grouped = ch.length > 0 && ch[ch.length - 1].memberId === msg.memberId;
      return { ...prev, [msg.channel]: [...ch, { ...msg, grouped }] };
    });
    if (msg.channel !== activeChannel) {
      setUnread(prev => ({ ...prev, [msg.channel]: (prev[msg.channel] ?? 0) + 1 }));
    }
    setTimeout(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, 50);
  }

  // Play welcome sequence on mount
  useEffect(() => {
    async function runSeq() {
      for (const msg of welcomeSeq) {
        const m = getMember(msg.memberId);
        const delay = msg.delayMs ?? 1200;
        const typingMs = Math.min(2000, Math.max(700, msg.text.length * 18));
        await new Promise(r => setTimeout(r, delay));
        setTyping(`${m.name.split(' ')[0]} sta scrivendo…`);
        await new Promise(r => setTimeout(r, typingMs));
        setTyping('');
        addMsg({ id: Math.random().toString(36).slice(2), memberId: m.id, memberName: m.name, memberInitials: m.initials ?? m.name.slice(0, 2).toUpperCase(), memberColor: m.color ?? 'linear-gradient(135deg,#6366f1,#7c3aed)', text: msg.text, channel: msg.channel, time: now() });
      }
      setSeqDone(true);
      await new Promise(r => setTimeout(r, 600));
      setCtaVisible(true);
      onChange({ acknowledged: true, timeSpentSeconds: Math.round((Date.now() - startTime) / 1000), messagesSent: 0 });
    }
    runSeq();
  }, []);

  async function sendMessage() {
    if (!input.trim() || !seqDone) return;
    const text = input.trim();
    setInput('');
    msgsSentRef.current++;
    // Add candidate message
    addMsg({ id: Math.random().toString(36).slice(2), memberId: 'candidate', memberName: 'Tu', memberInitials: 'TU', memberColor: 'linear-gradient(135deg,#3b82f6,#2563eb)', text, channel: activeChannel, time: now() });
    onChange({ acknowledged: true, timeSpentSeconds: Math.round((Date.now() - startTime) / 1000), messagesSent: msgsSentRef.current });

    const chReplies = replyCounts[activeChannel] ?? 0;
    if (chReplies >= maxReplies) return;

    // Find a team member to reply
    const chMsgs = messages[activeChannel] ?? [];
    const lastTeamMsg = [...chMsgs].reverse().find(m => m.memberId !== 'candidate');
    const responder = lastTeamMsg ? getMember(lastTeamMsg.memberId) : members[0];
    if (!responder) return;

    setReplyCounts(prev => ({ ...prev, [activeChannel]: (prev[activeChannel] ?? 0) + 1 }));
    const typingMs = Math.min(2200, Math.max(800, text.length * 20));
    setTyping(`${responder.name.split(' ')[0]} sta scrivendo…`);

    try {
      const history = (messages[activeChannel] ?? []).slice(-8).map(m => ({ sender: m.memberId === 'candidate' ? 'candidate' : m.memberId, content: m.text }));
      const res = await fetch('/api/candidate/workspace-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: responder.id, characterConfig: responder, message: text, history }),
      });
      const data = await res.json();
      await new Promise(r => setTimeout(r, typingMs));
      setTyping('');
      const blocks: string[] = (data.reply ?? '').split('\n\n').map((b: string) => b.trim()).filter(Boolean);
      for (const block of blocks) {
        addMsg({ id: Math.random().toString(36).slice(2), memberId: responder.id, memberName: responder.name, memberInitials: responder.initials ?? responder.name.slice(0, 2).toUpperCase(), memberColor: responder.color ?? 'linear-gradient(135deg,#6366f1,#7c3aed)', text: block, channel: activeChannel, time: now() });
        if (blocks.length > 1) await new Promise(r => setTimeout(r, 500));
      }
    } catch {
      await new Promise(r => setTimeout(r, typingMs));
      setTyping('');
      addMsg({ id: Math.random().toString(36).slice(2), memberId: responder.id, memberName: responder.name, memberInitials: responder.initials ?? responder.name.slice(0, 2).toUpperCase(), memberColor: responder.color ?? 'linear-gradient(135deg,#6366f1,#7c3aed)', text: 'Scusa, sono in riunione — ci sentiamo dopo!', channel: activeChannel, time: now() });
    }
  }

  const activeMsgs = messages[activeChannel] ?? [];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex" style={{ height: '520px' }}>
      {/* Sidebar */}
      <aside className="w-52 flex-shrink-0 bg-[#1a1d21] flex flex-col">
        <div className="px-3 py-3 border-b border-white/10">
          <span className="text-white font-bold text-sm">{workspace.name}</span>
          <div className="flex items-center gap-1 mt-0.5"><div className="w-1.5 h-1.5 rounded-full bg-green-400" /><span className="text-[12px] text-gray-400">Online</span></div>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          <p className="text-[11px] font-bold text-gray-400 uppercase px-3 mb-1">Canali</p>
          {channels.map(ch => (
            <button key={ch.id} onClick={() => { setActiveChannel(ch.id); setUnread(p => ({ ...p, [ch.id]: 0 })); }}
              className={`w-full text-left flex items-center gap-1.5 px-3 py-1 text-[14px] transition ${activeChannel === ch.id ? 'bg-[#1164A3] text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
              <span className="opacity-60">#</span>
              <span className="flex-1 truncate">{ch.name}</span>
              {(unread[ch.id] ?? 0) > 0 && <span className="bg-red-500 text-white text-[11px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">{unread[ch.id]}</span>}
            </button>
          ))}
        </div>
        <div className="px-3 py-2 border-t border-white/10 flex items-center gap-2">
          <div className="w-7 h-7 rounded-sm bg-blue-500 flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0">TU</div>
          <span className="text-[13px] text-gray-300 truncate">Tu</span>
          <div className="w-2 h-2 rounded-full bg-green-400 ml-auto flex-shrink-0" />
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-white">
          <span className="text-gray-400 font-semibold">#</span>
          <span className="font-bold text-gray-900 text-sm">{channels.find(c => c.id === activeChannel)?.name ?? activeChannel}</span>
          {channels.find(c => c.id === activeChannel)?.topic && (
            <span className="text-xs text-gray-400 border-l border-gray-200 pl-2 truncate">{channels.find(c => c.id === activeChannel)?.topic}</span>
          )}
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-[12px] text-gray-400">Oggi</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
          {activeMsgs.map(msg => (
            <div key={msg.id} className={`flex gap-2 ${msg.grouped ? 'ml-9' : ''}`}>
              {!msg.grouped && (
                <div className="w-8 h-8 rounded-sm flex-shrink-0 flex items-center justify-center text-white text-[12px] font-bold mt-0.5" style={{ background: msg.memberColor }}>{msg.memberInitials}</div>
              )}
              <div className="flex-1 min-w-0">
                {!msg.grouped && (
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-[14px] font-bold text-gray-900">{msg.memberName}</span>
                    <span className="text-[11px] text-gray-400">{msg.time}</span>
                  </div>
                )}
                <p className="text-[14px] text-gray-800 leading-relaxed">{msg.text}</p>
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex items-center gap-2 text-[13px] text-gray-400 pl-10">
              <div className="flex gap-0.5">
                {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
              </div>
              {typing}
            </div>
          )}
          {ctaVisible && config.ctaLabel && (
            <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3">
              <span className="text-xl">📋</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-800">Prossimo step</p>
                <p className="text-xs text-blue-600">{config.ctaLabel}</p>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-gray-200">
          <div className="flex items-center gap-2 border border-gray-300 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder={`Scrivi un messaggio in #${channels.find(c => c.id === activeChannel)?.name ?? activeChannel}…`}
              disabled={!seqDone}
              className="flex-1 text-[14px] outline-none bg-transparent placeholder:text-gray-400"
            />
            <button onClick={sendMessage} disabled={!input.trim() || !seqDone}
              className="text-blue-500 hover:text-blue-600 disabled:opacity-30 transition">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── CRM Lead Call Screen (voice call via OpenAI Realtime WebRTC) ─────────────
function CrmLeadCallScreen({ sessionToken, stepId, topLeadId, onCallComplete, onBack }: {
  sessionToken: string;
  stepId: string;
  topLeadId: string;
  onCallComplete: (data: { callSessionId: string; transcript: any[]; durationSeconds: number }) => void;
  onBack: () => void;
}) {
  const [phase, setPhase] = useState<'pre' | 'connecting' | 'active' | 'ended'>('pre');
  const [lead, setLead] = useState<any>(null);
  const [callSessionId, setCallSessionId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const [micAllowed, setMicAllowed] = useState<boolean | null>(null);
  const [aiSpeaking, setAiSpeaking] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptRef = useRef<{ speaker: 'candidate' | 'ai_buyer'; text: string; timestampMs: number }[]>([]);
  const [transcript, setTranscript] = useState<{ speaker: 'candidate' | 'ai_buyer'; text: string; timestampMs: number }[]>([]);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  function pushTranscript(entry: { speaker: 'candidate' | 'ai_buyer'; text: string; timestampMs: number }) {
    transcriptRef.current = [...transcriptRef.current, entry];
    setTranscript([...transcriptRef.current]);
  }

  async function startCall() {
    setPhase('connecting');
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMicAllowed(true);

      const data = await api.post<any>(`/api/candidate/sessions/${sessionToken}/steps/${stepId}/crm-call/start`, { topLeadId });
      setLead(data.lead);
      setCallSessionId(data.callSessionId);

      if (data.realtimeToken) {
        const pc = new RTCPeerConnection();
        pcRef.current = pc;

        const audioEl = new Audio();
        audioEl.autoplay = true;
        audioRef.current = audioEl;

        pc.ontrack = (e) => {
          audioEl.srcObject = e.streams[0];
        };

        const dc = pc.createDataChannel('oai-events');
        dcRef.current = dc;

        dc.addEventListener('message', (e) => {
          try {
            const ev = JSON.parse(e.data);
            if (ev.type === 'response.audio_transcript.done' && ev.transcript) {
              pushTranscript({ speaker: 'ai_buyer', text: ev.transcript, timestampMs: Date.now() });
              setAiSpeaking(false);
            }
            if (ev.type === 'response.audio.delta') setAiSpeaking(true);
            if (ev.type === 'response.audio.done') setAiSpeaking(false);
            if (ev.type === 'conversation.item.input_audio_transcription.completed' && ev.transcript) {
              pushTranscript({ speaker: 'candidate', text: ev.transcript, timestampMs: Date.now() });
            }
          } catch {}
        });

        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const sdpRes = await fetch(`https://api.openai.com/v1/realtime?model=${data.model}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${data.realtimeToken}`, 'Content-Type': 'application/sdp' },
          body: offer.sdp,
        });
        const answerSdp = await sdpRes.text();
        await pc.setRemoteDescription({ type: 'answer' as RTCSdpType, sdp: answerSdp });
      }

      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
      setPhase('active');
    } catch (err: any) {
      if (err?.name === 'NotAllowedError') {
        setMicAllowed(false);
        setError('Microfono non autorizzato. Consenti l\'accesso al microfono e riprova.');
      } else {
        setError(err?.message ?? 'Impossibile avviare la chiamata.');
      }
      setPhase('pre');
    }
  }

  async function endCall() {
    if (timerRef.current) clearInterval(timerRef.current);

    streamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    pcRef.current = null;

    if (callSessionId) {
      await api.post(`/api/realtime-call-sessions/${callSessionId}/end-crm`, {
        sessionToken,
        transcript: transcriptRef.current,
        outcome: { nextStepAgreed: false },
        durationSeconds: elapsed,
      }).catch(() => {});
    }

    setPhase('ended');
  }

  function confirmAndSubmit() {
    onCallComplete({
      callSessionId: callSessionId ?? '',
      transcript: transcriptRef.current,
      durationSeconds: elapsed,
    });
  }

  const initials = (lead?.displayName ?? 'LD').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  const timerLabel = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;

  // ── Layout: Lead info panel (left) + call interface (right)
  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        {phase === 'pre' && (
          <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="15 18 9 12 15 6"/></svg>
            Torna
          </button>
        )}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">Chiamata con {lead?.displayName ?? 'il lead #1'}</span>
          {lead?.company && <span className="text-xs text-gray-400">— {lead.company}</span>}
        </div>
        {phase === 'active' && (
          <div className="ml-auto flex items-center gap-2 font-mono text-sm font-semibold text-red-600 bg-red-50 px-3 py-1 rounded-lg">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            {timerLabel}
          </div>
        )}
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left: Lead CRM card */}
        <aside className="w-72 flex-shrink-0 border-r border-gray-200 overflow-y-auto bg-gray-50">
          {lead ? (
            <div className="p-4 space-y-4">
              {/* Avatar + name */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-[15px] font-bold flex-shrink-0"
                  style={{ background: lead.avatarColor ?? 'linear-gradient(135deg,#6366f1,#7c3aed)' }}>
                  {initials}
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-[15px]">{lead.displayName}</p>
                  {lead.contactRole && <p className="text-[12px] text-gray-500">{lead.contactRole}</p>}
                  {lead.company && <p className="text-[13px] font-semibold text-gray-700">{lead.company}</p>}
                </div>
              </div>

              {/* Key facts */}
              <div className="space-y-1.5">
                {lead.sector && (
                  <div className="flex items-center gap-2 text-[12px]">
                    <span className="text-gray-400 w-16 flex-shrink-0">Settore</span>
                    <span className="text-gray-800 font-medium">{lead.sector}</span>
                  </div>
                )}
                {lead.employees && (
                  <div className="flex items-center gap-2 text-[12px]">
                    <span className="text-gray-400 w-16 flex-shrink-0">Team</span>
                    <span className="text-gray-800 font-medium">{lead.employees} persone</span>
                  </div>
                )}
                {lead.revenue && (
                  <div className="flex items-center gap-2 text-[12px]">
                    <span className="text-gray-400 w-16 flex-shrink-0">Fatturato</span>
                    <span className="text-gray-800 font-medium">{lead.revenue}</span>
                  </div>
                )}
                {lead.location && (
                  <div className="flex items-center gap-2 text-[12px]">
                    <span className="text-gray-400 w-16 flex-shrink-0">Sede</span>
                    <span className="text-gray-800 font-medium">{lead.location}</span>
                  </div>
                )}
                {lead.stage && (
                  <div className="flex items-center gap-2 text-[12px]">
                    <span className="text-gray-400 w-16 flex-shrink-0">Stage</span>
                    <span className="text-gray-800 font-medium">{lead.stage}</span>
                  </div>
                )}
                {lead.value && (
                  <div className="flex items-center gap-2 text-[12px]">
                    <span className="text-gray-400 w-16 flex-shrink-0">Valore</span>
                    <span className="text-gray-800 font-medium">€{lead.value.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Contacts */}
              {(lead.contactPhone || lead.contactEmail) && (
                <div className="border-t border-gray-200 pt-3 space-y-1">
                  {lead.contactPhone && (
                    <div className="flex items-center gap-1.5 text-[12px] text-gray-600">
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .84h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                      {lead.contactPhone}
                    </div>
                  )}
                  {lead.contactEmail && (
                    <div className="flex items-center gap-1.5 text-[12px] text-gray-600">
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                      {lead.contactEmail}
                    </div>
                  )}
                </div>
              )}

              {/* Activities */}
              {(lead.activities ?? []).length > 0 && (
                <div className="border-t border-gray-200 pt-3">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">Attività recenti</p>
                  <div className="space-y-2">
                    {(lead.activities ?? []).map((a: any, i: number) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-base flex-shrink-0">{a.icon}</span>
                        <div>
                          <p className="text-[12px] text-gray-700">{a.text}</p>
                          <p className="text-[11px] text-gray-400">{a.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Signal strength */}
              {lead.signalStrength && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Segnale</span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    lead.signalStrength === 'alto' ? 'bg-green-100 text-green-700' :
                    lead.signalStrength === 'medio' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-600'
                  }`}>{lead.signalStrength}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-300 text-sm p-4">
              Caricamento dati lead...
            </div>
          )}
        </aside>

        {/* Right: Call interface */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* PRE-CALL */}
          {phase === 'pre' && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6">
              <div className="text-center space-y-3">
                <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center text-white text-2xl font-bold mx-auto">
                  {initials}
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{lead?.displayName ?? topLeadId}</p>
                  {lead?.contactRole && <p className="text-sm text-gray-500">{lead.contactRole}</p>}
                  {lead?.company && <p className="text-sm text-gray-600 font-medium">{lead.company}</p>}
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 max-w-sm text-center">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Attenzione</p>
                <p className="text-sm text-amber-800">Stai per chiamare il tuo lead #1. Il contatto sarà scettico e resistente — dovrai guadagnarti la sua fiducia.</p>
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 max-w-sm">{error}</p>}
              {micAllowed === false && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 max-w-sm">Consenti l'accesso al microfono nelle impostazioni del browser, poi riprova.</p>
              )}
              <button onClick={startCall} className="flex items-center gap-2 bg-green-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-green-700 active:scale-[0.98] transition shadow-sm">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>
                Chiama {lead?.displayName ?? 'il lead'}
              </button>
            </div>
          )}

          {/* CONNECTING */}
          {phase === 'connecting' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
              <p className="text-sm text-gray-600">Connessione in corso...</p>
            </div>
          )}

          {/* ACTIVE CALL */}
          {phase === 'active' && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Call status bar */}
              <div className="flex items-center gap-3 px-4 py-3 bg-slate-800 text-white flex-shrink-0">
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-slate-600 flex items-center justify-center text-sm font-bold">{initials}</div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-slate-800" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{lead?.displayName}</p>
                  <p className="text-xs text-slate-400">{lead?.company} · In chiamata</p>
                </div>
                {aiSpeaking && (
                  <div className="flex items-end gap-0.5 h-5 mr-2">
                    {[3, 5, 8, 5, 3].map((h, i) => (
                      <div key={i} className="w-1 rounded-full bg-green-400 animate-pulse" style={{ height: `${h * 2}px`, animationDelay: `${i * 0.1}s` }} />
                    ))}
                  </div>
                )}
              </div>

              {/* Transcript */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                {transcript.length === 0 && (
                  <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                    Inizia a parlare — la trascrizione apparirà qui
                  </div>
                )}
                {transcript.map((m, i) => (
                  <div key={i} className={`flex items-end gap-2 ${m.speaker === 'candidate' ? 'flex-row-reverse' : 'flex-row'}`}>
                    {m.speaker === 'ai_buyer' && (
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mb-0.5"
                        style={{ background: lead?.avatarColor ?? 'linear-gradient(135deg,#6366f1,#7c3aed)' }}>
                        {initials}
                      </div>
                    )}
                    <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      m.speaker === 'candidate'
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                    }`}>
                      {m.text}
                    </div>
                  </div>
                ))}
                {aiSpeaking && (
                  <div className="flex items-end gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: lead?.avatarColor ?? 'linear-gradient(135deg,#6366f1,#7c3aed)' }}>
                      {initials}
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                      <div className="flex gap-1 items-center h-4">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={transcriptEndRef} />
              </div>

              {/* Mic indicator + end button */}
              <div className="flex-shrink-0 border-t border-gray-200 bg-white px-4 py-3 flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs text-green-600 font-medium">
                  <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                  Microfono attivo — parla normalmente
                </div>
                <button onClick={endCall} className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border-2 border-red-300 text-red-600 hover:bg-red-50 transition">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>
                  Termina chiamata
                </button>
              </div>
            </div>
          )}

          {/* ENDED */}
          {phase === 'ended' && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="px-4 py-3 bg-slate-700 text-white flex items-center gap-3 flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-slate-500 flex items-center justify-center text-sm font-bold">{initials}</div>
                <div>
                  <p className="font-semibold text-sm">{lead?.displayName}</p>
                  <p className="text-xs text-slate-400">Chiamata terminata · {timerLabel}</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                {transcript.map((m, i) => (
                  <div key={i} className={`flex items-end gap-2 ${m.speaker === 'candidate' ? 'flex-row-reverse' : 'flex-row'}`}>
                    {m.speaker === 'ai_buyer' && (
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mb-0.5"
                        style={{ background: lead?.avatarColor ?? 'linear-gradient(135deg,#6366f1,#7c3aed)' }}>
                        {initials}
                      </div>
                    )}
                    <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      m.speaker === 'candidate' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                    }`}>
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex-shrink-0 border-t border-green-200 bg-green-50 px-4 py-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-green-700">Chiamata completata</p>
                <button onClick={confirmAndSubmit} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
                  Invia risposta
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ─── Rich CRM Renderer (3-column fullscreen) ──────────────────────────────────
function RichCrmRenderer({ config, answer, onChange, onTrackEvent, onSubmit, submitting }: any) {
  const { sessionToken, stepId } = useParams<{ sessionToken: string; stepId: string }>();
  const records: any[] = config.records ?? [];
  // Always allow ranking all leads
  const maxItems: number = records.length;
  const timerSecs: number = config.timeLimitSeconds ?? 900;

  const SECTION_KEYS = ['info', 'signals', 'interactions', 'notes'];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [priorityOrder, setPriorityOrder] = useState<string[]>(answer?.orderedRecordIds ?? []);
  const [explanation, setExplanation] = useState(answer?.explanation ?? '');
  const [notes, setNotes] = useState<Record<string, string>>(answer?.leadNotes ?? {});
  const [timeLeft, setTimeLeft] = useState(timerSecs);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [callPhase, setCallPhase] = useState<'none' | 'calling' | 'done'>('none');

  // Auto-expand only the first section when a new lead is selected
  useEffect(() => {
    if (!selectedId) return;
    setExpandedSections(prev => {
      const firstKey = `${selectedId}-${SECTION_KEYS[0]}`;
      if (prev[firstKey] !== undefined) return prev;
      return { ...prev, [firstKey]: true };
    });
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (timeLeft <= 0) return;
    const t = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft]);

  function emitAnswer(order: string[], expl: string, ns: Record<string, string>, salesCallData?: any) {
    onChange({ orderedRecordIds: order, explanation: expl, leadNotes: ns, ...(salesCallData ? { salesCallData } : {}) });
  }

  function togglePriority(id: string, method: 'button' | 'remove' = 'button') {
    setPriorityOrder(prev => {
      const isIn = prev.includes(id);
      const next = isIn ? prev.filter(x => x !== id) : prev.length < maxItems ? [...prev, id] : prev;
      if (next !== prev) {
        const lead = records.find(r => r.id === id);
        if (isIn) {
          onTrackEvent?.('crm_lead_unranked', { leadId: id, company: lead?.company, fromPosition: prev.indexOf(id) + 1 });
        } else {
          onTrackEvent?.('crm_lead_ranked', { leadId: id, company: lead?.company, position: next.length, method });
        }
      }
      emitAnswer(next, explanation, notes);
      return next;
    });
  }

  function handleDropOnSlot(slotIndex: number) {
    if (!draggingId) return;
    const lead = records.find(r => r.id === draggingId);
    setPriorityOrder(prev => {
      const prevPos = prev.indexOf(draggingId!);
      const without = prev.filter(id => id !== draggingId);
      without.splice(slotIndex, 0, draggingId!);
      const trimmed = without.slice(0, maxItems);
      if (prevPos === -1) {
        onTrackEvent?.('crm_lead_ranked', { leadId: draggingId, company: lead?.company, position: slotIndex + 1, method: 'drag' });
      } else if (prevPos !== slotIndex) {
        onTrackEvent?.('crm_lead_reordered', { leadId: draggingId, company: lead?.company, fromPosition: prevPos + 1, toPosition: slotIndex + 1 });
      }
      emitAnswer(trimmed, explanation, notes);
      return trimmed;
    });
    setDraggingId(null);
    setDragOverSlot(null);
  }

  function toggleSection(key: string) {
    const willExpand = !expandedSections[key];
    setExpandedSections(prev => ({ ...prev, [key]: willExpand }));
    const section = key.split('-').slice(1).join('-');
    onTrackEvent?.(`crm_section_${willExpand ? 'opened' : 'closed'}`, { leadId: selectedId, section });
  }

  const selectedRecord = records.find(r => r.id === selectedId);
  const timerM = Math.floor(timeLeft / 60);
  const timerS = timeLeft % 60;
  const timerDanger = timeLeft <= 120;
  const timerWarning = timeLeft <= 300 && !timerDanger;

  // Sales call phase — full-screen voice call with #1 lead
  if (callPhase === 'calling' && priorityOrder[0]) {
    return (
      <CrmLeadCallScreen
        sessionToken={sessionToken}
        stepId={stepId}
        topLeadId={priorityOrder[0]}
        onCallComplete={(callData) => {
          emitAnswer(priorityOrder, explanation, notes, {
            callSessionId: callData.callSessionId,
            transcript: callData.transcript,
            outcome: { nextStepAgreed: false },
            durationSeconds: callData.durationSeconds,
          });
          setCallPhase('done');
          onSubmit?.();
        }}
        onBack={() => setCallPhase('none')}
      />
    );
  }

  if (showExplanation) {
    const topLead = records.find(r => r.id === priorityOrder[0]);
    return (
      <div className="flex-1 flex flex-col bg-white overflow-hidden min-h-0">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <button onClick={() => setShowExplanation(false)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="15 18 9 12 15 6"/></svg>
            Torna a modificare
          </button>
          <div className={`flex items-center gap-1.5 text-sm font-mono font-semibold px-3 py-1 rounded-lg ${timerDanger ? 'bg-red-100 text-red-600' : timerWarning ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            {timerM}:{String(timerS).padStart(2, '0')}
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
          <div className="w-full max-w-lg">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">La tua lista di priorità</h2>
              <div className="space-y-2 mt-3">
                {priorityOrder.map((id, i) => {
                  const lead = records.find(r => r.id === id);
                  if (!lead) return null;
                  return (
                    <div key={id} className={`flex items-center gap-3 border rounded-lg px-4 py-2.5 ${i === 0 && config.enableSalesCall ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-100'}`}>
                      <span className={`text-sm font-bold w-5 flex-shrink-0 ${i === 0 && config.enableSalesCall ? 'text-green-600' : 'text-blue-500'}`}>#{i + 1}</span>
                      <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[11px] font-bold" style={{ background: lead.avatarColor ?? 'linear-gradient(135deg,#6366f1,#7c3aed)' }}>
                        {lead.displayName?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900">{lead.displayName}</p>
                        <p className="text-xs text-gray-500">{lead.company}{lead.contactRole ? ` · ${lead.contactRole}` : ''}</p>
                      </div>
                      {i === 0 && config.enableSalesCall && (
                        <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded-full flex-shrink-0">Chiamerai</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Spiega il tuo ragionamento <span className="text-gray-400 font-normal">(opzionale)</span>
              </label>
              <textarea
                placeholder="Es. Ho dato priorità a X perché aveva segnali di urgenza più chiari, mentre Y..."
                value={explanation}
                rows={5}
                onChange={e => { setExplanation(e.target.value); emitAnswer(priorityOrder, e.target.value, notes); }}
                className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-300"
              />
            </div>

            {config.enableSalesCall && topLead ? (
              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .84h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                  <div>
                    <p className="text-sm font-semibold text-blue-800">Prossimo step: chiamata con {topLead.displayName}</p>
                    <p className="text-xs text-blue-600 mt-0.5">Hai selezionato <strong>{topLead.company}</strong> come lead #1. Ora dovrai chiamarlo e convincerlo. Sarà scettico.</p>
                  </div>
                </div>
                <button
                  onClick={() => setCallPhase('calling')}
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-40 transition"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>
                  Chiama {topLead.displayName}
                </button>
              </div>
            ) : (
              <button
                onClick={onSubmit}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition"
              >
                {submitting ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Invio in corso...</>
                ) : (
                  <>Invia risposta <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg></>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden min-h-0">
      {/* Topbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="font-semibold text-gray-900">Pipeline</span>
          <span>›</span><span className="text-gray-700">Inbound</span>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 text-sm font-mono font-semibold px-3 py-1 rounded-lg ${timerDanger ? 'bg-red-100 text-red-600' : timerWarning ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            {timerM}:{String(timerS).padStart(2, '0')}
          </div>
          {onSubmit && (
            <button
              onClick={() => {
                setShowExplanation(true);
                onTrackEvent?.('crm_priority_confirmed', {
                  rankedLeads: priorityOrder.map((id, i) => {
                    const l = records.find(r => r.id === id);
                    return { position: i + 1, leadId: id, company: l?.company, displayName: l?.displayName };
                  }),
                  timeLeftSeconds: timeLeft,
                });
              }}
              disabled={priorityOrder.length === 0}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition"
            >
              Conferma priorità <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left: Priority panel */}
        <aside className="w-56 flex-shrink-0 border-r border-gray-200 flex flex-col bg-gray-50 overflow-hidden">
          <div className="px-3 py-3 border-b border-gray-200">
            <p className="text-[12px] font-bold text-gray-600 uppercase tracking-wide">Priorità Inbound</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Trascina i lead qui · {priorityOrder.length}/{maxItems}</p>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5">
            {Array.from({ length: maxItems }).map((_, i) => {
              const lead = records.find(r => r.id === priorityOrder[i]);
              const isOver = dragOverSlot === i;
              return (
                <div
                  key={i}
                  draggable={!!lead}
                  onDragStart={lead ? e => { e.dataTransfer.setData('text/plain', lead.id); setDraggingId(lead.id); } : undefined}
                  onDragEnd={lead ? () => { setDraggingId(null); setDragOverSlot(null); } : undefined}
                  onDragOver={e => { e.preventDefault(); setDragOverSlot(i); }}
                  onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverSlot(null); }}
                  onDrop={e => { e.preventDefault(); handleDropOnSlot(i); }}
                  className={`rounded-lg border px-2 py-1.5 transition-colors ${
                    isOver ? 'border-blue-400 bg-blue-100' :
                    lead ? `border-blue-200 bg-blue-50 ${draggingId === lead.id ? 'opacity-40' : 'cursor-grab active:cursor-grabbing'}` :
                    'border-dashed border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[11px] font-bold flex-shrink-0 ${lead ? 'text-blue-600' : isOver ? 'text-blue-400' : 'text-gray-300'}`}>#{i + 1}</span>
                    {lead ? (
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-gray-800 truncate">{lead.company}</p>
                        <p className="text-[11px] text-gray-500 truncate">{lead.displayName}</p>
                      </div>
                    ) : (
                      <span className={`text-[11px] ${isOver ? 'text-blue-500 font-semibold' : 'text-gray-300'}`}>
                        {isOver ? 'Rilascia qui' : 'Slot libero'}
                      </span>
                    )}
                    {lead && (
                      <button onClick={() => togglePriority(lead.id)} className="text-gray-300 hover:text-red-400 transition flex-shrink-0">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12"/></svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Center: Lead list */}
        <main className="flex-1 flex flex-col min-w-0 border-r border-gray-200 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">Lead Inbound</h2>
            <p className="text-[12px] text-gray-400">{records.length} lead</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {records.map(r => {
              const initials = r.displayName?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() ?? '??';
              const rank = priorityOrder.indexOf(r.id);
              const isSelected = r.id === selectedId;
              const isDragging = draggingId === r.id;
              return (
                <div
                  key={r.id}
                  draggable
                  onDragStart={e => { e.dataTransfer.setData('text/plain', r.id); setDraggingId(r.id); }}
                  onDragEnd={() => { setDraggingId(null); setDragOverSlot(null); }}
                  onClick={() => { setSelectedId(r.id); onTrackEvent?.('crm_lead_viewed', { leadId: r.id, company: r.company, displayName: r.displayName, rank: priorityOrder.indexOf(r.id) + 1 || null }); }}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 border-b border-gray-100 transition cursor-grab active:cursor-grabbing select-none ${
                    isDragging ? 'opacity-40' :
                    isSelected ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[12px] font-bold" style={{ background: r.avatarColor ?? 'linear-gradient(135deg,#6366f1,#7c3aed)' }}>{initials}</div>
                    {rank >= 0 && <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center">{rank + 1}</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-gray-900 truncate">{r.displayName}</p>
                    <p className="text-[12px] text-gray-500 truncate">{r.company}{r.contactRole ? ` · ${r.contactRole}` : ''}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {r.source && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-gray-600 bg-gray-100 border border-gray-200 rounded-full px-2 py-0.5 font-medium">
                          {r.source.icon} {r.source.type}
                        </span>
                      )}
                      {r.location && <span className="text-[11px] text-gray-400">{r.location}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </main>

        {/* Right: Lead detail */}
        <aside className="w-84 flex-shrink-0 flex flex-col overflow-y-auto border-l border-gray-200" style={{ width: '22rem' }}>
          {!selectedRecord ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-300 p-6">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <p className="text-[13px] text-center">Seleziona un lead per i dettagli</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {/* Header */}
              <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[14px] font-bold" style={{ background: selectedRecord.avatarColor ?? 'linear-gradient(135deg,#6366f1,#7c3aed)' }}>
                    {selectedRecord.displayName?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-bold text-gray-900 leading-tight">{selectedRecord.displayName}</p>
                    {selectedRecord.contactRole && <p className="text-[13px] text-gray-500 mt-0.5">{selectedRecord.contactRole}</p>}
                  </div>
                </div>
                <p className="text-[14px] font-semibold text-gray-800 mb-2">{selectedRecord.company}</p>
                {(selectedRecord.source || selectedRecord.sector) && (
                  <div className="mb-2">
                    <span className="inline-flex items-center gap-1 text-[12px] text-gray-600 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5 font-medium">
                      {selectedRecord.source?.icon} {selectedRecord.source?.type}{selectedRecord.sector ? ` · ${selectedRecord.sector}` : ''}
                    </span>
                  </div>
                )}
                {(selectedRecord.contactEmail || selectedRecord.contactPhone || selectedRecord.website) && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {selectedRecord.contactEmail && (
                      <span className="inline-flex items-center gap-1 text-[12px] text-gray-600 bg-white border border-gray-200 rounded-md px-2 py-1 leading-none">
                        <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                        {selectedRecord.contactEmail}
                      </span>
                    )}
                    {selectedRecord.contactPhone && (
                      <span className="inline-flex items-center gap-1 text-[12px] text-gray-600 bg-white border border-gray-200 rounded-md px-2 py-1 leading-none">
                        <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .84h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                        {selectedRecord.contactPhone}
                      </span>
                    )}
                    {selectedRecord.website && (
                      <span className="inline-flex items-center gap-1 text-[12px] text-gray-600 bg-white border border-gray-200 rounded-md px-2 py-1 leading-none">
                        <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                        {selectedRecord.website}
                      </span>
                    )}
                  </div>
                )}
                {priorityOrder.includes(selectedRecord.id) ? (
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-3 py-1.5 rounded-lg bg-blue-500 text-white">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                    #{priorityOrder.indexOf(selectedRecord.id) + 1} in lista priorità
                  </span>
                ) : (
                  <button
                    onClick={() => togglePriority(selectedRecord.id)}
                    disabled={priorityOrder.length >= maxItems}
                    className="flex items-center justify-center gap-1.5 w-full text-[13px] font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    + Aggiungi alla priorità
                  </button>
                )}
              </div>

              {/* Collapsible sections */}
              {[
                { key: 'info', title: 'Informazioni azienda', content: (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    {[['SETTORE', selectedRecord.sector], ['DIPENDENTI', selectedRecord.employees], ['FATTURATO', selectedRecord.revenue], ['SEDE', selectedRecord.location], ['ANNO FONDAZIONE', selectedRecord.founded?.toString()], ['SITO WEB', selectedRecord.website]].map(([l, v]) => v ? (
                      <div key={l as string}>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">{l}</p>
                        <p className="text-[13px] text-gray-800 font-medium">{String(v)}</p>
                      </div>
                    ) : null)}
                    {(selectedRecord.missingInfo ?? []).length > 0 && (
                      <div className="col-span-2 mt-1 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                        <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wide mb-1.5">Informazioni mancanti</p>
                        {(selectedRecord.missingInfo ?? []).map((m: string, i: number) => (
                          <div key={i} className="flex items-start gap-1.5 mb-0.5">
                            <svg className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                            <p className="text-[12px] text-amber-700">{m}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) },
                { key: 'signals', title: 'Segnali & Attività', content: (
                  <div className="space-y-2">
                    {(selectedRecord.activities ?? []).map((a: any, i: number) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-base flex-shrink-0">{a.icon}</span>
                        <div><p className="text-[12px] text-gray-700">{a.text}</p><p className="text-[11px] text-gray-400">{a.date}</p></div>
                      </div>
                    ))}
                    {selectedRecord.formNote && <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 text-[12px] text-blue-700 italic">{selectedRecord.formNote}</div>}
                  </div>
                ) },
                { key: 'interactions', title: 'Interazioni precedenti', content: (
                  (selectedRecord.interactions ?? []).length > 0
                    ? (selectedRecord.interactions ?? []).map((i: any, idx: number) => (
                      <div key={idx} className="flex gap-2"><span className="text-base">📌</span><div><p className="text-[12px] text-gray-700">{i.text}</p><p className="text-[11px] text-gray-400">{i.date}</p></div></div>
                    ))
                    : <p className="text-[12px] text-gray-400">Nessuna interazione registrata</p>
                ) },
                { key: 'notes', title: 'Note', content: (
                  <textarea
                    value={notes[selectedRecord.id] ?? ''}
                    onChange={e => {
                      const n = { ...notes, [selectedRecord.id]: e.target.value };
                      setNotes(n);
                      emitAnswer(priorityOrder, explanation, n);
                    }}
                    onBlur={e => { if (e.target.value) onTrackEvent?.('crm_note_saved', { leadId: selectedRecord.id, company: selectedRecord.company, length: e.target.value.length }); }}
                    placeholder="Aggiungi note su questo lead..."
                    rows={3}
                    className="w-full text-[12px] border border-gray-200 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-300"
                  />
                ) },
              ].map(({ key, title, content }) => (
                <div key={key} className="border-b border-gray-100">
                  <button onClick={() => toggleSection(`${selectedRecord.id}-${key}`)} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition">
                    <span className="text-[13px] font-semibold text-gray-700">{title}</span>
                    <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expandedSections[`${selectedRecord.id}-${key}`] ? '' : '-rotate-90'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="6 9 12 15 18 9"/></svg>
                  </button>
                  {expandedSections[`${selectedRecord.id}-${key}`] && (
                    <div className="px-4 pb-3">{content}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
