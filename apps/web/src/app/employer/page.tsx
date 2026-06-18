import Link from 'next/link';

export default function EmployerPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-slate-100">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">JS</span>
          </div>
          <span className="font-semibold text-slate-900 text-lg">JobSim</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-900 font-medium transition-colors px-3 py-2">
            Per i candidati
          </Link>
          <Link href="/company/login" className="text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors px-3 py-2">
            Accedi
          </Link>
          <Link href="/signup/company" className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors">
            Inizia gratis
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-8 uppercase tracking-wide">
          Per le aziende · Selezione basata sulle competenze
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold text-slate-900 leading-tight max-w-3xl mb-6">
          Assumi per competenza,<br />non solo per curriculum
        </h1>
        <p className="text-xl text-slate-500 max-w-xl mb-12 leading-relaxed">
          Sostituisci i task da svolgere a casa con simulazioni di lavoro reale. I candidati fanno il lavoro vero — l&apos;AI valuta i risultati istantaneamente.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <Link href="/signup/company" className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-semibold text-base hover:bg-indigo-700 transition-colors shadow-sm">
            Inizia gratis
          </Link>
          <Link href="/company/login" className="text-slate-700 px-8 py-4 rounded-xl font-semibold text-base hover:bg-slate-100 transition-colors border border-slate-200">
            Accedi alla dashboard →
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-50 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">Tutto ciò che ti serve per valutare i talenti</h2>
          <p className="text-slate-500 text-center mb-16 max-w-xl mx-auto">Sei moduli di simulazione, valutazione AI istantanea e una dashboard analitica completa — tutto in un&apos;unica piattaforma.</p>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                icon: '🎯',
                title: 'Scenari di lavoro reale',
                desc: 'Risposte email, prioritizzazione CRM, chiamate simulate, quiz a risposta multipla e molto altro — costruiti per replicare le attività quotidiane.',
              },
              {
                icon: '⚡',
                title: 'Valutazione AI istantanea',
                desc: 'Ogni risposta viene valutata automaticamente secondo una rubrica configurabile. Nessuna attesa, nessuna revisione manuale per i task standard.',
              },
              {
                icon: '📊',
                title: 'Insights azionabili',
                desc: 'Vedi i punteggi per competenza, i segnali critici e una raccomandazione di assunzione per ogni candidato nel momento in cui finisce.',
              },
            ].map(f => (
              <div key={f.title} className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-semibold text-slate-900 text-lg mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-16">Come funziona</h2>
          <div className="space-y-12">
            {[
              { step: '01', title: "Crea un'offerta di lavoro", desc: "Aggiungi i dettagli del ruolo e lascia che l'AI generi una simulazione su misura — oppure costruiscila da zero con la nostra libreria di moduli." },
              { step: '02', title: 'Invita i candidati', desc: "Pubblica l'offerta o invia un link unico a ogni candidato. Completano la simulazione ai propri ritmi, senza bisogno di registrarsi." },
              { step: '03', title: 'Valuta e decidi', desc: 'Ogni simulazione completata mostra un punteggio, una raccomandazione, la suddivisione per competenze e la trascrizione completa.' },
            ].map(item => (
              <div key={item.step} className="flex gap-8 items-start">
                <div className="text-5xl font-bold text-indigo-100 select-none shrink-0 w-16 text-right leading-none mt-1">{item.step}</div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-xl mb-2">{item.title}</h3>
                  <p className="text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="bg-indigo-600 py-20 px-6 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Pronto ad assumere in modo più intelligente?</h2>
        <p className="text-indigo-200 mb-8 max-w-md mx-auto">Configura la tua prima simulazione in pochi minuti. Nessuna carta di credito richiesta.</p>
        <Link href="/signup/company" className="inline-block bg-white text-indigo-600 font-semibold px-8 py-4 rounded-xl hover:bg-indigo-50 transition-colors">
          Inizia gratis
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8 px-8 flex items-center justify-between text-sm text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-indigo-600 rounded flex items-center justify-center">
            <span className="text-white text-xs font-bold">JS</span>
          </div>
          <span>JobSim</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/" className="hover:text-slate-600 transition-colors">Per i candidati</Link>
          <span>© {new Date().getFullYear()} JobSim. Tutti i diritti riservati.</span>
        </div>
      </footer>
    </div>
  );
}
