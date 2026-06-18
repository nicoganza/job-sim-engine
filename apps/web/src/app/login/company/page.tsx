'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ArrowRight, Building2, Lock, Mail } from 'lucide-react';
import { setToken, setUser } from '@/lib/auth';
import { Button, Card, Alert, Input } from '@/components/ui';

function CompanyLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/admin/jobs';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Credenziali non valide'); return; }
      setToken(data.token);
      setUser(data.user);
      router.push(redirect);
    } catch {
      setError('Errore di rete — riprova.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink-50 flex flex-col">
      {/* Minimal header */}
      <header className="px-8 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand rounded-md flex items-center justify-center">
            <span className="text-white text-sm font-bold font-display">M</span>
          </div>
          <span className="font-bold text-[20px] font-display text-ink-950 tracking-tight">Mansio</span>
        </Link>
        <Link href="/aziende" className="text-[14px] text-ink-500 hover:text-ink-700 transition-colors">
          Torna alla pagina aziende
        </Link>
      </header>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px]">
          {/* Icon */}
          <div className="w-14 h-14 rounded-xl bg-ink-950 flex items-center justify-center mx-auto mb-6">
            <Building2 size={26} className="text-white" />
          </div>

          <h1 className="text-[28px] text-center mb-1.5">Area aziende</h1>
          <p className="text-[15px] text-ink-500 text-center mb-8">
            Accedi alla tua dashboard di selezione.
          </p>

          <Card padding="lg">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label="Email aziendale"
                type="email"
                placeholder="tu@azienda.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                prefix={<Mail size={15} />}
                required
              />
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                prefix={<Lock size={15} />}
                required
              />

              {error && <Alert tone="danger">{error}</Alert>}

              <Button
                type="submit"
                disabled={loading}
                block
                size="lg"
                iconRight={<ArrowRight size={16} />}
              >
                {loading ? 'Accesso in corso…' : 'Accedi'}
              </Button>
            </form>
          </Card>

          <p className="text-center text-[13px] text-ink-400 mt-5">
            Non hai un account?{' '}
            <Link href="/aziende" className="text-brand font-semibold hover:underline">
              Scopri Mansio per le aziende
            </Link>
          </p>
          <p className="text-center text-[13px] text-ink-400 mt-2">
            Sei un candidato?{' '}
            <Link href="/candidate/login" className="text-brand font-semibold hover:underline">
              Accedi come candidato
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CompanyLoginPage() {
  return (
    <Suspense>
      <CompanyLoginForm />
    </Suspense>
  );
}
