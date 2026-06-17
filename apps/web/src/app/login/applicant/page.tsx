'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ApplicantLoginPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function extractToken(raw: string): string {
    try {
      const url = new URL(raw.trim());
      const parts = url.pathname.split('/');
      const applyIdx = parts.indexOf('apply');
      if (applyIdx !== -1 && parts[applyIdx + 1]) return parts[applyIdx + 1];
    } catch {
      // not a URL — use as-is
    }
    return raw.trim();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const tok = extractToken(token);
    if (!tok) { setError('Inserisci il token o il link di invito.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/candidate/application/${tok}`);
      if (!res.ok) { setError('Link di invito non valido o scaduto. Controlla l\'email ricevuta.'); return; }
      router.push(`/apply/${tok}`);
    } catch {
      setError('Errore di rete — riprova.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="px-8 py-5">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">JS</span>
          </div>
          <span className="font-semibold text-slate-900">JobSim</span>
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Accedi alla tua simulazione</h1>
              <p className="text-slate-500 text-sm leading-relaxed">
                Incolla il link di invito o il token dall&apos;email ricevuta.
              </p>
            </div>

            <Link
              href="/jobs"
              className="flex items-center justify-between w-full bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl px-4 py-3.5 mb-6 hover:bg-indigo-100 transition-colors group"
            >
              <div>
                <p className="font-semibold text-sm">Sfoglia le posizioni aperte</p>
                <p className="text-xs text-indigo-500 mt-0.5">Trova e candidati a un ruolo direttamente</p>
              </div>
              <span className="text-indigo-400 group-hover:translate-x-0.5 transition-transform">→</span>
            </Link>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
              <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-slate-400">oppure usa un link di invito</span></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Link o token di invito</label>
                <input
                  type="text"
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  placeholder="https://… oppure incolla il tuo token"
                  required
                  className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {loading ? 'Verifica in corso…' : 'Vai alla mia simulazione'}
              </button>
            </form>

            <div className="mt-6 bg-slate-50 rounded-lg p-4 text-xs text-slate-500 leading-relaxed">
              <strong className="text-slate-700">Non hai ricevuto l&apos;invito?</strong> Contatta l&apos;azienda che ti ha inviato la candidatura. I link di invito sono unici per ogni candidato.
            </div>

            <p className="text-center text-xs text-slate-400 mt-6">
              Sei un&apos;azienda?{' '}
              <Link href="/login/company" className="text-indigo-600 hover:underline font-medium">
                Accesso aziende
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
