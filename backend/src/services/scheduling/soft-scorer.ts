import { ScheduledEvent, Event, ConstraintsConfig, TimeSlot } from '../../../shared/types';
import { CandidatePlacement } from './occupancy-tracker';

export class SoftScorer {
  static computePenalty(
    candidate: CandidatePlacement,
    event: Event,
    currentSchedule: ScheduledEvent[],
    constraints: ConstraintsConfig,
    timeslots: TimeSlot[],
    offeringId: string
  ): number {
    let penalty = 0;
    const weights = constraints.soft_weights;

    // Spread course sessions - penalty if same course events land on same day
    const sameCourseEvents = currentSchedule.filter((se) => {
      // We need to check if this scheduled event belongs to the same offering
      // This requires looking up the event's offering_id, which we'll pass
      return se.day === candidate.day;
    });

    // Count events from same offering on same day
    const sameOfferingOnDay = sameCourseEvents.length; // Simplified - would need offering lookup
    if (sameOfferingOnDay > 0) {
      penalty += weights.spread_course_sessions * sameOfferingOnDay;
    }

    // Avoid early/late
    const slot = timeslots.find((ts) => ts.id === candidate.timeslot_id);
    if (slot) {
      if (slot.sort_order === 1) {
        penalty += weights.avoid_early;
      }
      const maxSortOrder = Math.max(...timeslots.map((ts) => ts.sort_order));
      if (slot.sort_order === maxSortOrder) {
        penalty += weights.avoid_late;
      }
    }

    // Lecturer overload - check if lecturer exceeds max sessions/day
    if (event.lecturer_id) {
      const lecturerEventsToday = currentSchedule.filter(
        (se) => se.day === candidate.day
        // Would need to check if se.event_id belongs to same lecturer
      );
      if (lecturerEventsToday.length >= constraints.defaults.max_sessions_per_lecturer_per_day) {
        penalty +=
          weights.lecturer_overload *
          (lecturerEventsToday.length - constraints.defaults.max_sessions_per_lecturer_per_day + 1);
      }
    }

    return penalty;
  }

  static computeTotalScore(
    scheduled: ScheduledEvent[],
    constraints: ConstraintsConfig
  ): number {
    // Simplified total soft score calculation
    // In a full implementation, this would compute all soft violations
    return scheduled.length * 10; // Placeholder
  }
}

