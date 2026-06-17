'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function NewJobPage() {
  const router = useRouter();
  const [form, setForm] = useState({ title: '', description: '', department: '', seniority: '', employmentType: '', remotePolicy: '' });
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
      <h1 className="text-2xl font-bold mb-6">Nuova offerta di lavoro</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <Field label="Titolo del ruolo" required>
          <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
        </Field>
        <Field label="Descrizione" required>
          <textarea className="input min-h-[140px]" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Dipartimento">
            <input className="input" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
          </Field>
          <Field label="Seniority">
            <select className="input" value={form.seniority} onChange={e => setForm(f => ({ ...f, seniority: e.target.value }))}>
              <option value="">Seleziona...</option>
              {['entry', 'junior', 'mid', 'senior', 'lead', 'manager', 'director'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Tipo di contratto">
            <select className="input" value={form.employmentType} onChange={e => setForm(f => ({ ...f, employmentType: e.target.value }))}>
              <option value="">Seleziona...</option>
              {['full_time', 'part_time', 'contract', 'internship'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Modalità di lavoro">
            <select className="input" value={form.remotePolicy} onChange={e => setForm(f => ({ ...f, remotePolicy: e.target.value }))}>
              <option value="">Seleziona...</option>
              {['remote', 'hybrid', 'onsite'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <button type="submit" disabled={saving} className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Creazione...' : 'Crea offerta'}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
      {children}
    </div>
  );
}
