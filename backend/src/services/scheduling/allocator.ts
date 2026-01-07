import { Event, TimeSlot, Room, BlockedTime, ConstraintsConfig, ScheduleRun, ScheduledEvent, UnscheduledEvent, Lock, Day } from '../../../shared/types';
import { CandidateGenerator } from './candidate-generator';
import { DifficultyScorer } from './difficulty-scorer';
import { SoftScorer } from './soft-scorer';
import { OccupancyTracker, CandidatePlacement } from './occupancy-tracker';
import { CourseOfferingModel } from '../../models/CourseOffering';

export interface ScheduleResult {
  scheduled: ScheduledEvent[];
  unscheduled: UnscheduledEvent[];
  softScore: number;
  scheduledCount: number;
  unscheduledCount: number;
}

export class Allocator {
  static async generateSchedule(
    sessionId: string,
    events: Event[],
    timeslots: TimeSlot[],
    rooms: Room[],
    blockedTimes: BlockedTime[],
    locks: Lock[],
    constraints: ConstraintsConfig,
    seed: number | null,
    candidateLimit: number
  ): Promise<ScheduleResult> {
    // Pre-place locked events
    const occupancy = new OccupancyTracker(locks, []);
    const scheduled: ScheduledEvent[] = [];
    const unscheduled: UnscheduledEvent[] = [];

    // Convert locks to scheduled events
    for (const lock of locks) {
      scheduled.push({
        id: '', // Will be set by DB
        run_id: '', // Will be set later
        event_id: lock.event_id,
        day: lock.day,
        timeslot_id: lock.timeslot_id,
        second_timeslot_id: lock.second_timeslot_id || null,
        room_id: lock.room_id,
        created_at: new Date().toISOString(),
      });
    }

    // Get offering levels for events
    const offeringLevels = new Map<string, number>();
    for (const event of events) {
      if (!offeringLevels.has(event.offering_id)) {
        const offering = await CourseOfferingModel.findById(event.offering_id);
        if (offering) {
          offeringLevels.set(event.offering_id, offering.level);
        }
      }
    }

    // Filter out locked events
    const lockedEventIds = new Set(locks.map((l) => l.event_id));
    const eventsToSchedule = events.filter((e) => !lockedEventIds.has(e.id));

    // Get lecturer event counts
    const lecturerEventCounts = new Map<string, number>();
    for (const event of eventsToSchedule) {
      if (event.lecturer_id) {
        lecturerEventCounts.set(
          event.lecturer_id,
          (lecturerEventCounts.get(event.lecturer_id) || 0) + 1
        );
      }
    }

    // Sort events by difficulty
    const eventsWithDifficulty = await Promise.all(
      eventsToSchedule.map(async (event) => {
        const candidates = CandidateGenerator.generate(
          event,
          timeslots,
          rooms,
          blockedTimes,
          constraints,
          offeringLevels.get(event.offering_id) || 300,
          event.lecturer_id || null
        );

        const difficulty = DifficultyScorer.compute(
          event,
          candidates.length,
          lecturerEventCounts.get(event.lecturer_id || '') || 0
        );

        return { event, difficulty, candidates };
      })
    );

    eventsWithDifficulty.sort((a, b) => b.difficulty - a.difficulty);

    // Greedy placement
    for (const { event, candidates } of eventsWithDifficulty) {
      const level = offeringLevels.get(event.offering_id) || 300;

      // Filter candidates by hard constraints
      const feasibleCandidates = candidates.filter((c) =>
        occupancy.isFeasible(c, event, level)
      );

      if (feasibleCandidates.length === 0) {
        unscheduled.push({
          id: '',
          run_id: '',
          event_id: event.id,
          reason: 'No feasible candidates (all slots blocked or conflicting)',
          created_at: new Date().toISOString(),
        });
        continue;
      }

      // Rank by soft penalty
      const candidatesWithPenalty = feasibleCandidates.map((c) => ({
        candidate: c,
        penalty: SoftScorer.computePenalty(
          c,
          event,
          scheduled,
          constraints,
          timeslots,
          event.offering_id
        ),
      }));

      candidatesWithPenalty.sort((a, b) => a.penalty - b.penalty);

      // Try top-K candidates
      const topCandidates = candidatesWithPenalty.slice(0, candidateLimit);
      let placed = false;

      for (const { candidate } of topCandidates) {
        if (occupancy.canPlace(candidate, event, level)) {
          occupancy.place(candidate, event, level);
          scheduled.push({
            id: '',
            run_id: '',
            event_id: event.id,
            day: candidate.day,
            timeslot_id: candidate.timeslot_id,
            second_timeslot_id: candidate.second_timeslot_id || null,
            room_id: candidate.room_id,
            created_at: new Date().toISOString(),
          });
          placed = true;
          break;
        }
      }

      if (!placed) {
        // Attempt repair (depth 1)
        const repairResult = await this.attemptRepair(
          event,
          topCandidates.map((c) => c.candidate),
          scheduled,
          occupancy,
          level,
          timeslots,
          rooms,
          blockedTimes,
          constraints,
          offeringLevels
        );

        if (repairResult.success) {
          scheduled.push(...repairResult.newPlacements);
          if (repairResult.removedIndex >= 0) {
            scheduled.splice(repairResult.removedIndex, 1);
          }
          placed = true;
        }
      }

      if (!placed) {
        unscheduled.push({
          id: '',
          run_id: '',
          event_id: event.id,
          reason: this.determineReason(event, feasibleCandidates, occupancy, level),
          created_at: new Date().toISOString(),
        });
      }
    }

    const softScore = SoftScorer.computeTotalScore(scheduled, constraints);

    return {
      scheduled,
      unscheduled,
      softScore,
      scheduledCount: scheduled.length,
      unscheduledCount: unscheduled.length,
    };
  }

