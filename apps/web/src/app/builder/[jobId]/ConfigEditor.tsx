'use client';
import { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

function uid() { return Math.random().toString(36).slice(2, 8); }

function ListInput({ label, items, onChange, placeholder }: { label: string; items: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-ink-500 uppercase tracking-wide mb-2">{label}</label>
      <div className="flex flex-col gap-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <input value={item} onChange={e => { const n = [...items]; n[i] = e.target.value; onChange(n); }}
              placeholder={placeholder}
              className="flex-1 border border-ink-200 rounded-lg px-3 py-1.5 text-[13px] text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition" />
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="text-ink-300 hover:text-danger transition-colors p-1"><Trash2 size={13} /></button>
          </div>
        ))}
        <button type="button" onClick={() => onChange([...items, ''])}
          className="flex items-center gap-1.5 text-[12px] text-brand font-semibold hover:underline w-fit">
          <Plus size={12} /> Aggiungi
        </button>
      </div>
    </div>
  );
}

function Field({ label, children, error = false }: { label: string; children: React.ReactNode; error?: boolean }) {
  return (
    <div>
      <label className={`block text-[12px] font-semibold uppercase tracking-wide mb-1.5 ${error ? 'text-red-600' : 'text-ink-500'}`}>{label}{error && ' *'}</label>
      {children}
    </div>
  );
}

function Textarea({ value, onChange, placeholder, rows = 3, error = false }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; error?: boolean }) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      className={`w-full border rounded-lg px-3 py-2 text-[13px] text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 transition resize-y leading-relaxed ${error ? 'border-red-400 focus:ring-red-200 focus:border-red-500 bg-red-50/30' : 'border-ink-200 focus:ring-brand/20 focus:border-brand'}`} />
  );
}

function Inp({ value, onChange, placeholder, type = 'text', error = false }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; error?: boolean }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className={`w-full border rounded-lg px-3 py-1.5 text-[13px] text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 transition ${error ? 'border-red-400 focus:ring-red-200 focus:border-red-500 bg-red-50/30' : 'border-ink-200 focus:ring-brand/20 focus:border-brand'}`} />
  );
}

