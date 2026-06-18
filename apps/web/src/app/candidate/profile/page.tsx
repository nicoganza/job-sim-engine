'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Camera, FileText, Linkedin, MapPin, Phone, Upload, ArrowRight, CheckCircle,
} from 'lucide-react';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import { Button, Card, Avatar, Badge, Alert, Input } from '@/components/ui';

type Profile = {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  bio?: string;
  location?: string;
  linkedinUrl?: string;
  avatarData?: string;
  hasCv?: boolean;
  cvFilename?: string;
};

export default function CandidateProfilePage() {
  const router = useRouter();
  const avatarRef = useRef<HTMLInputElement>(null);
  const cvRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [authState, setAuthState] = useState<'loading' | 'auth' | 'guest'>('loading');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [cvUploading, setCvUploading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('candidateToken');
    if (!token) { router.replace('/candidate/login?redirect=/candidate/profile'); return; }
    fetch('/api/candidate/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: Profile) => { setProfile(d); setAuthState('auth'); })
      .catch(() => router.replace('/candidate/login?redirect=/candidate/profile'));
  }, [router]);

  async function save() {
    if (!profile) return;
    setSaving(true); setSaveStatus('idle'); setSaveError('');
    try {
      const token = localStorage.getItem('candidateToken')!;
      const res = await fetch('/api/candidate/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: profile.name, phone: profile.phone, bio: profile.bio,
          location: profile.location, linkedinUrl: profile.linkedinUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProfile(data);
      localStorage.setItem('candidateProfile', JSON.stringify(data));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (e: any) {
      setSaveError(e.message ?? 'Errore nel salvataggio');
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar(file: File) {
    setAvatarUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const data = reader.result as string;
      const token = localStorage.getItem('candidateToken')!;
      const res = await fetch('/api/candidate/auth/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ data }),
      });
      const j = await res.json();
      setProfile(p => p ? { ...p, avatarData: j.avatarData } : p);
      setAvatarUploading(false);
    };
    reader.readAsDataURL(file);
  }

  async function uploadCv(file: File) {
    setCvUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const data = reader.result as string;
      const token = localStorage.getItem('candidateToken')!;
      await fetch('/api/candidate/auth/cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ data, filename: file.name }),
      });
      setProfile(p => p ? { ...p, hasCv: true, cvFilename: file.name } : p);
      setCvUploading(false);
    };
    reader.readAsDataURL(file);
  }

  function set(key: keyof Profile, value: string) {
    setProfile(p => p ? { ...p, [key]: value } : p);
  }

  if (authState === 'loading') {
    return (
      <div className="min-h-screen flex flex-col bg-ink-50">
        <TopNav />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-ink-200 border-t-brand rounded-full animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }
  if (!profile) return null;

  const displayName = profile.name ?? profile.email ?? 'Candidato';

  return (
    <div className="min-h-screen flex flex-col bg-ink-50">
      <TopNav />

      <div className="max-w-[860px] mx-auto px-6 py-10 w-full flex-1">
        {/* Page title */}
        <div className="mb-7">
          <h1 className="text-[28px]">Il tuo profilo</h1>
          <p className="text-ink-500 text-[15px] mt-1">
            Le informazioni che condividi con le aziende quando ti candidi.
          </p>
        </div>

        <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 300px' }}>
          {/* ─── Left column ─── */}
          <div className="flex flex-col gap-5">
            {/* Avatar + identity */}
            <Card padding="lg">
              <div className="flex items-center gap-5">
                {/* Avatar with upload overlay */}
                <div className="relative flex-none">
                  <Avatar
                    name={displayName}
                    src={profile.avatarData}
                    size="xl"
                  />
                  <button
                    type="button"
                    onClick={() => avatarRef.current?.click()}
                    disabled={avatarUploading}
                    className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-white border border-ink-200 shadow-sm flex items-center justify-center hover:bg-ink-50 transition-colors"
                  >
                    {avatarUploading ? (
                      <div className="w-3 h-3 border border-ink-300 border-t-brand rounded-full animate-spin" />
                    ) : (
                      <Camera size={13} className="text-ink-600" />
                    )}
                  </button>
                  <input
                    ref={avatarRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-[22px] font-bold text-ink-950 font-display leading-tight">
                    {displayName}
                  </div>
                  <div className="text-[14px] text-ink-500 mt-0.5">{profile.email}</div>
                  <div className="flex gap-2 flex-wrap mt-2.5">
                    {profile.location && (
                      <div className="flex items-center gap-1 text-[13px] text-ink-500">
                        <MapPin size={13} /> {profile.location}
                      </div>
                    )}
                    {profile.linkedinUrl && (
                      <a
                        href={profile.linkedinUrl.startsWith('http') ? profile.linkedinUrl : `https://${profile.linkedinUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[13px] text-blue-600 hover:underline"
                      >
                        <Linkedin size={13} /> LinkedIn
                      </a>
                    )}
                    {profile.hasCv && <Badge tone="success" dot>CV caricato</Badge>}
                  </div>
                </div>
              </div>

              {profile.bio && (
                <p className="text-[14px] text-ink-600 leading-relaxed mt-4 pt-4 border-t border-ink-100">
                  {profile.bio}
                </p>
              )}
            </Card>

            {/* Personal info form */}
            <Card padding="lg">
              <h2 className="text-[17px] mb-5">Informazioni personali</h2>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <Input
                  label="Nome e cognome"
                  placeholder="Mario Rossi"
                  value={profile.name ?? ''}
                  onChange={e => set('name', e.target.value)}
                />
                <Input
                  label="Telefono"
                  placeholder="+39 333 1234567"
                  value={profile.phone ?? ''}
                  onChange={e => set('phone', e.target.value)}
                  prefix={<Phone size={15} />}
                />
                <Input
                  label="Città / Posizione"
                  placeholder="Milano, Italia"
                  value={profile.location ?? ''}
                  onChange={e => set('location', e.target.value)}
                  prefix={<MapPin size={15} />}
                />
                <Input
                  label="Profilo LinkedIn"
                  placeholder="linkedin.com/in/mario-rossi"
                  value={profile.linkedinUrl ?? ''}
                  onChange={e => set('linkedinUrl', e.target.value)}
                  prefix={<Linkedin size={15} />}
                />
              </div>

              <Input
                label="Bio / Presentazione"
                placeholder="Breve presentazione di te stesso, delle tue competenze e dei tuoi obiettivi..."
                value={profile.bio ?? ''}
                onChange={e => set('bio', e.target.value)}
                textarea
                rows={4}
              />

              {saveStatus === 'error' && (
                <Alert tone="danger" className="mt-4">{saveError}</Alert>
              )}

              <div className="flex items-center gap-3 mt-5">
                <Button
                  onClick={save}
                  disabled={saving}
                >
                  {saving ? 'Salvataggio…' : 'Salva modifiche'}
                </Button>
                {saveStatus === 'saved' && (
                  <div className="flex items-center gap-1.5 text-success text-[14px] font-semibold">
                    <CheckCircle size={15} /> Salvato
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* ─── Right column ─── */}
          <div className="flex flex-col gap-5">
            {/* CV */}
            <Card padding="md">
              <div className="flex items-center gap-2 mb-4">
                <FileText size={16} className="text-ink-500" />
                <h2 className="text-[15px] font-semibold">Curriculum Vitae</h2>
              </div>

              {profile.hasCv ? (
                <div>
                  <div className="flex items-center gap-3 px-3 py-2.5 bg-success-subtle border border-success/20 rounded-lg mb-3">
                    <CheckCircle size={15} className="text-success flex-none" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-ink-800 truncate">
                        {profile.cvFilename ?? 'cv.pdf'}
                      </div>
                      <div className="text-[12px] text-success">Caricato</div>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    block
                    onClick={() => cvRef.current?.click()}
                    disabled={cvUploading}
                  >
                    {cvUploading ? 'Caricamento…' : 'Sostituisci CV'}
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => cvRef.current?.click()}
                  disabled={cvUploading}
                  className="w-full border-2 border-dashed border-ink-200 rounded-lg py-7 flex flex-col items-center gap-2 hover:border-brand hover:bg-brand-subtle/40 transition-colors group"
                >
                  <Upload size={20} className="text-ink-300 group-hover:text-brand transition-colors" />
                  <div className="text-[13px] text-ink-400 group-hover:text-blue-600 font-medium transition-colors">
                    {cvUploading ? 'Caricamento…' : 'Carica PDF'}
                  </div>
                  <div className="text-[11px] text-ink-300">Max 10 MB</div>
                </button>
              )}
              <input
                ref={cvRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={e => e.target.files?.[0] && uploadCv(e.target.files[0])}
              />
            </Card>

            {/* Candidature */}
            <Card padding="md">
              <h2 className="text-[15px] font-semibold mb-1">Le mie candidature</h2>
              <p className="text-[13px] text-ink-500 mb-4">
                Segui l'avanzamento delle tue simulazioni e dei feedback ricevuti.
              </p>
              <Link href="/dashboard">
                <Button variant="secondary" size="sm" block iconRight={<ArrowRight size={14} />}>
                  Vai alle candidature
                </Button>
              </Link>
            </Card>

            {/* Account */}
            <Card padding="md">
              <h2 className="text-[15px] font-semibold mb-3">Account</h2>
              <div className="text-[13px] text-ink-500 mb-1">Email</div>
              <div className="text-[14px] font-medium text-ink-800 mb-4">{profile.email}</div>
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('candidateToken');
                  localStorage.removeItem('candidateProfile');
                  router.push('/');
                }}
                className="text-[13px] text-danger font-semibold hover:underline"
              >
                Esci dall'account
              </button>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
