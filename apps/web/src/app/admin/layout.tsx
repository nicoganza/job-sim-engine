'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Briefcase, BarChart2, Settings, LogOut, ChevronRight } from 'lucide-react';
import { getUser, clearToken } from '@/lib/auth';
import { Avatar } from '@/components/ui';

const navItems = [
  { href: '/admin/jobs',      label: 'Offerte',        Icon: Briefcase },
  { href: '/admin/analytics', label: 'Analisi',        Icon: BarChart2 },
  { href: '/admin/settings',  label: 'Impostazioni',   Icon: Settings  },
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
    <div className="min-h-screen flex bg-ink-50">
      {/* Sidebar */}
      <aside className="w-[220px] bg-ink-950 flex flex-col shrink-0 fixed inset-y-0 left-0 z-40">
        {/* Logo */}
        <div className="px-5 h-[68px] flex items-center border-b border-white/[.06]">
          <Link href="/admin/jobs" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand rounded-md flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-bold font-display">M</span>
            </div>
            <span className="font-bold text-[18px] font-display text-white tracking-tight">Mansio</span>
          </Link>
        </div>

        {/* Label */}
        <div className="px-5 pt-5 pb-2">
          <span className="text-[11px] font-semibold text-white/30 uppercase tracking-widest">Area aziende</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 pb-4 flex flex-col gap-0.5">
          {navItems.map(({ href, label, Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium transition-colors ${
                  active
                    ? 'bg-brand text-white'
                    : 'text-white/50 hover:text-white hover:bg-white/[.06]'
                }`}
              >
                <Icon size={16} className="flex-none" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-white/[.06]">
          {user && (
            <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
              <Avatar name={user.name ?? user.email} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-white truncate">{user.name ?? user.email}</div>
                {user.name && <div className="text-[11px] text-white/40 truncate">{user.email}</div>}
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium text-white/40 hover:text-white hover:bg-white/[.06] transition-colors"
          >
            <LogOut size={15} className="flex-none" />
            Esci
          </button>
        </div>
      </aside>

      {/* Main content — offset for fixed sidebar */}
      <main className="flex-1 ml-[220px] overflow-auto min-h-screen">
        <div className="max-w-5xl mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
