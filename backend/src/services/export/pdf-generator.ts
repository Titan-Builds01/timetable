import PDFDocument from 'pdfkit';
import { ScheduledEvent, TimeSlot, Room, Event, CourseOffering, Day } from '../../../shared/types';

const DAYS: Day[] = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
const YEAR = new Date().getFullYear();
const COPYRIGHT = `© ${YEAR} Sulva Solutions. All rights reserved.`;

export class PDFGenerator {
  static generateTimetable(
    scheduled: ScheduledEvent[],
    timeslots: TimeSlot[],
    rooms: Room[],
    events: Event[],
    offerings: CourseOffering[],
    viewType: 'level' | 'lecturer' | 'room' = 'level',
    filterId?: string
  ): PDFDocument {
    const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' });

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

    const getEventsForCell = (day: Day, timeslotId: string): ScheduledEvent[] => {
      return scheduled.filter(
        (se) => se.day === day && (se.timeslot_id === timeslotId || se.second_timeslot_id === timeslotId)
      );
    };

    // Title
    doc.fontSize(18).text('Timetable', { align: 'center' });
    doc.moveDown();

    // Table setup
    const cellWidth = (doc.page.width - 100) / 6; // 5 days + 1 for time slot
    const cellHeight = 30;
    const startY = doc.y;

    // Header row
    doc.fontSize(10).font('Helvetica-Bold');
    let x = 50;
    doc.text('Time Slot', x, startY, { width: cellWidth, align: 'center' });
    x += cellWidth;

    for (const day of DAYS) {
      doc.text(day, x, startY, { width: cellWidth, align: 'center' });
      x += cellWidth;
    }

    // Data rows
    let currentY = startY + cellHeight;
    doc.font('Helvetica').fontSize(8);

    for (const timeslot of timeslots) {
      // Time slot label
      doc.text(timeslot.label, 50, currentY, { width: cellWidth, align: 'center' });

      // Day cells
      x = 50 + cellWidth;
      for (const day of DAYS) {
        const cellEvents = getEventsForCell(day, timeslot.id);
        let cellY = currentY + 5;

        for (const scheduledEvent of cellEvents) {
          const event = getEventForScheduled(scheduledEvent);
          const offering = event ? getOfferingForEvent(event) : null;

          if (offering) {
            doc.text(offering.course_code, x, cellY, { width: cellWidth - 10, align: 'left' });
            cellY += 10;
            doc.fontSize(7).text(getRoomName(scheduledEvent.room_id), x, cellY, { width: cellWidth - 10, align: 'left' });
            doc.fontSize(8);
            cellY += 10;
          } else {
            doc.text(`Event ${scheduledEvent.event_id}`, x, cellY, { width: cellWidth - 10, align: 'left' });
            cellY += 10;
          }

          if (cellY > currentY + cellHeight - 5) break; // Prevent overflow
        }

        x += cellWidth;
      }

      currentY += cellHeight;

      // Page break if needed
      if (currentY > doc.page.height - 80) {
        // Add footer before new page
        doc.fontSize(8).fillColor('gray').text(COPYRIGHT, 50, doc.page.height - 40, {
          align: 'right',
          width: doc.page.width - 100,
        });
        doc.addPage();
        currentY = 50;
        doc.fontSize(10).fillColor('black');
      }
    }

    // Footer on last page
    doc.fontSize(8).fillColor('gray').text(COPYRIGHT, 50, doc.page.height - 40, {
      align: 'right',
      width: doc.page.width - 100,
    });

    return doc;
  }

  static async generateToBuffer(
    scheduled: ScheduledEvent[],
    timeslots: TimeSlot[],
    rooms: Room[],
    events: Event[],
    offerings: CourseOffering[],
    viewType: 'level' | 'lecturer' | 'room' = 'level',
    filterId?: string
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = this.generateTimetable(scheduled, timeslots, rooms, events, offerings, viewType, filterId);
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.end();
    });
  }
}

