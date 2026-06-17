'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getUser, clearToken } from '@/lib/auth';

const navItems = [
  { href: '/admin/jobs', label: 'Offerte', icon: '💼' },
  { href: '/admin/analytics', label: 'Analisi', icon: '📊' },
  { href: '/admin/settings', label: 'Impostazioni', icon: '⚙️' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; name?: string } | null>(null);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.replace('/login/company'); return; }
    setUser(u);
  }, [router]);

  function handleLogout() {
    clearToken();
    router.push('/login/company');
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-60 bg-slate-900 text-white flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-800">
          <Link href="/admin/jobs" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-bold">JS</span>
            </div>
            <span className="font-semibold text-white text-base">JobSim</span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(item => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span className="text-base leading-none">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User + logout */}
        <div className="px-3 py-4 border-t border-slate-800">
          {user && (
            <div className="px-3 py-2 mb-2">
              <p className="text-xs text-slate-500 truncate">{user.name || user.email}</p>
              {user.name && <p className="text-xs text-slate-600 truncate">{user.email}</p>}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <span className="text-base leading-none">→</span>
            Esci
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
