'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button, Alert, CityAutocomplete } from '@/components/ui';

export default function NewJobPage() {
  const router = useRouter();
  const [form, setForm] = useState({ title: '', description: '', department: '', location: '', remotePolicy: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const job = await api.post<{ id: string }>('/api/jobs', form);
      router.push(`/admin/jobs/${job.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-[28px]">Nuova offerta di lavoro</h1>
        <p className="text-[15px] text-ink-500 mt-1">Compila i dettagli della posizione aperta.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {error && <Alert tone="danger">{error}</Alert>}

        {/* Titolo — campo prominente */}
        <div className="bg-white rounded-xl border border-ink-200 p-6">
          <label className="block text-[13px] font-semibold text-ink-700 mb-1.5">
            Titolo del ruolo <span className="text-danger">*</span>
          </label>
          <input
            required
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="es. Account Executive — Mid-Market"
            className="w-full text-[22px] font-bold text-ink-950 placeholder:text-ink-300 placeholder:font-normal border-0 outline-none focus:ring-0 bg-transparent"
          />
        </div>

        {/* Descrizione — campo prominente */}
        <div className="bg-white rounded-xl border border-ink-200 p-6">
          <label className="block text-[13px] font-semibold text-ink-700 mb-1.5">
            Descrizione <span className="text-danger">*</span>
          </label>
          <textarea
            required
            rows={8}
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Descrivi il ruolo, le responsabilità principali e cosa cerchi nel candidato ideale..."
            className="w-full text-[15px] text-ink-900 placeholder:text-ink-300 border-0 outline-none focus:ring-0 bg-transparent resize-none leading-relaxed"
          />
        </div>

        {/* Dettagli secondari */}
        <div className="bg-white rounded-xl border border-ink-200 p-6">
          <p className="text-[13px] font-semibold text-ink-700 mb-4">Dettagli posizione</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-ink-500 mb-1.5 uppercase tracking-wide">Dipartimento</label>
              <input
                value={form.department}
                onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                placeholder="es. Sales"
                className="w-full border border-ink-200 rounded-lg px-3.5 py-2.5 text-[14px] text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition"
              />
            </div>
            <CityAutocomplete
              label="Luogo"
              placeholder="es. Milano"
              value={form.location}
              onChange={v => setForm(f => ({ ...f, location: v }))}
            />
            <div className="col-span-2">
              <label className="block text-[12px] font-semibold text-ink-500 mb-1.5 uppercase tracking-wide">Modalità di lavoro</label>
              <div className="flex gap-2">
                {[
                  { value: 'onsite', label: 'In sede' },
                  { value: 'hybrid', label: 'Ibrido' },
                  { value: 'remote', label: 'Remoto' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, remotePolicy: f.remotePolicy === opt.value ? '' : opt.value }))}
                    className={`px-4 py-2 rounded-lg text-[13px] font-semibold border transition-colors ${
                      form.remotePolicy === opt.value
                        ? 'bg-brand text-white border-brand'
                        : 'bg-white text-ink-600 border-ink-200 hover:border-ink-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} size="lg">
            {saving ? 'Creazione…' : 'Crea offerta'}
          </Button>
        </div>
      </form>
    </div>
  );
}
