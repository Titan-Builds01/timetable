'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { Lecturer, TimeSlot, BlockedTime, Day } from '../../../../../shared/types';
import DashboardWrapper from '@/components/layout/DashboardWrapper';

const DAYS: Day[] = ['MON', 'TUE', 'WED', 'THU', 'FRI'];

function LecturerDetailsContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const lecturerId = params.id as string;
  const sessionId = searchParams.get('session_id');

  const [lecturer, setLecturer] = useState<Lecturer | null>(null);
  const [timeslots, setTimeslots] = useState<TimeSlot[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'availability' | 'assignments'>('details');

  useEffect(() => {
    if (lecturerId && sessionId) {
      fetchLecturer();
      fetchTimeSlots();
      fetchAvailability();
    }
  }, [lecturerId, sessionId]);

  const fetchLecturer = async () => {
    try {
      const response = await apiClient.get(`/lecturers/${lecturerId}`);
      setLecturer(response.data.data);
    } catch (error) {
      console.error('Failed to fetch lecturer:', error);
    }
  };

  const fetchTimeSlots = async () => {
    if (!sessionId) return;
    try {
      const response = await apiClient.get(`/timeslots?session_id=${sessionId}`);
      setTimeslots(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch timeslots:', error);
    }
  };

  const fetchAvailability = async () => {
    if (!sessionId) return;
    try {
      const response = await apiClient.get(`/blocked-times?session_id=${sessionId}&scope=lecturer&scope_id=${lecturerId}`);
      setBlockedTimes(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCellClick = async (day: Day, timeslotId: string) => {
    if (!sessionId) return;

    const existing = blockedTimes.find(
      (bt) => bt.day === day && bt.timeslot_id === timeslotId
    );

    const blockedSlots = existing
      ? blockedTimes.filter((bt) => !(bt.day === day && bt.timeslot_id === timeslotId))
      : [...blockedTimes, { day, timeslot_id: timeslotId } as BlockedTime];

    try {
      await apiClient.put(`/lecturers/${lecturerId}/availability`, {
        session_id: sessionId,
        blocked_slots: blockedSlots.map((bt) => ({
          day: bt.day,
          timeslot_id: bt.timeslot_id,
        })),
      });
      fetchAvailability();
    } catch (error) {
      console.error('Failed to update availability:', error);
      alert('Failed to update availability');
    }
  };

  const isBlocked = (day: Day, timeslotId: string): boolean => {
    return blockedTimes.some((bt) => bt.day === day && bt.timeslot_id === timeslotId);
  };

  if (loading) {
    return <div className="container mx-auto p-6">Loading...</div>;
  }

  if (!lecturer) {
    return <div className="container mx-auto p-6">Lecturer not found</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">{lecturer.name}</h1>

      <div className="mb-4 border-b">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 ${activeTab === 'details' ? 'border-b-2 border-blue-600' : ''}`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('availability')}
            className={`px-4 py-2 ${activeTab === 'availability' ? 'border-b-2 border-blue-600' : ''}`}
          >
            Availability
          </button>
          <button
            onClick={() => setActiveTab('assignments')}
            className={`px-4 py-2 ${activeTab === 'assignments' ? 'border-b-2 border-blue-600' : ''}`}
          >
            Assignments
          </button>
        </div>
      </div>

      {activeTab === 'details' && (
        <div className="space-y-4">
          <div>
            <strong>Name:</strong> {lecturer.name}
          </div>
          <div>
            <strong>Email:</strong> {lecturer.email || '-'}
          </div>
          <div>
            <strong>Department:</strong> {lecturer.department || '-'}
          </div>
        </div>
      )}

      {activeTab === 'availability' && (
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
                  <td className="px-4 py-2 border font-medium">{timeslot.label}</td>
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

      {activeTab === 'assignments' && (
        <div>
          <p>Assignments feature coming soon...</p>
        </div>
      )}
    </div>
  );
}

export default function LecturerDetailsPage() {
  return (
    <DashboardWrapper>
      <Suspense fallback={<div>Loading...</div>}>
        <LecturerDetailsContent />
      </Suspense>
    </DashboardWrapper>
  );
}

