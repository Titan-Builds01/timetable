'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { ScheduledEvent, TimeSlot, Room, Event, CourseOffering, Day, Lock } from '@/lib/types';
import DashboardWrapper from '@/components/layout/DashboardWrapper';
import Drawer from '@/components/ui/Drawer';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import { Lock as LockIcon, Unlock, Calendar, Clock, MapPin, BookOpen } from 'lucide-react';

const DAYS: Day[] = ['MON', 'TUE', 'WED', 'THU', 'FRI'];

function TimetableContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const runId = params.runId as string;
  const sessionId = searchParams.get('session_id');

  const [scheduled, setScheduled] = useState<ScheduledEvent[]>([]);
  const [timeslots, setTimeslots] = useState<TimeSlot[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [locks, setLocks] = useState<Lock[]>([]);
  const [viewType, setViewType] = useState<'level' | 'lecturer' | 'room'>('level');
  const [filterId, setFilterId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<ScheduledEvent | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);

  useEffect(() => {
    if (runId && sessionId) {
      fetchData();
    }
  }, [runId, sessionId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [timetableRes, timeslotsRes, roomsRes, eventsRes, offeringsRes, locksRes] = await Promise.all([
        apiClient.get(`/runs/${runId}/timetable?view=${viewType}&filter_id=${filterId}`),
        apiClient.get(`/timeslots?session_id=${sessionId}`),
        apiClient.get(`/rooms?session_id=${sessionId}`),
        apiClient.get(`/events?session_id=${sessionId}`),
        apiClient.get(`/course-offerings?session_id=${sessionId}`),
        apiClient.get(`/locks?session_id=${sessionId}`),
      ]);

      setScheduled(timetableRes.data.data || []);
      setTimeslots(timeslotsRes.data.data || []);
      setRooms(roomsRes.data.data || []);
      setEvents(eventsRes.data.data || []);
      setOfferings(offeringsRes.data.data || []);
      setLocks(locksRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch timetable data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventForScheduled = (scheduledEvent: ScheduledEvent): Event | null => {
    return events.find((e) => e.id === scheduledEvent.event_id) || null;
  };

  const getOfferingForEvent = (event: Event): CourseOffering | null => {
    return offerings.find((o) => o.id === event.offering_id) || null;
  };

  const getRoomName = (roomId: string): string => {
    return rooms.find((r) => r.id === roomId)?.name || roomId;
  };

  const getTimeslotLabel = (timeslotId: string): string => {
    return timeslots.find((ts) => ts.id === timeslotId)?.label || timeslotId;
  };

  const getEventsForCell = (day: Day, timeslotId: string): ScheduledEvent[] => {
    return scheduled.filter(
      (se) => se.day === day && (se.timeslot_id === timeslotId || se.second_timeslot_id === timeslotId)
    );
  };

  const isLocked = (eventId: string): boolean => {
    return locks.some((l) => l.event_id === eventId);
  };

  const getLockForEvent = (eventId: string): Lock | null => {
    return locks.find((l) => l.event_id === eventId) || null;
  };

  const handleLock = async (scheduledEvent: ScheduledEvent) => {
    if (!sessionId) return;

    const event = getEventForScheduled(scheduledEvent);
    if (!event) return;

    try {
      await apiClient.post('/locks', {
        session_id: sessionId,
        event_id: event.id,
        day: scheduledEvent.day,
        timeslot_id: scheduledEvent.timeslot_id,
        second_timeslot_id: scheduledEvent.second_timeslot_id || null,
        room_id: scheduledEvent.room_id,
      });

      alert('Event locked successfully');
      fetchData();
    } catch (error: any) {
      console.error('Failed to lock event:', error);
      alert(error.response?.data?.error || 'Failed to lock event');
    }
  };

  const handleUnlock = async (eventId: string) => {
    const lock = getLockForEvent(eventId);
    if (!lock) return;

    try {
      await apiClient.delete(`/locks/${lock.id}`);
      alert('Event unlocked successfully');
      fetchData();
    } catch (error: any) {
      console.error('Failed to unlock event:', error);
      alert(error.response?.data?.error || 'Failed to unlock event');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500 dark:text-gray-400">Loading timetable...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Timetable Viewer</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            View and manage scheduled events
          </p>
        </div>
        <Select
          value={viewType}
          onChange={(e) => {
            setViewType(e.target.value as any);
            setFilterId('');
          }}
          options={[
            { value: 'level', label: 'By Level' },
            { value: 'lecturer', label: 'By Lecturer' },
            { value: 'room', label: 'By Room' },
          ]}
          className="w-48"
        />
      </div>

      <Card className="overflow-x-auto">
        <div className="min-w-full">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Time Slot
                </th>
                {DAYS.map((day) => (
                  <th key={day} className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-l border-gray-200 dark:border-gray-700">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {timeslots.map((timeslot) => (
                <tr key={timeslot.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900/30">
                    {timeslot.label}
                  </td>
                  {DAYS.map((day) => {
                    const cellEvents = getEventsForCell(day, timeslot.id);
                    return (
                      <td key={`${day}-${timeslot.id}`} className="px-3 py-3 border-l border-gray-200 dark:border-gray-700 min-w-[220px] align-top">
                        <div className="space-y-2">
                          {cellEvents.map((scheduledEvent) => {
                            const event = getEventForScheduled(scheduledEvent);
                            const offering = event ? getOfferingForEvent(event) : null;
                            const locked = event ? isLocked(event.id) : false;
                            return (
                              <Card
                                key={scheduledEvent.id}
                                className={`
                                  p-3 cursor-pointer transition-all duration-200 hover:shadow-md
                                  ${locked 
                                    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700' 
                                    : 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/30'
                                  }
                                `}
                                onClick={() => {
                                  setSelectedEvent(scheduledEvent);
                                  setShowDrawer(true);
                                }}
                              >
                                {offering ? (
                                  <>
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                                        {offering.course_code}
                                      </span>
                                      {locked && (
                                        <LockIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {getRoomName(scheduledEvent.room_id)}
                                    </div>
                                  </>
                                ) : (
                                  <div className="text-xs text-gray-600 dark:text-gray-400">
                                    Event {scheduledEvent.event_id}
                                  </div>
                                )}
                              </Card>
                            );
                          })}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Drawer
        isOpen={showDrawer}
        onClose={() => {
          setShowDrawer(false);
          setSelectedEvent(null);
        }}
        title="Event Details"
      >
        {selectedEvent && (() => {
          const event = getEventForScheduled(selectedEvent);
          const offering = event ? getOfferingForEvent(event) : null;
          const locked = event ? isLocked(event.id) : false;
          const lock = event ? getLockForEvent(event.id) : null;

          return (
            <div className="space-y-6">
              {offering && (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Course</p>
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                      <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        {offering.course_code}
                      </p>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {offering.original_title}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Day</p>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <p className="text-base text-gray-900 dark:text-gray-100">{selectedEvent.day}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Time Slot</p>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <p className="text-base text-gray-900 dark:text-gray-100">
                          {getTimeslotLabel(selectedEvent.timeslot_id)}
                          {selectedEvent.second_timeslot_id && (
                            <span> + {getTimeslotLabel(selectedEvent.second_timeslot_id)}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Room</p>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <p className="text-base text-gray-900 dark:text-gray-100">
                          {getRoomName(selectedEvent.room_id)}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Status</p>
                      <Badge variant={locked ? 'warning' : 'default'}>
                        {locked ? (
                          <>
                            <LockIcon className="h-3 w-3 mr-1" />
                            Locked
                          </>
                        ) : (
                          'Unlocked'
                        )}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              {event && (
                <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowDrawer(false);
                      setSelectedEvent(null);
                    }}
                  >
                    Close
                  </Button>
                  {locked && lock ? (
                    <Button
                      variant="danger"
                      onClick={() => {
                        handleUnlock(event.id);
                        setShowDrawer(false);
                        setSelectedEvent(null);
                      }}
                    >
                      <Unlock className="h-4 w-4 mr-2" />
                      Unlock
                    </Button>
                  ) : (
                    <Button
                      variant="warning"
                      onClick={() => {
                        handleLock(selectedEvent);
                        setShowDrawer(false);
                        setSelectedEvent(null);
                      }}
                    >
                      <LockIcon className="h-4 w-4 mr-2" />
                      Lock
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })()}
      </Drawer>
    </div>
  );
}

export default function TimetablePage() {
  return (
    <DashboardWrapper>
      <Suspense fallback={<div>Loading...</div>}>
        <TimetableContent />
      </Suspense>
    </DashboardWrapper>
  );
}