  private static async attemptRepair(
    event: Event,
    candidates: CandidatePlacement[],
    scheduled: ScheduledEvent[],
    occupancy: OccupancyTracker,
    level: number,
    timeslots: TimeSlot[],
    rooms: Room[],
    blockedTimes: BlockedTime[],
    constraints: ConstraintsConfig,
    offeringLevels: Map<string, number>
  ): Promise<{
    success: boolean;
    newPlacements: ScheduledEvent[];
    removedIndex: number;
  }> {
    // Find a conflicting scheduled event
    for (let i = 0; i < scheduled.length; i++) {
      const scheduledEvent = scheduled[i];
      const scheduledLevel = offeringLevels.get(scheduledEvent.event_id) || 300;

      // Try to move this conflicting event
      const conflictingCandidate: CandidatePlacement = {
        day: scheduledEvent.day,
        timeslot_id: scheduledEvent.timeslot_id,
        second_timeslot_id: scheduledEvent.second_timeslot_id || undefined,
        room_id: scheduledEvent.room_id,
      };

      // Unplace the conflicting event
      // Note: We'd need the Event object for this scheduled event
      // For now, simplified repair
      for (const candidate of candidates) {
        if (occupancy.canPlace(candidate, event, level)) {
          return {
            success: true,
            newPlacements: [
              {
                id: '',
                run_id: '',
                event_id: event.id,
                day: candidate.day,
                timeslot_id: candidate.timeslot_id,
                second_timeslot_id: candidate.second_timeslot_id || null,
                room_id: candidate.room_id,
                created_at: new Date().toISOString(),
              },
            ],
            removedIndex: -1,
          };
        }
      }
    }

    return { success: false, newPlacements: [], removedIndex: -1 };
  }

  private static determineReason(
    event: Event,
    candidates: CandidatePlacement[],
    occupancy: OccupancyTracker,
    level: number
  ): string {
    if (candidates.length === 0) {
      return 'No valid time slots or rooms available';
    }

    // Check specific reasons
    const hasRoom = candidates.some((c) => c.room_id);
    if (!hasRoom) {
      return 'No suitable room type available';
    }

    return 'All candidate placements conflict with existing schedule';
  }
}

