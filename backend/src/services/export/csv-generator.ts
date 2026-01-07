import { ScheduledEvent, TimeSlot, Room, Event, CourseOffering } from '../../../shared/types';

const YEAR = new Date().getFullYear();
const COPYRIGHT = `© ${YEAR} Sulva Solutions. All rights reserved.`;

export class CSVGenerator {
  static generate(
    scheduled: ScheduledEvent[],
    timeslots: TimeSlot[],
    rooms: Room[],
    events: Event[],
    offerings: CourseOffering[]
  ): string {
    // Helper functions
    const getEventForScheduled = (se: ScheduledEvent): Event | null => {
      return events.find((e) => e.id === se.event_id) || null;
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

    // CSV Header (include a comment line with copyright/branding)
    const metadata = [`# Timetable Export - Sulva Solutions`, `# ${COPYRIGHT}`];
    const headers = [
      'Event ID',
      'Course Code',
      'Course Title',
      'Day',
      'Time Slot',
      'Second Time Slot',
      'Room',
      'Lecturer ID',
    ];

    const rows = [...metadata, headers.join(',')];

    // CSV Rows
    for (const scheduledEvent of scheduled) {
      const event = getEventForScheduled(scheduledEvent);
      const offering = event ? getOfferingForEvent(event) : null;

      const row = [
        scheduledEvent.event_id,
        offering?.course_code || '',
        offering?.original_title || '',
        scheduledEvent.day,
        getTimeslotLabel(scheduledEvent.timeslot_id),
        scheduledEvent.second_timeslot_id ? getTimeslotLabel(scheduledEvent.second_timeslot_id) : '',
        getRoomName(scheduledEvent.room_id),
        event?.lecturer_id || '',
      ];

      // Escape commas and quotes
      const escapedRow = row.map((cell) => {
        const str = String(cell);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });

      rows.push(escapedRow.join(','));
    }

    return rows.join('\n');
  }
}

