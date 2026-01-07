'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { Session, ScheduleRun } from '@/lib/types';
import DashboardWrapper from '@/components/layout/DashboardWrapper';

function GenerateContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');

  const [sessions, setSessions] = useState<Session[]>([]);
  const [runs, setRuns] = useState<ScheduleRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    seed: '',
    candidate_limit: 25,
  });

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (sessionId) {
      fetchRuns();
    }
  }, [sessionId]);

  const fetchSessions = async () => {
    try {
      const response = await apiClient.get('/sessions');
      setSessions(response.data.data || []);
      if (!sessionId && response.data.data?.length > 0) {
        const activeSession = response.data.data.find((s: Session) => s.is_active);
        if (activeSession) {
          window.location.href = `/generate?session_id=${activeSession.id}`;
        }
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  const fetchRuns = async () => {
    if (!sessionId) return;
    try {
      const response = await apiClient.get(`/runs?session_id=${sessionId}`);
      setRuns(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch runs:', error);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId) return;

    try {
      setLoading(true);
      const response = await apiClient.post('/runs/generate', {
        session_id: sessionId,
        seed: formData.seed ? parseInt(formData.seed) : null,
        candidate_limit: formData.candidate_limit,
      });

      alert(response.data.message);
      fetchRuns();
      
      // Navigate to the new run
      if (response.data.data?.id) {
        router.push(`/runs/${response.data.data.id}?session_id=${sessionId}`);
      }
    } catch (error: any) {
      console.error('Failed to generate timetable:', error);
      alert(error.response?.data?.error || 'Failed to generate timetable');
    } finally {
      setLoading(false);
    }
  };

  if (!sessionId) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-4">Generate Timetable</h1>
        <p>Please select a session to generate timetable.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Generate Timetable</h1>

      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Locked events will be preserved when regenerating. Unlock events if you
          want them to be rescheduled.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Generate Form */}
        <div className="border border-gray-200 rounded p-6">
          <h2 className="text-xl font-bold mb-4">Run Configuration</h2>
          <form onSubmit={handleGenerate}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Seed (optional)</label>
              <input
                type="number"
                value={formData.seed}
                onChange={(e) => setFormData({ ...formData, seed: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="Leave empty for random"
              />
              <p className="text-xs text-gray-500 mt-1">
                Same seed + same input = same output (for reproducibility)
              </p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Candidate Limit</label>
              <input
                type="number"
                value={formData.candidate_limit}
                onChange={(e) => setFormData({ ...formData, candidate_limit: parseInt(e.target.value) })}
                className="w-full border border-gray-300 rounded px-3 py-2"
                min="1"
                max="100"
              />
              <p className="text-xs text-gray-500 mt-1">
                Number of top candidates to try per event (default: 25)
              </p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Timetable'}
            </button>
          </form>
        </div>

        {/* Run History */}
        <div className="border border-gray-200 rounded p-6">
          <h2 className="text-xl font-bold mb-4">Run History</h2>
          {runs.length === 0 ? (
            <p className="text-gray-500">No runs yet</p>
          ) : (
            <div className="space-y-2">
              {runs.slice(0, 5).map((run) => (
                <div
                  key={run.id}
                  className="p-3 border rounded hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/runs/${run.id}?session_id=${sessionId}`)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">
                        {new Date(run.created_at).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">
                        {run.scheduled_count} scheduled, {run.unscheduled_count} unscheduled
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        run.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : run.status === 'running'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {run.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GeneratePage() {
  return (
    <DashboardWrapper>
      <Suspense fallback={<div>Loading...</div>}>
        <GenerateContent />
      </Suspense>
    </DashboardWrapper>
  );
}