function Section({ title, children, defaultOpen = true, error = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean; error?: boolean }) {
  const [open, setOpen] = useState(error || defaultOpen);
  useEffect(() => { if (error) setOpen(true); }, [error]);
  return (
    <div className={`border rounded-xl overflow-hidden ${error ? 'border-red-400' : 'border-ink-200'}`}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${error ? 'bg-red-50 hover:bg-red-100' : 'bg-ink-50 hover:bg-ink-100'}`}>
        <span className={`text-[12px] font-bold uppercase tracking-wide flex items-center gap-1.5 ${error ? 'text-red-700' : 'text-ink-700'}`}>
          {error && <span className="text-red-500">⚠</span>}{title}
        </span>
        {open ? <ChevronUp size={14} className={error ? 'text-red-400' : 'text-ink-400'} /> : <ChevronDown size={14} className={error ? 'text-red-400' : 'text-ink-400'} />}
      </button>
      {open && <div className="px-4 py-4 flex flex-col gap-4">{children}</div>}
    </div>
  );
}

// ─── Multiple Choice ───────────────────────────────────────────────────────────
function MultipleChoiceEditor({ config, onChange, errors = new Set<string>() }: { config: any; onChange: (c: any) => void; errors?: Set<string> }) {
  const c = config as { question: string; options: { id: string; label: string; isCorrect: boolean }[]; allowMultiple: boolean };
  const set = (patch: Partial<typeof c>) => onChange({ ...c, ...patch });

  return (
    <div className="flex flex-col gap-4">
      <Section title="Domanda" error={errors.has('question')}>
        <Textarea value={c.question ?? ''} onChange={v => set({ question: v })} placeholder="Scrivi la domanda situazionale..." rows={3} error={errors.has('question') && !c.question?.trim()} />
      </Section>

      <Section title="Opzioni di risposta" error={errors.has('options') || errors.has('options_correct')}>
        <div className="flex flex-col gap-2">
          {(c.options ?? []).map((opt, i) => (
            <div key={opt.id} className="flex items-center gap-2">
              <button type="button"
                onClick={() => set({ options: c.options.map((o, j) => j === i ? { ...o, isCorrect: !o.isCorrect } : c.allowMultiple ? o : { ...o, isCorrect: false }) })}
                className={`w-5 h-5 rounded flex-none border-2 transition-colors flex items-center justify-center ${opt.isCorrect ? 'bg-success border-success text-white' : 'border-ink-300'}`}>
                {opt.isCorrect && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
              </button>
              <input value={opt.label} onChange={e => set({ options: c.options.map((o, j) => j === i ? { ...o, label: e.target.value } : o) })}
                placeholder={`Opzione ${String.fromCharCode(65 + i)}`}
                className="flex-1 border border-ink-200 rounded-lg px-3 py-1.5 text-[13px] text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition" />
              <button type="button" onClick={() => set({ options: c.options.filter((_, j) => j !== i) })}
                className="text-ink-300 hover:text-danger transition-colors p-1"><Trash2 size={13} /></button>
            </div>
          ))}
          <button type="button"
            onClick={() => set({ options: [...(c.options ?? []), { id: uid(), label: '', isCorrect: false }] })}
            className="flex items-center gap-1.5 text-[12px] text-brand font-semibold hover:underline w-fit">
            <Plus size={12} /> Aggiungi opzione
          </button>
        </div>
        <label className="flex items-center gap-2 text-[13px] text-ink-700 cursor-pointer">
          <input type="checkbox" checked={c.allowMultiple ?? false} onChange={e => set({ allowMultiple: e.target.checked })}
            className="rounded border-ink-300 text-brand focus:ring-brand" />
          Permetti risposte multiple
        </label>
      </Section>
    </div>
  );
}

// ─── Free Text ────────────────────────────────────────────────────────────────
function FreeTextEditor({ config, onChange, errors = new Set<string>() }: { config: any; onChange: (c: any) => void; errors?: Set<string> }) {
  const c = config as { prompt: string; expectedSignals: string[]; redFlags: string[]; rubric: { key: string; label: string; maxScore: number; description: string }[] };
  const set = (patch: Partial<typeof c>) => onChange({ ...c, ...patch });

  return (
    <div className="flex flex-col gap-4">
      <Section title="Traccia / Prompt" error={errors.has('prompt')}>
        <Textarea value={c.prompt ?? ''} onChange={v => set({ prompt: v })} placeholder="Descrivi cosa deve fare il candidato..." rows={4} error={errors.has('prompt') && !c.prompt?.trim()} />
      </Section>

      <Section title="Segnali attesi (corretti)" defaultOpen={false}>
        <ListInput label="" items={c.expectedSignals ?? []} onChange={v => set({ expectedSignals: v })} placeholder="es. propone un follow-up concreto" />
      </Section>

      <Section title="Red flag (negativi)" defaultOpen={false}>
        <ListInput label="" items={c.redFlags ?? []} onChange={v => set({ redFlags: v })} placeholder="es. risposta generica senza dati" />
      </Section>

      <Section title="Come l'AI valuterà la risposta" defaultOpen={false}>
        <p className="text-[12px] text-ink-500 -mt-1 mb-2">
          Definisci i criteri con cui l'AI assegnerà il punteggio. Ogni criterio ha un nome, un punteggio massimo e una descrizione di cosa viene valutato. Il candidato non vede questi criteri.
        </p>
        <div className="flex flex-col gap-3">
          {(c.rubric ?? []).map((r, i) => (
            <div key={r.key} className="border border-ink-200 rounded-lg p-3 flex flex-col gap-2">
              <div className="flex gap-2 items-center">
                <input value={r.label} onChange={e => set({ rubric: c.rubric.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })}
                  placeholder="Nome criterio (es. Tono professionale)" className="flex-1 border border-ink-200 rounded-lg px-3 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition" />
                <div className="flex items-center gap-1 shrink-0">
                  <input type="number" value={r.maxScore} onChange={e => set({ rubric: c.rubric.map((x, j) => j === i ? { ...x, maxScore: Number(e.target.value) } : x) })}
                    className="w-16 border border-ink-200 rounded-lg px-3 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition" placeholder="25" />
                  <span className="text-[12px] text-ink-400">pt</span>
                </div>
                <button type="button" onClick={() => set({ rubric: c.rubric.filter((_, j) => j !== i) })} className="text-ink-300 hover:text-danger p-1"><Trash2 size={13} /></button>
              </div>
              <input value={r.description} onChange={e => set({ rubric: c.rubric.map((x, j) => j === i ? { ...x, description: e.target.value } : x) })}
                placeholder="Cosa valuta questo criterio? (es. La risposta riconosce il problema del cliente?)" className="w-full border border-ink-200 rounded-lg px-3 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition" />
            </div>
          ))}
          <button type="button" onClick={() => set({ rubric: [...(c.rubric ?? []), { key: uid(), label: '', maxScore: 25, description: '' }] })}
            className="flex items-center gap-1.5 text-[12px] text-brand font-semibold hover:underline w-fit">
            <Plus size={12} /> Aggiungi criterio
          </button>
        </div>
      </Section>
    </div>
  );
}

// ─── Welcome / TTS Slides ─────────────────────────────────────────────────────
const VOICES = ['ash', 'alloy', 'echo', 'fable', 'nova', 'shimmer', 'onyx'] as const;

function WelcomeEditor({ config, onChange, errors = new Set<string>() }: { config: any; onChange: (c: any) => void; errors?: Set<string> }) {
  const c = config as any;
  const set = (patch: any) => onChange({ ...c, ...patch });
  const hasTts = !!(c.slides?.length || c.persona);
  const [ttsMode, setTtsMode] = useState(hasTts);
  useEffect(() => { setTtsMode(!!(c.slides?.length || c.persona)); }, [!!c.slides?.length, !!c.persona]);

  function setPersona(patch: any) { set({ persona: { ...(c.persona ?? { name: '', voice: 'ash' }), ...patch } }); }

  return (
    <div className="flex flex-col gap-4">
      <Section title="Modalità">
        <div className="flex gap-2">
          <button type="button" onClick={() => { setTtsMode(false); set({ persona: undefined, slides: undefined }); }}
            className={`flex-1 py-2 rounded-xl text-[13px] font-semibold border transition ${!ttsMode ? 'bg-brand text-white border-brand' : 'bg-white text-ink-600 border-ink-200 hover:border-ink-400'}`}>
            Onboarding classico
          </button>
          <button type="button" onClick={() => { setTtsMode(true); if (!c.persona) setPersona({ name: '', title: '', voice: 'ash' }); }}
            className={`flex-1 py-2 rounded-xl text-[13px] font-semibold border transition ${ttsMode ? 'bg-brand text-white border-brand' : 'bg-white text-ink-600 border-ink-200 hover:border-ink-400'}`}>
            Presentazione con audio (TTS)
          </button>
        </div>
      </Section>

      {!ttsMode && (
        <Section title="Messaggio di benvenuto" error={errors.has('founderName') || errors.has('founderMessage')}>
          <Field label="Nome founder/manager" error={errors.has('founderName') && !c.founderName?.trim()}><Inp value={c.founderName ?? ''} onChange={v => set({ founderName: v })} placeholder="Marco Verdi" error={errors.has('founderName') && !c.founderName?.trim()} /></Field>
          <Field label="Ruolo"><Inp value={c.founderRole ?? ''} onChange={v => set({ founderRole: v })} placeholder="CEO & Co-Founder" /></Field>
          <Field label="Messaggio" error={errors.has('founderMessage') && !c.founderMessage?.trim()}>
            <Textarea value={c.founderMessage ?? ''} onChange={v => set({ founderMessage: v })} rows={4} placeholder="Ciao! Sono felice che tu stia esplorando questa opportunità..." error={errors.has('founderMessage') && !c.founderMessage?.trim()} />
          </Field>
        </Section>
      )}

      {ttsMode && (
        <>
          <Section title="Persona (relatore)" error={errors.has('persona')}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nome" error={errors.has('persona') && !c.persona?.name?.trim()}><Inp value={c.persona?.name ?? ''} onChange={v => setPersona({ name: v })} placeholder="Marco Verdi" error={errors.has('persona') && !c.persona?.name?.trim()} /></Field>
              <Field label="Ruolo/Titolo"><Inp value={c.persona?.title ?? ''} onChange={v => setPersona({ title: v })} placeholder="CEO & Co-Founder" /></Field>
              <Field label="Foto (opzionale)">
                <div className="flex items-center gap-2">
                  {c.persona?.photoUrl && (
                    <img src={c.persona.photoUrl} alt="preview" className="w-9 h-9 rounded-full object-cover border border-ink-200 flex-shrink-0" />
                  )}
                  <label className="flex-1 flex items-center gap-2 cursor-pointer border border-ink-200 rounded-lg px-3 py-1.5 text-[13px] text-ink-500 hover:border-ink-400 transition bg-white">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    {c.persona?.photoUrl ? 'Cambia foto' : 'Carica foto'}
                    <input type="file" accept="image/*" className="hidden" onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = ev => setPersona({ photoUrl: ev.target?.result as string });
                      reader.readAsDataURL(file);
                    }} />
                  </label>
                  {c.persona?.photoUrl && (
                    <button type="button" onClick={() => setPersona({ photoUrl: '' })} className="text-ink-300 hover:text-danger p-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  )}
                </div>
              </Field>
              <Field label="Voce TTS">
                <select value={c.persona?.voice ?? 'ash'} onChange={e => setPersona({ voice: e.target.value })}
                  className="w-full border border-ink-200 rounded-lg px-3 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand/20 bg-white transition">
                  {VOICES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Istruzioni voce (stile recitazione)">
              <Textarea value={c.persona?.voiceInstructions ?? ''} onChange={v => setPersona({ voiceInstructions: v })} rows={2} placeholder="es. Parla con entusiasmo, tono diretto e caldo, ritmo moderato. Sei un founder appassionato." />
            </Field>
          </Section>

          <Section title="Slide con audio" error={errors.has('slides')}>
            <p className="text-[12px] text-ink-500 -mt-1 mb-3">
              Ogni slide genera un audio TTS dal testo inserito.
            </p>
            <div className="flex flex-col gap-3">
              {(c.slides ?? []).map((sl: any, i: number) => (
                <div key={i} className="border border-ink-200 rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-ink-400 uppercase tracking-wide">Slide {i + 1}</span>
                    <button type="button" onClick={() => set({ slides: c.slides.filter((_: any, j: number) => j !== i) })} className="text-ink-300 hover:text-danger p-1"><Trash2 size={13} /></button>
                  </div>
                  <Field label="Testo (per TTS e visualizzazione)">
                    <Textarea value={sl.text ?? ''} rows={2} onChange={v => set({ slides: c.slides.map((x: any, j: number) => j === i ? { ...x, text: v } : x) })} placeholder="Ciao! Sono Marco, CEO di Acme. Sono felice di presentarti questa opportunità..." />
                  </Field>
                </div>
              ))}
              <button type="button"
                onClick={() => set({ slides: [...(c.slides ?? []), { text: '' }] })}
                className="flex items-center gap-1.5 text-[12px] text-brand font-semibold hover:underline w-fit">
                <Plus size={12} /> Aggiungi slide
              </button>
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

// ─── CRM Prioritization ───────────────────────────────────────────────────────
function CrmEditor({ config, onChange, errors = new Set<string>() }: { config: any; onChange: (c: any) => void; errors?: Set<string> }) {
  const c = config as any;
  const set = (patch: any) => onChange({ ...c, ...patch });

  function updateRecord(i: number, patch: any) {
    set({ records: c.records.map((x: any, j: number) => j === i ? { ...x, ...patch } : x) });
  }

  return (
    <div className="flex flex-col gap-4">
      <Section title="Impostazioni">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Limite di tempo (secondi)">
            <input type="number" value={c.timeLimitSeconds ?? 900}
              onChange={e => set({ timeLimitSeconds: Number(e.target.value) })}
              className="w-full border border-ink-200 rounded-lg px-3 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition" />
          </Field>
          <Field label="Max lead da prioritizzare">
            <input type="number" value={c.maxRankedItems ?? 5}
              onChange={e => set({ maxRankedItems: Number(e.target.value) })}
              className="w-full border border-ink-200 rounded-lg px-3 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition" />
          </Field>
        </div>
      </Section>

      <Section title="📞 Chiamata di vendita">
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input type="checkbox" checked={!!c.enableSalesCall}
            onChange={e => set({ enableSalesCall: e.target.checked })}
            className="w-4 h-4 rounded border-ink-300 text-brand" />
          <div>
            <p className="text-[13px] font-semibold text-ink-900">Abilita chiamata dopo la prioritizzazione</p>
            <p className="text-[12px] text-ink-500">Dopo aver rankato i lead, il candidato chiamerà vocalmente il #1 in lista usando l'AI real-time. Il buyer sarà fortemente resistente.</p>
          </div>
        </label>
        {c.enableSalesCall && (
          <Field label="Contesto aggiuntivo per la chiamata (opzionale)">
            <Textarea value={c.salesCallContext ?? ''} onChange={v => set({ salesCallContext: v })}
              placeholder="Es. Il candidato vende un CRM SaaS. Il contesto di mercato è..." rows={3} />
          </Field>
        )}
      </Section>

      <Section title="Contesto scenario" error={errors.has('scenarioContext') || errors.has('taskPrompt')}>
        <Textarea value={c.scenarioContext ?? ''} onChange={v => set({ scenarioContext: v })} placeholder="Descrivi la situazione (es. Sei un AE, è lunedì mattina...)" rows={3} error={errors.has('scenarioContext') && !c.scenarioContext?.trim()} />
        <Textarea value={c.taskPrompt ?? ''} onChange={v => set({ taskPrompt: v })} placeholder="Istruzione per il candidato (es. Prioritizza questi account...)" rows={2} error={errors.has('taskPrompt') && !c.taskPrompt?.trim()} />
      </Section>

      <Section title="Record CRM" error={errors.has('records') || errors.has('expectedTopRecordIds')}>
        <div className="flex flex-col gap-4">
          {(c.records ?? []).map((r: any, i: number) => (
            <div key={r.id} className="border border-ink-200 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-ink-400 uppercase tracking-wide">Record {i + 1}</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-[12px] text-ink-600 cursor-pointer">
                    <input type="checkbox"
                      checked={(c.expectedTopRecordIds ?? []).includes(r.id)}
                      onChange={e => {
                        const ids = c.expectedTopRecordIds ?? [];
                        set({ expectedTopRecordIds: e.target.checked ? [...ids, r.id] : ids.filter((x: string) => x !== r.id) });
                      }}
                      className="rounded border-ink-300 text-brand" />
                    Top priority
                  </label>
                  <button type="button" onClick={() => set({ records: c.records.filter((_: any, j: number) => j !== i) })} className="text-ink-300 hover:text-danger p-1"><Trash2 size={13} /></button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Nome contatto"><Inp value={r.displayName ?? ''} onChange={v => updateRecord(i, { displayName: v })} placeholder="Mario Rossi" /></Field>
                <Field label="Azienda"><Inp value={r.company ?? ''} onChange={v => updateRecord(i, { company: v })} placeholder="Acme Srl" /></Field>
                <Field label="Ruolo contatto"><Inp value={r.contactRole ?? ''} onChange={v => updateRecord(i, { contactRole: v })} placeholder="Head of Sales" /></Field>
                <Field label="Email contatto"><Inp value={r.contactEmail ?? ''} onChange={v => updateRecord(i, { contactEmail: v })} placeholder="mario@acme.com" /></Field>
                <Field label="Telefono"><Inp value={r.contactPhone ?? ''} onChange={v => updateRecord(i, { contactPhone: v })} placeholder="+39 02 1234567" /></Field>
                <Field label="Settore"><Inp value={r.sector ?? ''} onChange={v => updateRecord(i, { sector: v })} placeholder="SaaS B2B" /></Field>
                <Field label="Dipendenti"><Inp value={String(r.employees ?? '')} onChange={v => updateRecord(i, { employees: v })} placeholder="50-200" /></Field>
                <Field label="Fatturato"><Inp value={r.revenue ?? ''} onChange={v => updateRecord(i, { revenue: v })} placeholder="€5M ARR" /></Field>
                <Field label="Sede"><Inp value={r.location ?? ''} onChange={v => updateRecord(i, { location: v })} placeholder="Milano, Italia" /></Field>
                <Field label="Sito"><Inp value={r.website ?? ''} onChange={v => updateRecord(i, { website: v })} placeholder="acme.com" /></Field>
                <Field label="Fonte (tipo)"><Inp value={r.source?.type ?? ''} onChange={v => updateRecord(i, { source: { ...(r.source ?? {}), type: v } })} placeholder="Inbound form" /></Field>
                <Field label="Fonte (emoji/icona)"><Inp value={r.source?.icon ?? ''} onChange={v => updateRecord(i, { source: { ...(r.source ?? {}), icon: v } })} placeholder="📋" /></Field>
                <Field label="Segnale">
                  <select value={r.signalStrength ?? ''} onChange={e => updateRecord(i, { signalStrength: e.target.value || undefined })}
                    className="w-full border border-ink-200 rounded-lg px-3 py-1.5 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition">
                    <option value="">—</option>
                    <option value="alto">Alto</option>
                    <option value="medio">Medio</option>
                    <option value="basso">Basso</option>
                  </select>
                </Field>
                <Field label="Colore avatar (CSS gradient)"><Inp value={r.avatarColor ?? ''} onChange={v => updateRecord(i, { avatarColor: v })} placeholder="linear-gradient(135deg,#6366f1,#7c3aed)" /></Field>
              </div>
              <div className="flex flex-col gap-2">
                <Field label="Attività (una per riga: emoji|testo|data)">
                  <Textarea value={(r.activities ?? []).map((a: any) => `${a.icon}|${a.text}|${a.date}`).join('\n')} rows={3}
                    onChange={v => updateRecord(i, { activities: v.split('\n').filter(Boolean).map(line => { const [icon, ...rest] = line.split('|'); const date = rest.pop() ?? ''; const text = rest.join('|'); return { icon: icon.trim(), text: text.trim(), date: date.trim() }; }) })}
                    placeholder={"🔥|Ha visitato la pricing page 3 volte|2 giorni fa\n📞|Demo richiesta via form|Ieri"} />
                </Field>
                <Field label="Nota form (citazione diretta del lead)">
                  <Inp value={r.formNote ?? ''} onChange={v => updateRecord(i, { formNote: v })} placeholder={'"Cerchiamo qualcosa di più strutturato del nostro tool attuale"'} />
                </Field>
                <ListInput label="Informazioni mancanti" items={r.missingInfo ?? []} onChange={vs => updateRecord(i, { missingInfo: vs })} placeholder="es. Budget non definito" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Priority score (0-100) 🔒">
                  <input type="number" min={0} max={100} value={r.hiddenPriorityScore ?? 50}
                    onChange={e => updateRecord(i, { hiddenPriorityScore: Number(e.target.value) })}
                    className="w-full border border-ink-200 rounded-lg px-3 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition" />
                </Field>
                <Field label="Razionale nascosto 🔒"><Inp value={r.hiddenRationale ?? ''} onChange={v => updateRecord(i, { hiddenRationale: v })} placeholder="Perché questo score" /></Field>
              </div>

              {c.enableSalesCall && (
                <div className="border-t border-ink-100 pt-3 flex flex-col gap-2">
                  <p className="text-[11px] font-bold text-ink-400 uppercase tracking-wide">Obiezioni chiamata 🔒 (visibili solo all'AI)</p>
                  {(r.salesCallObjections ?? []).map((obj: any, oi: number) => (
                    <div key={oi} className="border border-ink-200 rounded-lg p-3 flex flex-col gap-2 bg-red-50/30">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-ink-400">Obiezione {oi + 1}</span>
                        <button type="button" onClick={() => updateRecord(i, { salesCallObjections: (r.salesCallObjections ?? []).filter((_: any, k: number) => k !== oi) })}
                          className="text-ink-300 hover:text-danger p-0.5"><Trash2 size={11} /></button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Tipo">
                          <select value={obj.type ?? 'need'}
                            onChange={e => updateRecord(i, { salesCallObjections: (r.salesCallObjections ?? []).map((o: any, k: number) => k === oi ? { ...o, type: e.target.value } : o) })}
                            className="w-full border border-ink-200 rounded-lg px-2 py-1 text-[12px] bg-white focus:outline-none focus:ring-1 focus:ring-brand/20 focus:border-brand transition">
                            {['budget','timing','authority','need','trust','competition','implementation','risk','internal_resistance'].map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </Field>
                        <Field label="Severità">
                          <select value={obj.severity ?? 'medium'}
                            onChange={e => updateRecord(i, { salesCallObjections: (r.salesCallObjections ?? []).map((o: any, k: number) => k === oi ? { ...o, severity: e.target.value } : o) })}
                            className="w-full border border-ink-200 rounded-lg px-2 py-1 text-[12px] bg-white focus:outline-none focus:ring-1 focus:ring-brand/20 focus:border-brand transition">
                            <option value="low">Bassa</option>
                            <option value="medium">Media</option>
                            <option value="high">Alta</option>
                          </select>
                        </Field>
                      </div>
                      <Field label="Descrizione obiezione">
                        <Textarea value={obj.description ?? ''} rows={2}
                          onChange={v => updateRecord(i, { salesCallObjections: (r.salesCallObjections ?? []).map((o: any, k: number) => k === oi ? { ...o, description: v } : o) })}
                          placeholder="Es. Il budget è già stato allocato per il prossimo anno e non c'è flessibilità" />
                      </Field>
                    </div>
                  ))}
                  <button type="button"
                    onClick={() => updateRecord(i, { salesCallObjections: [...(r.salesCallObjections ?? []), { id: uid(), type: 'need', description: '', severity: 'medium' }] })}
                    className="flex items-center gap-1.5 text-[12px] text-red-600 font-semibold hover:underline w-fit">
                    <Plus size={11} /> Aggiungi obiezione
                  </button>
                </div>
              )}
            </div>
          ))}
          <button type="button"
            onClick={() => set({ records: [...(c.records ?? []), { id: uid(), displayName: '', company: '', notes: [], visibleSignals: [], activities: [], hiddenPriorityScore: 50, hiddenRationale: '' }] })}
            className="flex items-center gap-1.5 text-[12px] text-brand font-semibold hover:underline w-fit">
            <Plus size={12} /> Aggiungi record
          </button>
        </div>
      </Section>
    </div>
  );
}

// ─── Notification Reaction ────────────────────────────────────────────────────
const NOTIF_CHANNELS = ['slack', 'email', 'sms', 'system_alert', 'crm_alert'] as const;
const ACTIONS = ['reply', 'ignore', 'escalate', 'schedule_followup', 'create_task', 'ask_clarification'];

function NotificationEditor({ config, onChange, errors = new Set<string>() }: { config: any; onChange: (c: any) => void; errors?: Set<string> }) {
  const c = config as any;
  const set = (patch: any) => onChange({ ...c, ...patch });
  const isSlack = !!c.workspace;
  const [slackMode, setSlackMode] = useState(isSlack);
  useEffect(() => { setSlackMode(!!c.workspace); }, [!!c.workspace]);

  function updateMember(i: number, patch: any) {
    set({ teamMembers: (c.teamMembers ?? []).map((x: any, j: number) => j === i ? { ...x, ...patch } : x) });
  }
  function updateChannel(i: number, patch: any) {
    set({ channels: (c.channels ?? []).map((x: any, j: number) => j === i ? { ...x, ...patch } : x) });
  }
  function updateSeq(i: number, patch: any) {
    set({ welcomeSequence: (c.welcomeSequence ?? []).map((x: any, j: number) => j === i ? { ...x, ...patch } : x) });
  }

  return (
    <div className="flex flex-col gap-4">
      <Section title="Modalità">
        <div className="flex gap-2">
          <button type="button" onClick={() => { setSlackMode(false); set({ workspace: undefined, channels: undefined, teamMembers: undefined, welcomeSequence: undefined }); }}
            className={`flex-1 py-2 rounded-xl text-[13px] font-semibold border transition ${!slackMode ? 'bg-brand text-white border-brand' : 'bg-white text-ink-600 border-ink-200 hover:border-ink-400'}`}>
            Notifiche classiche
          </button>
          <button type="button" onClick={() => { setSlackMode(true); if (!c.workspace) set({ workspace: { name: 'Workspace' }, channels: [{ id: 'welcome', name: 'welcome', topic: '' }], teamMembers: [], welcomeSequence: [] }); }}
            className={`flex-1 py-2 rounded-xl text-[13px] font-semibold border transition ${slackMode ? 'bg-brand text-white border-brand' : 'bg-white text-ink-600 border-ink-200 hover:border-ink-400'}`}>
            Simil-Slack workspace
          </button>
        </div>
      </Section>

      <Section title="Contesto scenario" error={errors.has('scenarioContext') || errors.has('taskPrompt')}>
        <Textarea value={c.scenarioContext ?? ''} onChange={v => set({ scenarioContext: v })} placeholder="Descrivi la situazione (es. Sono le 9:00 di martedì...)" rows={3} error={errors.has('scenarioContext') && !c.scenarioContext?.trim()} />
        <Textarea value={c.taskPrompt ?? ''} onChange={v => set({ taskPrompt: v })} placeholder="Cosa deve fare il candidato" rows={2} error={errors.has('taskPrompt') && !c.taskPrompt?.trim()} />
      </Section>

      {!slackMode && (
        <Section title="Notifiche" error={errors.has('notifications')}>
          <div className="flex flex-col gap-4">
            {(c.notifications ?? []).map((n: any, i: number) => (
              <div key={n.id} className="border border-ink-200 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-ink-400 uppercase tracking-wide">Notifica {i + 1}</span>
                  <button type="button" onClick={() => set({ notifications: c.notifications.filter((_: any, j: number) => j !== i) })} className="text-ink-300 hover:text-danger p-1"><Trash2 size={13} /></button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Mittente"><Inp value={n.senderName ?? ''} onChange={v => set({ notifications: c.notifications.map((x: any, j: number) => j === i ? { ...x, senderName: v } : x) })} placeholder="Mario Rossi" /></Field>
                  <Field label="Ruolo"><Inp value={n.senderRole ?? ''} onChange={v => set({ notifications: c.notifications.map((x: any, j: number) => j === i ? { ...x, senderRole: v } : x) })} placeholder="VP Sales" /></Field>
                  <Field label="Canale">
                    <select value={n.channel ?? 'slack'} onChange={e => set({ notifications: c.notifications.map((x: any, j: number) => j === i ? { ...x, channel: e.target.value } : x) })}
                      className="w-full border border-ink-200 rounded-lg px-3 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white transition">
                      {NOTIF_CHANNELS.map(ch => <option key={ch} value={ch}>{ch}</option>)}
                    </select>
                  </Field>
                  <Field label="Urgenza nascosta 🔒 (0-100)">
                    <input type="number" min={0} max={100} value={n.hiddenUrgency ?? 50}
                      onChange={e => set({ notifications: c.notifications.map((x: any, j: number) => j === i ? { ...x, hiddenUrgency: Number(e.target.value) } : x) })}
                      className="w-full border border-ink-200 rounded-lg px-3 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition" />
                  </Field>
                </div>
                <Field label="Messaggio">
                  <Textarea value={n.message ?? ''} onChange={v => set({ notifications: c.notifications.map((x: any, j: number) => j === i ? { ...x, message: v } : x) })} rows={2} placeholder="Testo della notifica..." />
                </Field>
                <Field label="Azioni attese 🔒">
                  <div className="flex flex-wrap gap-1.5">
                    {ACTIONS.map(a => (
                      <button key={a} type="button"
                        onClick={() => {
                          const acts: string[] = n.expectedActionTypes ?? [];
                          set({ notifications: c.notifications.map((x: any, j: number) => j === i ? { ...x, expectedActionTypes: acts.includes(a) ? acts.filter((act: string) => act !== a) : [...acts, a] } : x) });
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${(n.expectedActionTypes ?? []).includes(a) ? 'bg-brand text-white border-brand' : 'bg-white text-ink-600 border-ink-200 hover:border-ink-400'}`}>
                        {a}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
            ))}
            <button type="button"
              onClick={() => set({ notifications: [...(c.notifications ?? []), { id: uid(), senderName: '', senderRole: '', channel: 'slack', timestampOffsetMinutes: 0, message: '', hiddenUrgency: 50, hiddenImportance: 50, expectedActionTypes: [], hiddenRationale: '' }] })}
              className="flex items-center gap-1.5 text-[12px] text-brand font-semibold hover:underline w-fit">
              <Plus size={12} /> Aggiungi notifica
            </button>
          </div>
        </Section>
      )}

      {slackMode && (
        <>
          <Section title="Workspace" error={errors.has('workspace')}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nome workspace" error={errors.has('workspace') && !c.workspace?.name?.trim()}><Inp value={c.workspace?.name ?? ''} onChange={v => set({ workspace: { ...(c.workspace ?? {}), name: v } })} placeholder="Acme HQ" error={errors.has('workspace') && !c.workspace?.name?.trim()} /></Field>
              <Field label="Max risposte AI per canale">
                <input type="number" min={1} max={10} value={c.maxRepliesPerChannel ?? 3}
                  onChange={e => set({ maxRepliesPerChannel: Number(e.target.value) })}
                  className="w-full border border-ink-200 rounded-lg px-3 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition" />
              </Field>
            </div>
            <Field label="Etichetta CTA (prossimo step)"><Inp value={c.ctaLabel ?? ''} onChange={v => set({ ctaLabel: v })} placeholder="Ora ti aspetta il tuo primo task: prioritizza i lead inbound." /></Field>
          </Section>

          <Section title="Canali">
            <div className="flex flex-col gap-2">
              {(c.channels ?? []).map((ch: any, i: number) => (
                <div key={ch.id} className="flex gap-2 items-end">
                  <Field label={i === 0 ? 'ID' : ''}><Inp value={ch.id ?? ''} onChange={v => updateChannel(i, { id: v })} placeholder="welcome" /></Field>
                  <Field label={i === 0 ? 'Nome' : ''}><Inp value={ch.name ?? ''} onChange={v => updateChannel(i, { name: v })} placeholder="welcome" /></Field>
                  <Field label={i === 0 ? 'Topic' : ''}><Inp value={ch.topic ?? ''} onChange={v => updateChannel(i, { topic: v })} placeholder="Benvenuto nel team!" /></Field>
                  <button type="button" onClick={() => set({ channels: c.channels.filter((_: any, j: number) => j !== i) })} className="text-ink-300 hover:text-danger p-1 pb-2"><Trash2 size={13} /></button>
                </div>
              ))}
              <button type="button" onClick={() => set({ channels: [...(c.channels ?? []), { id: uid(), name: '', topic: '' }] })}
                className="flex items-center gap-1.5 text-[12px] text-brand font-semibold hover:underline w-fit"><Plus size={12} /> Aggiungi canale</button>
            </div>
          </Section>

          <Section title="Membri del team">
            <div className="flex flex-col gap-4">
              {(c.teamMembers ?? []).map((m: any, i: number) => (
                <div key={m.id} className="border border-ink-200 rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-ink-400 uppercase tracking-wide">Membro {i + 1}</span>
                    <button type="button" onClick={() => set({ teamMembers: c.teamMembers.filter((_: any, j: number) => j !== i) })} className="text-ink-300 hover:text-danger p-1"><Trash2 size={13} /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="ID (univoco)"><Inp value={m.id ?? ''} onChange={v => updateMember(i, { id: v })} placeholder="marco" /></Field>
                    <Field label="Nome"><Inp value={m.name ?? ''} onChange={v => updateMember(i, { name: v })} placeholder="Marco Verdi" /></Field>
                    <Field label="Iniziali"><Inp value={m.initials ?? ''} onChange={v => updateMember(i, { initials: v })} placeholder="MV" /></Field>
                    <Field label="Colore (CSS gradient)"><Inp value={m.color ?? ''} onChange={v => updateMember(i, { color: v })} placeholder="linear-gradient(135deg,#10b981,#059669)" /></Field>
                    <Field label="Ruolo"><Inp value={m.role ?? ''} onChange={v => updateMember(i, { role: v })} placeholder="Sales Manager" /></Field>
                  </div>
                  <Field label="Personalità AI 🔒">
                    <Textarea value={m.aiPersonality ?? ''} rows={2} onChange={v => updateMember(i, { aiPersonality: v })} placeholder="es. Diretto, entusiasta, sempre positivo. Parla in italiano informale." />
                  </Field>
                  <Field label="Regole AI 🔒">
                    <ListInput label="" items={m.aiRules ?? []} onChange={vs => updateMember(i, { aiRules: vs })} placeholder="es. Non rivelare informazioni sul competitor X" />
                  </Field>
                </div>
              ))}
              <button type="button" onClick={() => set({ teamMembers: [...(c.teamMembers ?? []), { id: uid(), name: '', initials: '', color: '', role: '', aiPersonality: '', aiRules: [] }] })}
                className="flex items-center gap-1.5 text-[12px] text-brand font-semibold hover:underline w-fit"><Plus size={12} /> Aggiungi membro</button>
            </div>
          </Section>

          <Section title="Sequenza di benvenuto">
            <p className="text-[12px] text-ink-500 -mt-1 mb-2">
              I messaggi vengono inviati automaticamente all'apertura del workspace. Il candidato li legge prima di poter chattare.
            </p>
            <div className="flex flex-col gap-3">
              {(c.welcomeSequence ?? []).map((msg: any, i: number) => (
                <div key={i} className="border border-ink-200 rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-ink-400 uppercase tracking-wide">Messaggio {i + 1}</span>
                    <button type="button" onClick={() => set({ welcomeSequence: c.welcomeSequence.filter((_: any, j: number) => j !== i) })} className="text-ink-300 hover:text-danger p-1"><Trash2 size={13} /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="ID membro">
                      <select value={msg.memberId ?? ''} onChange={e => updateSeq(i, { memberId: e.target.value })}
                        className="w-full border border-ink-200 rounded-lg px-3 py-1.5 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition">
                        <option value="">Seleziona membro...</option>
                        {(c.teamMembers ?? []).map((m: any) => <option key={m.id} value={m.id}>{m.name || m.id}</option>)}
                      </select>
                    </Field>
                    <Field label="Canale">
                      <select value={msg.channel ?? 'welcome'} onChange={e => updateSeq(i, { channel: e.target.value })}
                        className="w-full border border-ink-200 rounded-lg px-3 py-1.5 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition">
                        {(c.channels ?? []).map((ch: any) => <option key={ch.id} value={ch.id}>#{ch.name || ch.id}</option>)}
                      </select>
                    </Field>
                    <Field label="Delay (ms prima del messaggio)">
                      <input type="number" step={100} value={msg.delayMs ?? 1200} onChange={e => updateSeq(i, { delayMs: Number(e.target.value) })}
                        className="w-full border border-ink-200 rounded-lg px-3 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition" />
                    </Field>
                  </div>
                  <Field label="Testo">
                    <Textarea value={msg.text ?? ''} rows={2} onChange={v => updateSeq(i, { text: v })} placeholder="Ciao! Benvenuto nel team. Sono Marco, il tuo Sales Manager..." />
                  </Field>
                </div>
              ))}
              <button type="button"
                onClick={() => set({ welcomeSequence: [...(c.welcomeSequence ?? []), { memberId: '', text: '', channel: c.channels?.[0]?.id ?? 'welcome', delayMs: 1200 }] })}
                className="flex items-center gap-1.5 text-[12px] text-brand font-semibold hover:underline w-fit">
                <Plus size={12} /> Aggiungi messaggio
              </button>
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

// ─── Email Response ───────────────────────────────────────────────────────────
function EmailEditor({ config, onChange, errors = new Set<string>() }: { config: any; onChange: (c: any) => void; errors?: Set<string> }) {
  const c = config as any;
  const set = (patch: any) => onChange({ ...c, ...patch });

  return (
    <div className="flex flex-col gap-4">
      <Section title="Contesto" error={errors.has('scenarioContext') || errors.has('taskPrompt')}>
        <Textarea value={c.scenarioContext ?? ''} onChange={v => set({ scenarioContext: v })} placeholder="Contesto della situazione..." rows={3} error={errors.has('scenarioContext') && !c.scenarioContext?.trim()} />
        <Textarea value={c.taskPrompt ?? ''} onChange={v => set({ taskPrompt: v })} placeholder="es. Rispondi a questa email in modo professionale..." rows={2} error={errors.has('taskPrompt') && !c.taskPrompt?.trim()} />
      </Section>

      <Section title="Thread email" error={errors.has('emailThread')}>
        <div className="flex flex-col gap-4">
          {(c.emailThread ?? []).map((e: any, i: number) => (
            <div key={e.id} className="border border-ink-200 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-ink-400 uppercase tracking-wide">Email {i + 1}</span>
                <button type="button" onClick={() => set({ emailThread: c.emailThread.filter((_: any, j: number) => j !== i) })} className="text-ink-300 hover:text-danger p-1"><Trash2 size={13} /></button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Da"><Inp value={e.from ?? ''} onChange={v => set({ emailThread: c.emailThread.map((x: any, j: number) => j === i ? { ...x, from: v } : x) })} placeholder="cliente@company.com" /></Field>
                <Field label="Oggetto"><Inp value={e.subject ?? ''} onChange={v => set({ emailThread: c.emailThread.map((x: any, j: number) => j === i ? { ...x, subject: v } : x) })} placeholder="Oggetto email" /></Field>
              </div>
              <Field label="Corpo">
                <Textarea value={e.body ?? ''} onChange={v => set({ emailThread: c.emailThread.map((x: any, j: number) => j === i ? { ...x, body: v } : x) })} rows={5} placeholder="Testo dell'email..." />
              </Field>
            </div>
          ))}
          <button type="button"
            onClick={() => set({ emailThread: [...(c.emailThread ?? []), { id: uid(), from: '', to: [], timestamp: new Date().toISOString(), subject: '', body: '' }] })}
            className="flex items-center gap-1.5 text-[12px] text-brand font-semibold hover:underline w-fit">
            <Plus size={12} /> Aggiungi email
          </button>
        </div>
      </Section>

      <Section title="Segnali attesi / Red flag" defaultOpen={false}>
        <ListInput label="Segnali positivi" items={c.expectedSignals ?? []} onChange={v => set({ expectedSignals: v })} placeholder="es. Propone un next step chiaro" />
        <ListInput label="Red flag" items={c.redFlags ?? []} onChange={v => set({ redFlags: v })} placeholder="es. Non si scusa per il disagio" />
      </Section>

      <Section title="Come l'AI valuterà la risposta email" defaultOpen={false}>
        <p className="text-[12px] text-ink-500 -mt-1 mb-2">
          Definisci i criteri con cui l'AI assegnerà il punteggio alla risposta. Il candidato non vede questi criteri — li usa solo l'AI per valutare.
        </p>
        <div className="flex flex-col gap-3">
          {(c.rubric ?? []).map((r: any, i: number) => (
            <div key={r.key} className="border border-ink-200 rounded-lg p-3 flex flex-col gap-2">
              <div className="flex gap-2 items-center">
                <input value={r.label} onChange={e => set({ rubric: c.rubric.map((x: any, j: number) => j === i ? { ...x, label: e.target.value } : x) })}
                  placeholder="Nome criterio (es. Tono professionale)" className="flex-1 border border-ink-200 rounded-lg px-3 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand/20 transition" />
                <div className="flex items-center gap-1 shrink-0">
                  <input type="number" value={r.maxScore} onChange={e => set({ rubric: c.rubric.map((x: any, j: number) => j === i ? { ...x, maxScore: Number(e.target.value) } : x) })}
                    className="w-16 border border-ink-200 rounded-lg px-3 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand/20 transition" placeholder="25" />
                  <span className="text-[12px] text-ink-400">pt</span>
                </div>
                <button type="button" onClick={() => set({ rubric: c.rubric.filter((_: any, j: number) => j !== i) })} className="text-ink-300 hover:text-danger p-1"><Trash2 size={13} /></button>
              </div>
              <input value={r.description ?? ''} onChange={e => set({ rubric: c.rubric.map((x: any, j: number) => j === i ? { ...x, description: e.target.value } : x) })}
                placeholder="Cosa valuta? (es. La risposta riconosce il problema e propone una soluzione?)" className="w-full border border-ink-200 rounded-lg px-3 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand/20 transition" />
            </div>
          ))}
          <button type="button" onClick={() => set({ rubric: [...(c.rubric ?? []), { key: uid(), label: '', maxScore: 25, description: '' }] })}
            className="flex items-center gap-1.5 text-[12px] text-brand font-semibold hover:underline w-fit"><Plus size={12} /> Aggiungi criterio</button>
        </div>
      </Section>
    </div>
  );
}

// ─── Simulated Call ───────────────────────────────────────────────────────────
const OBJECTION_TYPES = ['budget', 'timing', 'authority', 'need', 'trust', 'competition', 'implementation', 'risk', 'internal_resistance'];
const MOODS = ['friendly', 'neutral', 'skeptical', 'busy', 'frustrated'];
const IMPORTANCE = ['low', 'medium', 'high', 'critical'];

function SimulatedCallEditor({ config, onChange, errors = new Set<string>() }: { config: any; onChange: (c: any) => void; errors?: Set<string> }) {
  const c = config as any;
  const set = (patch: any) => onChange({ ...c, ...patch });
  const setPersona = (patch: any) => set({ aiPersona: { ...(c.aiPersona ?? {}), ...patch } });
  const setBuyer = (patch: any) => set({ hiddenBuyerState: { ...(c.hiddenBuyerState ?? {}), ...patch } });

  return (
    <div className="flex flex-col gap-4">
      <Section title="Brief per il candidato (pubblico)" error={errors.has('publicCandidateBrief')}>
        <Textarea value={c.publicCandidateBrief ?? ''} onChange={v => set({ publicCandidateBrief: v })} rows={4} placeholder="Descrivi il contesto che il candidato vedrà prima della chiamata..." error={errors.has('publicCandidateBrief') && !c.publicCandidateBrief?.trim()} />
      </Section>

      <Section title="Collega al lead #1 del CRM">
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input type="checkbox" checked={!!c.crmLink} onChange={e => set({ crmLink: e.target.checked })} className="rounded border-ink-300 text-brand" />
          <span className="text-[13px] text-ink-700">Usa automaticamente il lead #1 rankedato nel CRM come interlocutore della chiamata</span>
        </label>
        {c.crmLink && (
          <p className="text-[12px] text-ink-400 mt-1">Nome, azienda e ruolo del lead verranno sovrascritti a runtime. Configura comunque la persona qui sotto come fallback.</p>
        )}
      </Section>

      <Section title="Persona AI (acquirente/interlocutore)" error={errors.has('aiPersona')}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nome" error={errors.has('aiPersona') && !c.aiPersona?.name?.trim()}><Inp value={c.aiPersona?.name ?? ''} onChange={v => setPersona({ name: v })} placeholder="Alex Martinez" error={errors.has('aiPersona') && !c.aiPersona?.name?.trim()} /></Field>
          <Field label="Ruolo"><Inp value={c.aiPersona?.role ?? ''} onChange={v => setPersona({ role: v })} placeholder="Head of Operations" /></Field>
          <Field label="Azienda (opzionale)"><Inp value={c.aiPersona?.company ?? ''} onChange={v => setPersona({ company: v })} placeholder="Acme Corp" /></Field>
          <Field label="Umore iniziale">
            <select value={c.aiPersona?.baselineMood ?? 'neutral'} onChange={e => setPersona({ baselineMood: e.target.value })}
              className="w-full border border-ink-200 rounded-lg px-3 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand/20 bg-white transition">
              {MOODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Personalità">
          <Textarea value={c.aiPersona?.personality ?? ''} onChange={v => setPersona({ personality: v })} rows={2} placeholder="es. Analitico, va al sodo, non sopporta le vague..." />
        </Field>
        <Field label="Stile comunicativo">
          <Textarea value={c.aiPersona?.communicationStyle ?? ''} onChange={v => setPersona({ communicationStyle: v })} rows={2} placeholder="es. Diretto, conciso, interrompe se annoiato..." />
        </Field>
      </Section>

      <Section title="Stato nascosto acquirente 🔒">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Interesse iniziale', key: 'initialInterestLevel' },
            { label: 'Fiducia iniziale', key: 'initialTrustLevel' },
            { label: 'Urgenza iniziale', key: 'initialUrgencyLevel' },
          ].map(({ label, key }) => (
            <Field key={key} label={`${label} (0-100)`}>
              <div className="flex items-center gap-2">
                <input type="range" min={0} max={100} value={c.hiddenBuyerState?.[key] ?? 50}
                  onChange={e => setBuyer({ [key]: Number(e.target.value) })}
                  className="flex-1 accent-brand" />
                <span className="text-[13px] font-semibold text-ink-700 w-8 text-right">{c.hiddenBuyerState?.[key] ?? 50}</span>
              </div>
            </Field>
          ))}
        </div>
      </Section>

      <Section title="Obiezioni nascoste 🔒" defaultOpen={false}>
        <div className="flex flex-col gap-3">
          {(c.hiddenBuyerState?.hiddenObjections ?? []).map((obj: any, i: number) => (
            <div key={obj.id} className="border border-ink-200 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <select value={obj.type ?? 'budget'} onChange={e => setBuyer({ hiddenObjections: c.hiddenBuyerState.hiddenObjections.map((x: any, j: number) => j === i ? { ...x, type: e.target.value } : x) })}
                  className="border border-ink-200 rounded-lg px-2 py-1 text-[12px] focus:outline-none focus:ring-2 focus:ring-brand/20 bg-white">
                  {OBJECTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <button type="button" onClick={() => setBuyer({ hiddenObjections: c.hiddenBuyerState.hiddenObjections.filter((_: any, j: number) => j !== i) })} className="text-ink-300 hover:text-danger p-1"><Trash2 size={13} /></button>
              </div>
              <Inp value={obj.description ?? ''} onChange={v => setBuyer({ hiddenObjections: c.hiddenBuyerState.hiddenObjections.map((x: any, j: number) => j === i ? { ...x, description: v } : x) })} placeholder="Descrizione dell'obiezione" />
              <Inp value={obj.revealCondition ?? ''} onChange={v => setBuyer({ hiddenObjections: c.hiddenBuyerState.hiddenObjections.map((x: any, j: number) => j === i ? { ...x, revealCondition: v } : x) })} placeholder="Condizione per rivelare (es. se candidato chiede del budget)" />
            </div>
          ))}
          <button type="button"
            onClick={() => setBuyer({ hiddenObjections: [...(c.hiddenBuyerState?.hiddenObjections ?? []), { id: uid(), type: 'budget', description: '', revealCondition: '', resolutionCondition: '', severity: 'medium' }] })}
            className="flex items-center gap-1.5 text-[12px] text-brand font-semibold hover:underline w-fit"><Plus size={12} /> Aggiungi obiezione</button>
        </div>
      </Section>

      <Section title="Criteri d'acquisto 🔒" defaultOpen={false}>
        <div className="flex flex-col gap-2">
          {(c.hiddenBuyerState?.buyingCriteria ?? []).map((cr: any, i: number) => (
            <div key={cr.id} className="flex gap-2">
              <input value={cr.criterion ?? ''} onChange={e => setBuyer({ buyingCriteria: c.hiddenBuyerState.buyingCriteria.map((x: any, j: number) => j === i ? { ...x, criterion: e.target.value } : x) })}
                placeholder="Criterio d'acquisto" className="flex-1 border border-ink-200 rounded-lg px-3 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand/20 transition" />
              <select value={cr.importance ?? 'medium'} onChange={e => setBuyer({ buyingCriteria: c.hiddenBuyerState.buyingCriteria.map((x: any, j: number) => j === i ? { ...x, importance: e.target.value } : x) })}
                className="border border-ink-200 rounded-lg px-2 py-1.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-brand/20 bg-white">
                {IMPORTANCE.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              <button type="button" onClick={() => setBuyer({ buyingCriteria: c.hiddenBuyerState.buyingCriteria.filter((_: any, j: number) => j !== i) })} className="text-ink-300 hover:text-danger p-1"><Trash2 size={13} /></button>
            </div>
          ))}
          <button type="button"
            onClick={() => setBuyer({ buyingCriteria: [...(c.hiddenBuyerState?.buyingCriteria ?? []), { id: uid(), criterion: '', importance: 'medium' }] })}
            className="flex items-center gap-1.5 text-[12px] text-brand font-semibold hover:underline w-fit"><Plus size={12} /> Aggiungi criterio</button>
        </div>
      </Section>
    </div>
  );
}

// ─── Spreadsheet Edit ─────────────────────────────────────────────────────────
const CELL_TYPES = ['numeric', 'formula', 'text', 'comment'] as const;

function SpreadsheetEditEditor({ config, onChange, errors = new Set<string>() }: { config: any; onChange: (c: any) => void; errors?: Set<string> }) {
  const c = config as any;
  const set = (patch: any) => onChange({ ...c, ...patch });

  return (
    <div className="flex flex-col gap-4">
      <Section title="Template Google Sheet" error={errors.has('templateSheetUrl')}>
        <Field label="URL o ID del template" error={errors.has('templateSheetUrl') && (!c.templateSheetUrl?.trim() || c.templateSheetUrl === 'PLACEHOLDER_TEMPLATE_ID')}>
          <Inp value={c.templateSheetUrl ?? ''} onChange={v => set({ templateSheetUrl: v })} placeholder="https://docs.google.com/spreadsheets/d/..." error={errors.has('templateSheetUrl') && (!c.templateSheetUrl?.trim() || c.templateSheetUrl === 'PLACEHOLDER_TEMPLATE_ID')} />
        </Field>
        <p className="text-[11px] text-ink-400 -mt-1">
          Il service account deve avere accesso al file. I candidati riceveranno una copia modificabile.
        </p>
      </Section>

      <Section title="Contesto e istruzioni" error={errors.has('scenarioContext') || errors.has('taskPrompt')}>
        <Field label="Contesto scenario" error={errors.has('scenarioContext') && !c.scenarioContext?.trim()}>
          <Textarea value={c.scenarioContext ?? ''} onChange={v => set({ scenarioContext: v })} placeholder="Descrivi la situazione (es. Sei un AE, il manager ti ha inviato i dati di pipeline...)" rows={3} error={errors.has('scenarioContext') && !c.scenarioContext?.trim()} />
        </Field>
        <Field label="Istruzione per il candidato" error={errors.has('taskPrompt') && !c.taskPrompt?.trim()}>
          <Textarea value={c.taskPrompt ?? ''} onChange={v => set({ taskPrompt: v })} placeholder="Cosa deve fare il candidato nel foglio?" rows={2} error={errors.has('taskPrompt') && !c.taskPrompt?.trim()} />
        </Field>
      </Section>

      <Section title="Celle da compilare" error={errors.has('cells')}>
        <p className="text-[11px] text-ink-500 -mt-1 mb-2">
          Definisci le celle che il candidato deve compilare. I valori attesi (🔒) non sono visibili al candidato.
        </p>
        <div className="flex flex-col gap-3">
          {(c.cells ?? []).map((cell: any, i: number) => (
            <div key={i} className="border border-ink-200 rounded-xl p-3 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <input value={cell.ref ?? ''} onChange={e => set({ cells: c.cells.map((x: any, j: number) => j === i ? { ...x, ref: e.target.value } : x) })}
                  placeholder="A1" className="w-16 border border-ink-200 rounded-lg px-2 py-1.5 text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition" />
                <input value={cell.label ?? ''} onChange={e => set({ cells: c.cells.map((x: any, j: number) => j === i ? { ...x, label: e.target.value } : x) })}
                  placeholder="Nome cella (es. Totale pipeline)" className="flex-1 border border-ink-200 rounded-lg px-3 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition" />
                <select value={cell.cellType ?? 'numeric'} onChange={e => set({ cells: c.cells.map((x: any, j: number) => j === i ? { ...x, cellType: e.target.value } : x) })}
                  className="border border-ink-200 rounded-lg px-2 py-1.5 text-[12px] bg-white focus:outline-none focus:ring-2 focus:ring-brand/20">
                  {CELL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <button type="button" onClick={() => set({ cells: c.cells.filter((_: any, j: number) => j !== i) })} className="text-ink-300 hover:text-danger p-1"><Trash2 size={13} /></button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(cell.cellType === 'numeric' || cell.cellType === 'formula') && (
                  <Field label={`Valore atteso 🔒`}>
                    <Inp value={cell.expectedValue ?? ''} onChange={v => set({ cells: c.cells.map((x: any, j: number) => j === i ? { ...x, expectedValue: v } : x) })} placeholder={cell.cellType === 'numeric' ? '123456' : '=SOMMA(B2:B4)'} />
                  </Field>
                )}
                {cell.cellType === 'numeric' && (
                  <Field label="Tolleranza % 🔒">
                    <input type="number" min={0} max={50} value={cell.numericTolerance ?? 2}
                      onChange={e => set({ cells: c.cells.map((x: any, j: number) => j === i ? { ...x, numericTolerance: Number(e.target.value) } : x) })}
                      className="w-full border border-ink-200 rounded-lg px-3 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition" />
                  </Field>
                )}
                <Field label="Peso">
                  <input type="number" min={1} max={10} value={cell.weight ?? 1}
                    onChange={e => set({ cells: c.cells.map((x: any, j: number) => j === i ? { ...x, weight: Number(e.target.value) } : x) })}
                    className="w-full border border-ink-200 rounded-lg px-3 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition" />
                </Field>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => set({ cells: [...(c.cells ?? []), { ref: '', label: '', cellType: 'numeric', expectedValue: '', numericTolerance: 2, weight: 1 }] })}
            className="flex items-center gap-1.5 text-[12px] text-brand font-semibold hover:underline w-fit">
            <Plus size={12} /> Aggiungi cella
          </button>
        </div>
      </Section>

      {(c.cells ?? []).some((cell: any) => cell.cellType === 'text' || cell.cellType === 'comment') && (
        <Section title="Rubrica AI per celle testuali" defaultOpen={false}>
          <p className="text-[12px] text-ink-500 -mt-1 mb-2">
            Definisci come l'AI valuterà le celle di tipo testo/commento. Se vuoto, l'AI usa una rubrica automatica.
          </p>
          <div className="flex flex-col gap-3">
            {(c.textRubric ?? []).map((r: any, i: number) => (
              <div key={r.key ?? i} className="border border-ink-200 rounded-lg p-3 flex flex-col gap-2">
                <div className="flex gap-2 items-center">
                  <input value={r.label ?? ''} onChange={e => set({ textRubric: c.textRubric.map((x: any, j: number) => j === i ? { ...x, label: e.target.value } : x) })}
                    placeholder="Nome criterio" className="flex-1 border border-ink-200 rounded-lg px-3 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition" />
                  <div className="flex items-center gap-1 shrink-0">
                    <input type="number" value={r.maxScore ?? 25} onChange={e => set({ textRubric: c.textRubric.map((x: any, j: number) => j === i ? { ...x, maxScore: Number(e.target.value) } : x) })}
                      className="w-16 border border-ink-200 rounded-lg px-3 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand/20 transition" placeholder="25" />
                    <span className="text-[12px] text-ink-400">pt</span>
                  </div>
                  <button type="button" onClick={() => set({ textRubric: c.textRubric.filter((_: any, j: number) => j !== i) })} className="text-ink-300 hover:text-danger p-1"><Trash2 size={13} /></button>
                </div>
                <input value={r.description ?? ''} onChange={e => set({ textRubric: c.textRubric.map((x: any, j: number) => j === i ? { ...x, description: e.target.value } : x) })}
                  placeholder="Cosa valuta questo criterio?" className="w-full border border-ink-200 rounded-lg px-3 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand/20 transition" />
              </div>
            ))}
            <button type="button" onClick={() => set({ textRubric: [...(c.textRubric ?? []), { key: uid(), label: '', maxScore: 25, description: '' }] })}
              className="flex items-center gap-1.5 text-[12px] text-brand font-semibold hover:underline w-fit">
              <Plus size={12} /> Aggiungi criterio AI
            </button>
          </div>
        </Section>
      )}

      <Section title="Segnali e red flag (AI)" defaultOpen={false}>
        <ListInput label="Segnali positivi attesi" items={c.expectedSignals ?? []} onChange={v => set({ expectedSignals: v })} placeholder="es. cita i dati specifici del foglio" />
        <ListInput label="Red flag" items={c.redFlags ?? []} onChange={v => set({ redFlags: v })} placeholder="es. analisi generica senza numeri" />
      </Section>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function ConfigEditor({ type, config, onChange, errors = [] }: { type: string; config: any; onChange: (c: any) => void; errors?: string[] }) {
  const errSet = new Set(errors);
  switch (type) {
    case 'multiple_choice':       return <MultipleChoiceEditor config={config} onChange={onChange} errors={errSet} />;
    case 'free_text':             return <FreeTextEditor config={config} onChange={onChange} errors={errSet} />;
    case 'welcome':               return <WelcomeEditor config={config} onChange={onChange} errors={errSet} />;
    case 'crm_prioritization':    return <CrmEditor config={config} onChange={onChange} errors={errSet} />;
    case 'notification_reaction': return <NotificationEditor config={config} onChange={onChange} errors={errSet} />;
    case 'email_response':        return <EmailEditor config={config} onChange={onChange} errors={errSet} />;
    case 'simulated_call':        return <SimulatedCallEditor config={config} onChange={onChange} errors={errSet} />;
    case 'spreadsheet_edit':      return <SpreadsheetEditEditor config={config} onChange={onChange} errors={errSet} />;
    default:                      return <p className="text-[13px] text-ink-400">Nessun editor disponibile per questo tipo di step.</p>;
  }
}
