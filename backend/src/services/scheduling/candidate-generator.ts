import { Event, TimeSlot, Room, BlockedTime, ConstraintsConfig, Day } from '../../../shared/types';
import { CandidatePlacement } from './occupancy-tracker';

export class CandidateGenerator {
  static generate(
    event: Event,
    timeslots: TimeSlot[],
    rooms: Room[],
    blockedTimes: BlockedTime[],
    constraints: ConstraintsConfig,
    level: number,
    lecturerId: string | null
  ): CandidatePlacement[] {
    const candidates: CandidatePlacement[] = [];
    const allowedDays = constraints.allowed_days;

    // Filter blocked times for this event's scope
    const relevantBlocks = blockedTimes.filter((bt) => {
      if (bt.scope === 'global') return true;
      if (bt.scope === 'level' && bt.scope_id === level.toString()) return true;
      if (bt.scope === 'lecturer' && bt.scope_id === lecturerId) return true;
      if (bt.scope === 'room') {
        // Will be filtered per room
        return false;
      }
      return false;
    });

    const isBlocked = (day: Day, timeslotId: string): boolean => {
      return relevantBlocks.some((bt) => bt.day === day && bt.timeslot_id === timeslotId);
    };

    const isRoomBlocked = (roomId: string, day: Day, timeslotId: string): boolean => {
      return blockedTimes.some(
        (bt) => bt.scope === 'room' && bt.scope_id === roomId && bt.day === day && bt.timeslot_id === timeslotId
      );
    };

    if (event.duration_slots === 1) {
      // Single slot event
      for (const day of allowedDays) {
        for (const slot of timeslots) {
          if (isBlocked(day, slot.id)) continue;

          const validRooms = rooms.filter(
            (r) =>
              r.room_type === event.room_type_required &&
              !isRoomBlocked(r.id, day, slot.id)
          );

          for (const room of validRooms) {
            candidates.push({
              day,
              timeslot_id: slot.id,
              room_id: room.id,
            });
          }
        }
      }
    } else {
      // Two-slot event - only allow consecutive pairs
      const consecutivePairs = constraints.consecutive_pairs;

      for (const [slot1Label, slot2Label] of consecutivePairs) {
        const slot1 = timeslots.find((ts) => ts.label.includes(slot1Label) || ts.sort_order.toString() === slot1Label.replace('TS', ''));
        const slot2 = timeslots.find((ts) => ts.label.includes(slot2Label) || ts.sort_order.toString() === slot2Label.replace('TS', ''));

        if (!slot1 || !slot2) continue;

        for (const day of allowedDays) {
          if (isBlocked(day, slot1.id) || isBlocked(day, slot2.id)) continue;
          if (isBlocked(day, slot1.id) || isBlocked(day, slot2.id)) continue;

          const validRooms = rooms.filter(
            (r) =>
              r.room_type === event.room_type_required &&
              !isRoomBlocked(r.id, day, slot1.id) &&
              !isRoomBlocked(r.id, day, slot2.id)
          );

          for (const room of validRooms) {
            candidates.push({
              day,
              timeslot_id: slot1.id,
              second_timeslot_id: slot2.id,
              room_id: room.id,
            });
          }
        }
      }
    }

    return candidates;
  }
}

