'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { BlockedTime, TimeSlot, Session, Day } from '@/lib/types';
import DashboardWrapper from '@/components/layout/DashboardWrapper';

const DAYS: Day[] = ['MON', 'TUE', 'WED', 'THU', 'FRI'];

function BlockedTimesContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [sessions, setSessions] = useState<Session[]>([]);
  const [timeslots, setTimeslots] = useState<TimeSlot[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<string>('global');
  const [scopeId, setScopeId] = useState<string>('');

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (sessionId) {
      fetchTimeSlots(sessionId);
      fetchBlockedTimes(sessionId);
    }
  }, [sessionId, scope, scopeId]);

  const fetchSessions = async () => {
    try {
      const response = await apiClient.get('/sessions');
      setSessions(response.data.data || []);
      if (!sessionId && response.data.data?.length > 0) {
        const activeSession = response.data.data.find((s: Session) => s.is_active);
        if (activeSession) {
          window.location.href = `/blocked-times?session_id=${activeSession.id}`;
        }
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  const fetchTimeSlots = async (sid: string) => {
    try {
      const response = await apiClient.get(`/timeslots?session_id=${sid}`);
      setTimeslots(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch timeslots:', error);
    }
  };

  const fetchBlockedTimes = async (sid: string) => {
    try {
      setLoading(true);
      let url = `/blocked-times?session_id=${sid}`;
      if (scope) url += `&scope=${scope}`;
      if (scopeId) url += `&scope_id=${scopeId}`;
      const response = await apiClient.get(url);
      setBlockedTimes(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch blocked times:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCellClick = async (day: Day, timeslotId: string) => {
    if (!sessionId) return;

    const existing = blockedTimes.find(
      (bt) => bt.day === day && bt.timeslot_id === timeslotId
    );

    if (existing) {
      // Delete if exists
      if (confirm('Remove this blocked time?')) {
        try {
          await apiClient.delete(`/blocked-times/${existing.id}`);
          fetchBlockedTimes(sessionId);
        } catch (error) {
          console.error('Failed to delete blocked time:', error);
          alert('Failed to delete blocked time');
        }
      }
    } else {
      // Create new
      try {
        await apiClient.post('/blocked-times', {
          session_id: sessionId,
          scope: scope || 'global',
          scope_id: scopeId || null,
          day,
          timeslot_id: timeslotId,
          reason: null,
        });
        fetchBlockedTimes(sessionId);
      } catch (error) {
        console.error('Failed to create blocked time:', error);
        alert('Failed to create blocked time');
      }
    }
  };

  const handleTemplate = async (template: 'sport' | 'jumat') => {
    if (!sessionId) return;

    try {
      await apiClient.post(`/blocked-times/templates/${template}`, {
        session_id: sessionId,
        level: 300,
      });
      fetchBlockedTimes(sessionId);
    } catch (error) {
      console.error(`Failed to create ${template} template:`, error);
      alert(`Failed to create ${template} template`);
    }
  };

  const isBlocked = (day: Day, timeslotId: string): boolean => {
    return blockedTimes.some(
      (bt) => bt.day === day && bt.timeslot_id === timeslotId
    );
  };

  if (!sessionId) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-4">Blocked Times</h1>
        <p>Please select a session to view blocked times.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Blocked Times</h1>
        <div className="flex gap-2">
          <button
            onClick={() => handleTemplate('sport')}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Add Sport Template
          </button>
          <button
            onClick={() => handleTemplate('jumat')}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Add Jumat Template
          </button>
        </div>
      </div>

      <div className="mb-4 flex gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Scope</label>
          <select
            value={scope}
            onChange={(e) => {
              setScope(e.target.value);
              setScopeId('');
            }}
            className="border border-gray-300 rounded px-3 py-2"
          >
            <option value="global">Global</option>
            <option value="level">Level</option>
            <option value="lecturer">Lecturer</option>
            <option value="room">Room</option>
          </select>
        </div>
        {(scope === 'level' || scope === 'lecturer' || scope === 'room') && (
          <div>
            <label className="block text-sm font-medium mb-1">Scope ID</label>
            <input
              type="text"
              value={scopeId}
              onChange={(e) => setScopeId(e.target.value)}
              placeholder={scope === 'level' ? 'e.g., 300' : 'UUID'}
              className="border border-gray-300 rounded px-3 py-2"
            />
          </div>
        )}
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 text-left border">Time Slot</th>
                {DAYS.map((day) => (
                  <th key={day} className="px-4 py-2 text-center border">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeslots.map((timeslot) => (
                <tr key={timeslot.id}>
                  <td className="px-4 py-2 border font-medium">
                    {timeslot.label}
                  </td>
                  {DAYS.map((day) => {
                    const blocked = isBlocked(day, timeslot.id);
                    return (
                      <td
                        key={`${day}-${timeslot.id}`}
                        className={`px-4 py-2 border text-center cursor-pointer ${
                          blocked
                            ? 'bg-red-200 hover:bg-red-300'
                            : 'bg-white hover:bg-gray-100'
                        }`}
                        onClick={() => handleCellClick(day, timeslot.id)}
                        title={blocked ? 'Click to unblock' : 'Click to block'}
                      >
                        {blocked ? '✕' : ''}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function BlockedTimesPage() {
  return (
    <DashboardWrapper>
      <Suspense fallback={<div>Loading...</div>}>
        <BlockedTimesContent />
      </Suspense>
    </DashboardWrapper>
  );
}

