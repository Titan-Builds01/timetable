'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { Room, TimeSlot, BlockedTime, Day } from '../../../../../shared/types';
import DashboardWrapper from '@/components/layout/DashboardWrapper';

const DAYS: Day[] = ['MON', 'TUE', 'WED', 'THU', 'FRI'];

function RoomDetailsContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params.id as string;
  const sessionId = searchParams.get('session_id');

  const [room, setRoom] = useState<Room | null>(null);
  const [timeslots, setTimeslots] = useState<TimeSlot[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (roomId && sessionId) {
      fetchRoom();
      fetchTimeSlots();
      fetchAvailability();
    }
  }, [roomId, sessionId]);

  const fetchRoom = async () => {
    try {
      const response = await apiClient.get(`/rooms/${roomId}`);
      setRoom(response.data.data);
    } catch (error) {
      console.error('Failed to fetch room:', error);
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
      const response = await apiClient.get(`/blocked-times?session_id=${sessionId}&scope=room&scope_id=${roomId}`);
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
      await apiClient.put(`/rooms/${roomId}/availability`, {
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

  if (!room) {
    return <div className="container mx-auto p-6">Room not found</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">{room.name}</h1>

      <div className="mb-6 space-y-2">
        <div>
          <strong>Type:</strong> {room.room_type}
        </div>
        <div>
          <strong>Capacity:</strong> {room.capacity}
        </div>
        <div>
          <strong>Location:</strong> {room.location || '-'}
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-4">Availability</h2>
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
    </div>
  );
}

export default function RoomDetailsPage() {
  return (
    <DashboardWrapper>
      <Suspense fallback={<div>Loading...</div>}>
        <RoomDetailsContent />
      </Suspense>
    </DashboardWrapper>
  );
}

