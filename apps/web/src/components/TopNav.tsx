'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, Building2, User, Briefcase, LogOut, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui';

type CandidateBasic = {
  name?: string;
  email?: string;
  avatarData?: string;
};

function initials(name?: string, email?: string): string {
  if (name) {
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return '?';
}

function CandidateMenu({ candidate }: { candidate: CandidateBasic }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  function logout() {
    localStorage.removeItem('candidateToken');
    localStorage.removeItem('candidateProfile');
    setOpen(false);
    router.push('/');
  }

  const inits = initials(candidate.name, candidate.email);

  return (
    <div ref={ref} className="relative flex items-center gap-2">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 rounded-full px-2 py-1 hover:bg-ink-100 transition-colors group"
      >
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-[13px] font-bold font-display select-none overflow-hidden flex-none">
          {candidate.avatarData ? (
            <img src={candidate.avatarData} alt="" className="w-full h-full object-cover" />
          ) : (
            inits
          )}
        </div>
        <ChevronDown
          size={14}
          className={`text-ink-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-56 bg-white border border-ink-200 rounded-xl shadow-lg overflow-hidden z-50"
          style={{ boxShadow: '0 12px 28px rgba(11,18,32,.12)' }}
        >
          {/* User info */}
          <div className="px-4 py-3 border-b border-ink-100">
            <div className="font-semibold text-ink-950 text-[14px] truncate">
              {candidate.name ?? 'Candidato'}
            </div>
            <div className="text-ink-500 text-[12px] truncate">{candidate.email}</div>
          </div>

          {/* Links */}
          <div className="py-1">
            <Link
              href="/candidate/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-[14px] text-ink-700 hover:bg-ink-50 transition-colors"
            >
              <User size={15} className="text-ink-400" />
              Il tuo profilo
            </Link>
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-[14px] text-ink-700 hover:bg-ink-50 transition-colors"
            >
              <Briefcase size={15} className="text-ink-400" />
              Le mie candidature
            </Link>
          </div>

          {/* Logout */}
          <div className="border-t border-ink-100 py-1">
            <button
              type="button"
              onClick={logout}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[14px] text-danger hover:bg-danger-subtle transition-colors"
            >
              <LogOut size={15} />
              Esci
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TopNav() {
  const pathname = usePathname();
  const [authState, setAuthState] = useState<'loading' | 'guest' | 'auth'>('loading');
  const [candidate, setCandidate] = useState<CandidateBasic | null>(null);
  const [companyUser, setCompanyUser] = useState<{ name?: string; email?: string } | null>(null);

  useEffect(() => {
    // Candidate auth
    const token = localStorage.getItem('candidateToken');
    if (!token) { setAuthState('guest'); }
    else {
      const cached = localStorage.getItem('candidateProfile');
      if (cached) { try { setCandidate(JSON.parse(cached)); } catch {} }
      setAuthState('auth');
    }
    // Company auth
    const companyToken = localStorage.getItem('token');
    const companyProfile = localStorage.getItem('user');
    if (companyToken && companyProfile) {
      try { setCompanyUser(JSON.parse(companyProfile)); } catch {}
    }
  }, []);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <header
      className="sticky top-0 z-50 border-b border-ink-200"
      style={{ background: 'rgba(255,255,255,.86)', backdropFilter: 'saturate(180%) blur(12px)' }}
    >
      <div className="max-w-container mx-auto px-6 h-[68px] flex items-center gap-7">
        <Link href="/" className="flex items-center gap-2.5 flex-none">
          <div className="w-8 h-8 bg-brand rounded-md flex items-center justify-center">
            <span className="text-white text-sm font-bold font-display">M</span>
          </div>
          <span className="font-bold text-[20px] font-display text-ink-950 tracking-tight">Mansio</span>
        </Link>

        <nav className="flex gap-6 items-center">
          {[
            { href: '/', label: 'Trova lavoro' },
            { href: '/dashboard', label: 'Le mie candidature' },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`text-[15px] font-semibold pb-px border-b-2 transition-colors ${
                isActive(href)
                  ? 'text-ink-950 border-brand'
                  : 'text-ink-500 border-transparent hover:text-ink-700'
              }`}
            >
              {label}
            </Link>
          ))}

          {/* Per le aziende — vicino ai link di navigazione */}
          <div className="w-px h-5 bg-ink-200" />
          {companyUser ? (
            <Link
              href="/admin/jobs"
              className="text-[14px] font-semibold text-ink-500 hover:text-ink-700 flex items-center gap-1.5 transition-colors"
            >
              <Building2 size={16} /> Dashboard azienda
            </Link>
          ) : (
            <Link
              href="/aziende"
              className="text-[14px] font-semibold text-ink-500 hover:text-ink-700 flex items-center gap-1.5 transition-colors"
            >
              <Building2 size={16} /> Per le aziende
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {authState === 'loading' && (
            <div className="w-8 h-8 rounded-full bg-ink-100 animate-pulse" />
          )}

          {authState === 'guest' && (
            <>
              <Link href="/candidate/login">
                <Button size="sm" variant="secondary">Accedi</Button>
              </Link>
              <Link href="/candidate/login?mode=register">
                <Button size="sm">Registrati</Button>
              </Link>
            </>
          )}

          {authState === 'auth' && (
            <>
              <button type="button" className="text-ink-400 hover:text-ink-700 transition-colors flex">
                <Bell size={20} />
              </button>
              <CandidateMenu candidate={candidate ?? {}} />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
