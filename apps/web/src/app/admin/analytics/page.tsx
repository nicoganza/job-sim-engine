'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Job = { id: string; title: string };
type Analytics = { totalApplications: number; completedResults: number; averageScore?: number; results: Array<{ totalScore?: number; recommendation?: string }> };

export default function AnalyticsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState('');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  useEffect(() => { api.get<Job[]>('/api/jobs').then(setJobs); }, []);
  useEffect(() => {
    if (!selectedJob) return;
    api.get<Analytics>(`/api/jobs/${selectedJob}/analytics`).then(setAnalytics);
  }, [selectedJob]);

  const recCounts = analytics?.results.reduce((acc: Record<string, number>, r) => { if (r.recommendation) acc[r.recommendation] = (acc[r.recommendation] ?? 0) + 1; return acc; }, {}) ?? {};

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Job</label>
        <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64" value={selectedJob} onChange={e => setSelectedJob(e.target.value)}>
          <option value="">Choose a job...</option>
          {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
        </select>
      </div>

      {analytics && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Total Applicants" value={analytics.totalApplications} />
          <StatCard label="Completed" value={analytics.completedResults} />
          <StatCard label="Avg Score" value={analytics.averageScore != null ? `${Math.round(analytics.averageScore)}%` : '—'} />
        </div>
      )}

      {analytics && Object.keys(recCounts).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold mb-4">Recommendations</h2>
          <div className="space-y-2">
            {Object.entries(recCounts).map(([rec, count]) => (
              <div key={rec} className="flex items-center gap-3">
                <span className="text-sm w-32 capitalize">{rec.replace(/_/g, ' ')}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                  <div className="bg-blue-500 h-4 rounded-full" style={{ width: `${(count / analytics.completedResults) * 100}%` }} />
                </div>
                <span className="text-sm font-medium w-6">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
      <div className="text-3xl font-bold text-blue-600">{value}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
    </div>
  );
}
