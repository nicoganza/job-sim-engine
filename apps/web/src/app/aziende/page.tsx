'use client';
import Link from 'next/link';
import { ArrowRight, Target, ClipboardCheck, Users, BarChart2, Zap, Award, Globe, CheckCircle } from 'lucide-react';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import { Button, Badge, Card, Avatar } from '@/components/ui';

function Feature({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ElementType;
  title: string;
  text: string;
}) {
  return (
    <Card padding="lg">
      <div className="w-11 h-11 rounded-lg bg-brand-subtle flex items-center justify-center mb-4">
        <Icon size={21} className="text-brand" />
      </div>
      <h3 className="text-[19px] mb-2">{title}</h3>
      <p className="text-[15px] text-ink-600 leading-relaxed">{text}</p>
    </Card>
  );
}

export default function AziendePage() {
  return (
    <div className="min-h-screen flex flex-col bg-ink-50">
      <TopNav />

      {/* Hero — dark */}
      <section className="bg-ink-950">
        <div
          className="max-w-container mx-auto px-6 py-20 grid gap-14 items-center"
          style={{ gridTemplateColumns: '1.1fr 1fr' }}
        >
          <div>
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
              style={{ background: 'rgba(255,255,255,.08)' }}
            >
              <Target size={14} className="text-blue-300" />
              <span className="text-[13px] font-semibold text-blue-100">Assumi per competenze, non per CV</span>
            </div>
            <h1 className="text-[52px] leading-[1.03] text-white mb-5" style={{ letterSpacing: '-0.03em' }}>
              Vedi i candidati<br />al lavoro, prima<br />di assumerli.
            </h1>
            <p className="text-[19px] text-ink-300 leading-relaxed max-w-[480px] mb-8">
              Allega a ogni offerta una simulazione con le task reali del ruolo. Ricevi candidature già
              qualificate e decidi sulla base del lavoro svolto.
            </p>
            <div className="flex gap-3">
              <Link href="/aziende/nuova-offerta">
                <Button size="lg" iconRight={<ArrowRight size={17} />}>Pubblica un'offerta</Button>
              </Link>
              <Link href="/company/login">
                <Button size="lg" variant="secondary" style={{ background: 'transparent', color: '#fff', borderColor: 'rgba(255,255,255,.24)' }}>
                  Accedi
                </Button>
              </Link>
            </div>
            <div className="flex gap-9 mt-11">
              {[
                { stat: '−63%', label: 'tempo di screening' },
                { stat: '4×',   label: 'qualità delle shortlist' },
                { stat: '1.2k', label: 'aziende attive' },
              ].map(({ stat, label }) => (
                <div key={label}>
                  <div className="font-display font-bold text-[32px] text-white leading-none">{stat}</div>
                  <div className="text-[13px] text-ink-400 mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Mock preview */}
          <Card padding="lg" style={{ boxShadow: '0 24px 48px rgba(11,18,32,.4)' }}>
            <div className="flex items-center gap-3 mb-4">
              <Avatar name="Giulia Romano" size="md" />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-ink-950 font-display text-[15px]">Giulia Romano</div>
                <div className="text-[13px] text-ink-500">Product Designer · simulazione completata</div>
              </div>
              <Badge tone="success" dot>92% match</Badge>
            </div>
            {['Brief letto', 'Analisi problemi', 'Proposta flusso', 'Metriche di successo'].map(t => (
              <div key={t} className="flex items-center gap-3 py-2.5 border-b border-ink-100 last:border-0">
                <CheckCircle size={17} className="text-success flex-none" />
                <span className="text-[14px] text-ink-700 flex-1">{t}</span>
                <span className="text-[12px] font-mono text-ink-400">100%</span>
              </div>
            ))}
            <div className="flex gap-2 mt-4">
              <Button size="sm" block>Invita al colloquio</Button>
              <Button size="sm" variant="secondary">Vedi lavoro</Button>
            </div>
          </Card>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-container mx-auto px-6 pt-18 pb-6 w-full" style={{ paddingTop: '72px' }}>
        <h2 className="text-[32px] mb-2 max-w-[560px]">Meno colloqui a vuoto. Più assunzioni giuste.</h2>
        <p className="text-[17px] text-ink-500 mb-10 max-w-[560px]">
          Mansio sostituisce il filtro del CV con una prova pratica del ruolo.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <Feature icon={ClipboardCheck} title="Simulazioni su misura"   text="Costruisci le task del ruolo o parti dai nostri modelli per ogni famiglia professionale." />
          <Feature icon={Users}          title="Candidature qualificate" text="Ricevi solo chi ha completato la prova: niente più centinaia di CV da filtrare a mano." />
          <Feature icon={BarChart2}      title="Valutazione strutturata" text="Confronta i lavori con criteri coerenti e una scorecard condivisa con il team." />
          <Feature icon={Zap}            title="Pubblica in minuti"      text="Crea un'offerta con simulazione in pochi passi, con anteprima lato candidato." />
          <Feature icon={Award}          title="Employer brand"          text="Mostra come si lavora davvero da voi: i candidati apprezzano la trasparenza." />
          <Feature icon={Globe}          title="Remoto e in sede"        text="Funziona per qualsiasi modalità di lavoro e per team distribuiti." />
        </div>
      </section>

      {/* CTA band */}
      <section className="max-w-container mx-auto px-6 w-full" style={{ paddingTop: '72px' }}>
        <div
          className="rounded-xl p-10 flex items-center justify-between gap-6"
          style={{ background: '#2D5BFF' }}
        >
          <div>
            <h2 className="text-[28px] text-white">Pronti a vedere i candidati al lavoro?</h2>
            <p className="text-[16px] text-blue-100 mt-1.5">La prima offerta con simulazione è gratuita.</p>
          </div>
          <Link href="/aziende/nuova-offerta">
            <Button variant="inverse" size="lg" iconRight={<ArrowRight size={17} />}>Inizia ora</Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
