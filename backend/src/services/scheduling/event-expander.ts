import { CourseOfferingModel } from '../../models/CourseOffering';
import { LecturerAssignmentModel } from '../../models/LecturerAssignment';
import { EventModel } from '../../models/Event';
import { ConstraintsModel } from '../../models/Constraints';
import { CourseOffering, Event, ConstraintsConfig } from '../../../shared/types';

export class EventExpander {
  static async expandOfferingToEvents(
    offering: CourseOffering,
    constraints: ConstraintsConfig,
    sessionId: string
  ): Promise<Event[]> {
    const unitMapping = constraints.unit_mapping[offering.type] || constraints.unit_mapping.lecture;
    const mapping = unitMapping[offering.credit_units.toString()] || unitMapping.default;

    if (!mapping || mapping.length === 0) {
      // Default: 1 event per unit
      const defaultMapping = Array(offering.credit_units)
        .fill(null)
        .map(() => ({ duration_slots: 1 }));
      return this.createEvents(offering, defaultMapping, sessionId);
    }

    return this.createEvents(offering, mapping, sessionId);
  }

  private static async createEvents(
    offering: CourseOffering,
    mapping: Array<{ duration_slots: number; preferred_pair?: string[] }>,
    sessionId: string
  ): Promise<Event[]> {
    // Get primary lecturer (first assignment with highest share)
    const assignments = await LecturerAssignmentModel.findByOffering(offering.id);
    const primaryLecturer =
      assignments.length > 0
        ? assignments.sort((a, b) => b.share - a.share)[0].lecturer_id
        : null;

    // Determine room type required
    const roomTypeRequired =
      offering.type === 'lab' ? 'lab' : offering.type === 'tutorial' ? 'lecture_room' : 'lecture_room';

    const events: Event[] = [];

    for (let index = 0; index < mapping.length; index++) {
      const eventConfig = mapping[index];
      const event = await EventModel.create({
        session_id: sessionId,
        offering_id: offering.id,
        lecturer_id: primaryLecturer,
        event_index: index,
        duration_slots: eventConfig.duration_slots,
        room_type_required: roomTypeRequired as any,
      });

      events.push(event);
    }

    return events;
  }

  static async expandAllOfferings(sessionId: string): Promise<{ count: number; events: Event[] }> {
    // Get constraints
    let constraints = await ConstraintsModel.findBySession(sessionId);
    if (!constraints) {
      constraints = await ConstraintsModel.getDefaultConstraints();
      await ConstraintsModel.createOrUpdate(sessionId, constraints);
    }

    // Get all matched offerings
    const offerings = await CourseOfferingModel.findBySession(sessionId);
    const matchedOfferings = offerings.filter(
      (o) => o.match_status === 'auto_matched' || o.match_status === 'manual_matched'
    );

    // Delete existing events for this session
    await EventModel.deleteBySession(sessionId);

    // Expand each offering
    const allEvents: Event[] = [];
    for (const offering of matchedOfferings) {
      const events = await this.expandOfferingToEvents(offering, constraints, sessionId);
      allEvents.push(...events);
    }

    return {
      count: allEvents.length,
      events: allEvents,
    };
  }
}

