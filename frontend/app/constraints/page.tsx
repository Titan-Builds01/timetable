'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { ConstraintsConfig, Session } from '../../../shared/types';
import DashboardWrapper from '@/components/layout/DashboardWrapper';

function ConstraintsContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [sessions, setSessions] = useState<Session[]>([]);
  const [constraints, setConstraints] = useState<ConstraintsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [jsonText, setJsonText] = useState('');

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (sessionId) {
      fetchConstraints();
    }
  }, [sessionId]);

  const fetchSessions = async () => {
    try {
      const response = await apiClient.get('/sessions');
      setSessions(response.data.data || []);
      if (!sessionId && response.data.data?.length > 0) {
        const activeSession = response.data.data.find((s: Session) => s.is_active);
        if (activeSession) {
          window.location.href = `/constraints?session_id=${activeSession.id}`;
        }
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  const fetchConstraints = async () => {
    if (!sessionId) return;
    try {
      setLoading(true);
      const response = await apiClient.get(`/constraints?session_id=${sessionId}`);
      setConstraints(response.data.data);
      setJsonText(JSON.stringify(response.data.data, null, 2));
    } catch (error) {
      console.error('Failed to fetch constraints:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!sessionId) return;

    try {
      setSaving(true);
      let parsedConfig: ConstraintsConfig;
      try {
        parsedConfig = JSON.parse(jsonText);
      } catch (error) {
        alert('Invalid JSON format');
        return;
      }

      await apiClient.put('/constraints', {
        session_id: sessionId,
        config: parsedConfig,
      });

      alert('Constraints saved successfully!');
      fetchConstraints();
    } catch (error: any) {
      console.error('Failed to save constraints:', error);
      alert(error.response?.data?.error || 'Failed to save constraints');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (constraints) {
      setJsonText(JSON.stringify(constraints, null, 2));
    }
  };

  if (!sessionId) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-4">Constraints Configuration</h1>
        <p>Please select a session to configure constraints.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="container mx-auto p-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Constraints Configuration</h1>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-sm text-yellow-800">
          <strong>Note:</strong> Edit the JSON configuration below. Changes will affect event expansion
          and scheduling behavior. Make sure the JSON is valid before saving.
        </p>
      </div>

      <div className="border border-gray-300 rounded">
        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          className="w-full h-96 p-4 font-mono text-sm"
          style={{ fontFamily: 'monospace' }}
        />
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>
          <strong>Key fields:</strong>
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>
            <code>allowed_days</code>: Array of allowed days (MON, TUE, WED, THU, FRI)
          </li>
          <li>
            <code>consecutive_pairs</code>: Array of [slot1, slot2] pairs for 2-slot events
          </li>
          <li>
            <code>unit_mapping</code>: Maps course type and units to event configurations
          </li>
          <li>
            <code>defaults</code>: Default scheduling parameters
          </li>
          <li>
            <code>soft_weights</code>: Penalty weights for soft constraints
          </li>
        </ul>
      </div>
    </div>
  );
}

export default function ConstraintsPage() {
  return (
    <DashboardWrapper>
      <Suspense fallback={<div>Loading...</div>}>
        <ConstraintsContent />
      </Suspense>
    </DashboardWrapper>
  );
}

