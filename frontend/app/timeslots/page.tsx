'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { TimeSlot, Session } from '@/lib/types';
import DashboardWrapper from '@/components/layout/DashboardWrapper';

function TimeSlotsContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [sessions, setSessions] = useState<Session[]>([]);
  const [timeslots, setTimeslots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTimeslot, setEditingTimeslot] = useState<TimeSlot | null>(null);
  const [formData, setFormData] = useState({
    label: '',
    start_time: '',
    end_time: '',
    sort_order: 0,
  });

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (sessionId) {
      fetchTimeSlots(sessionId);
    }
  }, [sessionId]);

  const fetchSessions = async () => {
    try {
      const response = await apiClient.get('/sessions');
      setSessions(response.data.data || []);
      if (!sessionId && response.data.data?.length > 0) {
        const activeSession = response.data.data.find((s: Session) => s.is_active);
        if (activeSession) {
          window.location.href = `/timeslots?session_id=${activeSession.id}`;
        }
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  const fetchTimeSlots = async (sid: string) => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/timeslots?session_id=${sid}`);
      setTimeslots(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch timeslots:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId) return;

    try {
      if (editingTimeslot) {
        await apiClient.patch(`/timeslots/${editingTimeslot.id}`, formData);
      } else {
        await apiClient.post('/timeslots', { ...formData, session_id: sessionId });
      }
      setShowModal(false);
      setEditingTimeslot(null);
      setFormData({ label: '', start_time: '', end_time: '', sort_order: 0 });
      fetchTimeSlots(sessionId);
    } catch (error) {
      console.error('Failed to save timeslot:', error);
      alert('Failed to save timeslot');
    }
  };

  const handleEdit = (timeslot: TimeSlot) => {
    setEditingTimeslot(timeslot);
    setFormData({
      label: timeslot.label,
      start_time: timeslot.start_time,
      end_time: timeslot.end_time,
      sort_order: timeslot.sort_order,
    });
    setShowModal(true);
  };

  const handleReorder = async (newOrder: TimeSlot[]) => {
    if (!sessionId) return;

    try {
      const reorderMap = newOrder.map((ts, index) => ({
        id: ts.id,
        sort_order: index + 1,
      }));

      await apiClient.post('/timeslots/reorder', {
        session_id: sessionId,
        reorder_map: reorderMap,
      });

      setTimeslots(newOrder);
    } catch (error) {
      console.error('Failed to reorder timeslots:', error);
      alert('Failed to reorder timeslots');
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...timeslots];
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= newOrder.length) return;

    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    handleReorder(newOrder);
  };

  if (!sessionId) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-4">Time Slots</h1>
        <p>Please select a session to view timeslots.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Time Slots</h1>
        <button
          onClick={() => {
            setEditingTimeslot(null);
            setFormData({
              label: '',
              start_time: '',
              end_time: '',
              sort_order: timeslots.length + 1,
            });
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Add Time Slot
        </button>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="space-y-2">
          {timeslots.map((timeslot, index) => (
            <div
              key={timeslot.id}
              className="flex items-center justify-between bg-white border border-gray-200 rounded p-4"
            >
              <div className="flex-1">
                <div className="font-medium">{timeslot.label}</div>
                <div className="text-sm text-gray-600">
                  {timeslot.start_time} - {timeslot.end_time}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleMove(index, 'up')}
                  disabled={index === 0}
                  className="px-2 py-1 border rounded disabled:opacity-50"
                >
                  ↑
                </button>
                <button
                  onClick={() => handleMove(index, 'down')}
                  disabled={index === timeslots.length - 1}
                  className="px-2 py-1 border rounded disabled:opacity-50"
                >
                  ↓
                </button>
                <button
                  onClick={() => handleEdit(timeslot)}
                  className="text-blue-600 hover:underline px-2"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">
              {editingTimeslot ? 'Edit Time Slot' : 'Create Time Slot'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Label</label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Start Time</label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">End Time</label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Sort Order</label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingTimeslot(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TimeSlotsPage() {
  return (
    <DashboardWrapper>
      <Suspense fallback={<div>Loading...</div>}>
        <TimeSlotsContent />
      </Suspense>
    </DashboardWrapper>
  );
}

