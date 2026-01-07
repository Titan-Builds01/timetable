'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { Event, Session, CourseOffering } from '@/lib/types';
import DashboardWrapper from '@/components/layout/DashboardWrapper';

function EventsContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [sessions, setSessions] = useState<Session[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (sessionId) {
      fetchEvents();
      fetchOfferings();
    }
  }, [sessionId]);

  const fetchSessions = async () => {
    try {
      const response = await apiClient.get('/sessions');
      setSessions(response.data.data || []);
      if (!sessionId && response.data.data?.length > 0) {
        const activeSession = response.data.data.find((s: Session) => s.is_active);
        if (activeSession) {
          window.location.href = `/events?session_id=${activeSession.id}`;
        }
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  const fetchOfferings = async () => {
    if (!sessionId) return;
    try {
      const response = await apiClient.get(`/course-offerings?session_id=${sessionId}`);
      setOfferings(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch offerings:', error);
    }
  };

  const fetchEvents = async () => {
    if (!sessionId) return;
    try {
      setLoading(true);
      const response = await apiClient.get(`/events?session_id=${sessionId}`);
      setEvents(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!sessionId) return;

    if (
      !confirm(
        'This will regenerate all events from matched offerings. Existing events will be deleted. Continue?'
      )
    ) {
      return;
    }

    try {
      setGenerating(true);
      const response = await apiClient.post('/events/generate', { session_id: sessionId });
      alert(response.data.message);
      fetchEvents();
    } catch (error: any) {
      console.error('Failed to generate events:', error);
      alert(error.response?.data?.error || 'Failed to generate events');
    } finally {
      setGenerating(false);
    }
  };

  const getOfferingTitle = (offeringId: string): string => {
    const offering = offerings.find((o) => o.id === offeringId);
    return offering ? `${offering.course_code}: ${offering.original_title}` : offeringId;
  };

  if (!sessionId) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-4">Events</h1>
        <p>Please select a session to view events.</p>
      </div>
    );
  }

  const matchedOfferingsCount = offerings.filter(
    (o) => o.match_status === 'auto_matched' || o.match_status === 'manual_matched'
  ).length;

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Events</h1>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {generating ? 'Generating...' : 'Generate Events'}
        </button>
      </div>

      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <strong>Matched Offerings:</strong> {matchedOfferingsCount}
          </div>
          <div>
            <strong>Total Events:</strong> {events.length}
          </div>
          <div>
            <strong>Events per Offering:</strong>{' '}
            {matchedOfferingsCount > 0
              ? (events.length / matchedOfferingsCount).toFixed(2)
              : '0'}
          </div>
        </div>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : events.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No events generated yet.</p>
          <p className="text-sm text-gray-400">
            Click "Generate Events" to expand matched course offerings into schedulable events.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 text-left">Offering</th>
                <th className="px-4 py-2 text-left">Event Index</th>
                <th className="px-4 py-2 text-left">Duration (Slots)</th>
                <th className="px-4 py-2 text-left">Room Type Required</th>
                <th className="px-4 py-2 text-left">Lecturer ID</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-t">
                  <td className="px-4 py-2">{getOfferingTitle(event.offering_id)}</td>
                  <td className="px-4 py-2">{event.event_index}</td>
                  <td className="px-4 py-2">{event.duration_slots}</td>
                  <td className="px-4 py-2">{event.room_type_required}</td>
                  <td className="px-4 py-2">{event.lecturer_id || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function EventsPage() {
  return (
    <DashboardWrapper>
      <Suspense fallback={<div>Loading...</div>}>
        <EventsContent />
      </Suspense>
    </DashboardWrapper>
  );
}

