'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Check, ArrowLeft, ArrowRight, Rocket, Clock, Plus } from 'lucide-react';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import { Button, Badge, Card, Alert } from '@/components/ui';

const SIM_URL = process.env.NEXT_PUBLIC_SIM_URL ?? 'http://localhost:3001';

const STEPS = [
  { id: 0, label: 'Dettagli offerta' },
  { id: 1, label: 'Costruisci simulazione' },
  { id: 2, label: 'Anteprima e pubblica' },
];

const TASK_TEMPLATES = [
  { id: 't1', type: 'Brief',      title: 'Leggi il brief del progetto',         est: '5 min' },
  { id: 't2', type: 'Analisi',    title: 'Individua i problemi principali',      est: '15 min' },
  { id: 't3', type: 'Proposta',   title: 'Proponi una soluzione',                est: '25 min' },
  { id: 't4', type: 'Riflessione', title: 'Come misureresti il successo?',       est: '10 min' },
  { id: 't5', type: 'Pratica',    title: 'Esercizio tecnico su un caso reale',   est: '30 min' },
];

type Task = typeof TASK_TEMPLATES[number];

type FormData = {
  role: string;
  mode: string;
  city: string;
  type: string;
  ral: string;
  desc: string;
  tasks: Task[];
};

const INITIAL: FormData = {
  role: '', mode: 'Ibrido', city: '', type: 'Full-time', ral: '',
  desc: '',
  tasks: [TASK_TEMPLATES[0], TASK_TEMPLATES[1], TASK_TEMPLATES[2]],
};

function field(label: string, children: React.ReactNode) {
  return (
    <div>
      <label className="block text-[14px] font-semibold text-ink-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full border border-ink-200 rounded-lg px-3.5 py-2.5 text-[14px] text-ink-900 placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-brand transition bg-white';
const selectCls = inputCls;

function StepDetails({ data, set }: { data: FormData; set: (k: keyof FormData, v: string) => void }) {
  return (
    <div className="flex flex-col gap-4 max-w-[620px]">
      {field('Titolo della posizione *', (
        <input className={inputCls} value={data.role} onChange={e => set('role', e.target.value)} placeholder="es. Product Designer" />
      ))}
      <div className="grid grid-cols-2 gap-4">
        {field('Modalità', (
          <select className={selectCls} value={data.mode} onChange={e => set('mode', e.target.value)}>
            {['Remoto', 'Ibrido', 'In sede'].map(o => <option key={o}>{o}</option>)}
          </select>
        ))}
        {field('Sede', (
          <input className={inputCls} value={data.city} onChange={e => set('city', e.target.value)} placeholder="es. Milano" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {field('Tipo di contratto', (
          <select className={selectCls} value={data.type} onChange={e => set('type', e.target.value)}>
            {['Full-time', 'Part-time', 'Stage', 'Freelance'].map(o => <option key={o}>{o}</option>)}
          </select>
        ))}
        {field('RAL (k€)', (
          <input className={inputCls} value={data.ral} onChange={e => set('ral', e.target.value)} placeholder="es. 38–48" />
        ))}
      </div>
      {field('Descrizione del ruolo', (
        <textarea
          className={`${inputCls} resize-none`}
          rows={5}
          value={data.desc}
          onChange={e => set('desc', e.target.value)}
          placeholder="Racconta le responsabilità e cosa rende speciale lavorare con voi…"
        />
      ))}
    </div>
  );
}

function StepSimulation({ data, set }: { data: FormData; set: (k: 'tasks', v: Task[]) => void }) {
  function toggle(t: Task) {
    const has = data.tasks.find(x => x.id === t.id);
    set('tasks', has ? data.tasks.filter(x => x.id !== t.id) : [...data.tasks, t]);
  }
  return (
    <div className="max-w-[720px]">
      <Alert tone="info" title="Le simulazioni triplicano la qualità delle candidature">
        Aggiungi le task reali che la persona affronterà nel ruolo. Consigliamo 3–5 task per un totale di ~60 minuti.
      </Alert>
      <div className="flex items-center justify-between mt-6 mb-3">
        <h3 className="text-[18px]">Task della simulazione</h3>
        <span className="text-[13px] text-ink-500 font-mono">{data.tasks.length} selezionate</span>
      </div>
      <div className="flex flex-col gap-2.5">
        {TASK_TEMPLATES.map(t => {
          const on = !!data.tasks.find(x => x.id === t.id);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => toggle(t)}
              className={`flex items-center gap-3.5 px-4 py-3.5 rounded-lg border-[1.5px] text-left transition-colors ${
                on ? 'bg-brand-subtle border-blue-200' : 'bg-white border-ink-200 hover:border-ink-300'
              }`}
            >
              <div className={`w-5 h-5 rounded flex-none flex items-center justify-center transition-colors ${on ? 'bg-brand' : 'border-[1.5px] border-ink-300'}`}>
                {on && <Check size={13} className="text-white" strokeWidth={3} />}
              </div>
              <Badge tone="neutral">{t.type}</Badge>
              <span className="flex-1 text-[15px] font-medium text-ink-950">{t.title}</span>
              <span className="text-[13px] text-ink-400 flex items-center gap-1.5 flex-none">
                <Clock size={13} /> {t.est}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <Button variant="secondary" iconLeft={<Plus size={15} />} size="sm">Crea task personalizzata</Button>
        <Button
          variant="ghost"
          size="sm"
          iconLeft={<Play size={14} />}
          onClick={() => window.open(`${SIM_URL}?preview=true`, '_blank')}
        >
          Prova anteprima
        </Button>
      </div>
    </div>
  );
}

function StepReview({ data }: { data: FormData }) {
  return (
    <div className="grid gap-7" style={{ gridTemplateColumns: '1fr 380px', alignItems: 'start' }}>
      <div className="flex flex-col gap-4">
        <Alert tone="success" title="Tutto pronto">
          L'offerta è completa. Controlla l'anteprima lato candidato prima di pubblicare.
        </Alert>
        <Card padding="lg">
          <h3 className="text-[16px] mb-3">Riepilogo</h3>
          {[
            ['Ruolo', data.role || '—'],
            ['Sede', `${data.city || '—'} · ${data.mode}`],
            ['Contratto', data.type],
            ['RAL', data.ral ? `${data.ral} k€` : '—'],
            ['Task simulazione', `${data.tasks.length}`],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-2.5 border-b border-ink-100 last:border-0">
              <span className="text-[14px] text-ink-500">{k}</span>
              <span className="text-[14px] font-semibold text-ink-950">{v}</span>
            </div>
          ))}
        </Card>
        <Card padding="md">
          <div className="flex flex-col gap-3">
            {[
              "Pubblica l'offerta nella ricerca pubblica",
              'Invia notifica ai candidati corrispondenti',
            ].map(label => (
              <label key={label} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="accent-brand w-4 h-4" />
                <span className="text-[14px] text-ink-700">{label}</span>
              </label>
            ))}
          </div>
        </Card>
      </div>

      {/* Candidate preview */}
      <div className="sticky top-[88px]">
        <div className="text-[12px] font-bold tracking-[.06em] uppercase text-ink-400 mb-2.5">
          Anteprima candidato
        </div>
        <Card padding="md" style={{ border: '1.5px solid #B8C9FF' }}>
          <div className="flex items-center gap-2 mb-1.5">
            <Zap size={15} className="text-brand" />
            <span className="text-[12px] font-bold tracking-[.04em] uppercase text-blue-700">
              Simulazione richiesta
            </span>
          </div>
          <h3 className="text-[19px] mb-1">{data.role || 'Titolo posizione'}</h3>
          <p className="text-[13px] text-ink-500 mb-3">
            La tua azienda · {data.city || 'Sede'} · {data.mode}
          </p>
          <div className="flex flex-col gap-2 mb-4">
            {data.tasks.length > 0 ? data.tasks.map((t, i) => (
              <div key={t.id} className="flex items-center gap-2.5 text-[14px] text-ink-700">
                <span className="w-5 h-5 rounded-full bg-ink-100 text-ink-500 text-[12px] font-bold flex items-center justify-center flex-none">
                  {i + 1}
                </span>
                {t.title}
              </div>
            )) : (
              <span className="text-[13px] text-ink-400">Nessuna task selezionata</span>
            )}
          </div>
          <Button
            block
            iconLeft={<Play size={15} />}
            onClick={() => window.open(`${SIM_URL}?preview=true`, '_blank')}
          >
            Prova la simulazione
          </Button>
        </Card>
      </div>
    </div>
  );
}

function Zap({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function Play({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

export default function NuovaOffertaPage() {
  const [step, setStep] = useState(0);
  const [published, setPublished] = useState(false);
  const [data, setData] = useState<FormData>(INITIAL);

  const setField = (k: keyof FormData, v: string | Task[]) =>
    setData(d => ({ ...d, [k]: v }));

  if (published) {
    return (
      <div className="min-h-screen flex flex-col bg-ink-50">
        <TopNav />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
          <div className="w-18 h-18 rounded-full bg-success-subtle flex items-center justify-center mb-5" style={{ width: 72, height: 72 }}>
            <Rocket size={32} className="text-success" />
          </div>
          <h1 className="text-[30px] mb-2">Offerta pubblicata</h1>
          <p className="text-[16px] text-ink-600 leading-relaxed max-w-[500px] mb-7">
            <strong>{data.role}</strong> è ora online con una simulazione di {data.tasks.length} task.
            Riceverai una notifica a ogni candidatura completata.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/">
              <Button>Vai alla bacheca</Button>
            </Link>
            <Button variant="secondary" onClick={() => { setPublished(false); setStep(0); setData(INITIAL); }}>
              Crea un'altra offerta
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-ink-50">
      <TopNav />

      <div className="max-w-container mx-auto px-6 py-9 w-full flex-1">
        <h1 className="text-[30px] mb-6">Nuova offerta</h1>

        <div className="grid gap-10" style={{ gridTemplateColumns: '240px 1fr', alignItems: 'start' }}>
          {/* Stepper */}
          <div className="sticky top-[88px] flex flex-col gap-1">
            {STEPS.map(s => {
              const done = s.id < step;
              const cur = s.id === step;
              return (
                <div
                  key={s.id}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-lg border transition-colors ${
                    cur ? 'bg-white border-ink-200 shadow-xs' : 'border-transparent'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex-none flex items-center justify-center text-[13px] font-bold transition-colors ${
                      done ? 'bg-success text-white' : cur ? 'bg-brand text-white' : 'bg-ink-200 text-ink-500'
                    }`}
                  >
                    {done ? <Check size={14} strokeWidth={3} /> : s.id + 1}
                  </div>
                  <span className={`text-[14px] font-semibold ${cur ? 'text-ink-950' : 'text-ink-500'}`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Content */}
          <div>
            {step === 0 && <StepDetails data={data} set={(k, v) => setField(k, v as string)} />}
            {step === 1 && <StepSimulation data={data} set={(k, v) => setField(k, v)} />}
            {step === 2 && <StepReview data={data} />}

            <div
              className="flex justify-between mt-8 pt-5 border-t border-ink-200"
              style={{ maxWidth: step === 2 ? undefined : 720 }}
            >
              <Button
                variant="ghost"
                disabled={step === 0}
                onClick={() => setStep(s => s - 1)}
                iconLeft={<ArrowLeft size={15} />}
              >
                Indietro
              </Button>
              {step < 2 ? (
                <Button onClick={() => setStep(s => s + 1)} iconRight={<ArrowRight size={15} />}>
                  Continua
                </Button>
              ) : (
                <Button onClick={() => setPublished(true)} iconRight={<Rocket size={15} />}>
                  Pubblica offerta
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
