import { Event, ScheduledEvent, Lock, Day } from '../../../shared/types';

export interface CandidatePlacement {
  day: Day;
  timeslot_id: string;
  second_timeslot_id?: string;
  room_id: string;
}

export class OccupancyTracker {
  private lecturerOccupancy: Map<string, Set<string>> = new Map(); // lecturer_id -> Set<day:timeslot_id>
  private levelOccupancy: Map<number, Set<string>> = new Map(); // level -> Set<day:timeslot_id>
  private roomOccupancy: Map<string, Set<string>> = new Map(); // room_id -> Set<day:timeslot_id>

  constructor(locks: Lock[] = [], scheduled: ScheduledEvent[] = []) {
    // Initialize with locks
    for (const lock of locks) {
      this.placeLock(lock);
    }

    // Initialize with existing scheduled events
    for (const scheduled of scheduled) {
      this.placeScheduled(scheduled);
    }
  }

  private placeLock(lock: Lock): void {
    const key = `${lock.day}:${lock.timeslot_id}`;
    if (lock.second_timeslot_id) {
      const key2 = `${lock.day}:${lock.second_timeslot_id}`;
      // For 2-slot events, mark both slots
      this.markOccupied('lecturer', lock.event_id, key);
      this.markOccupied('lecturer', lock.event_id, key2);
      this.markOccupied('room', lock.room_id, key);
      this.markOccupied('room', lock.room_id, key2);
    } else {
      this.markOccupied('lecturer', lock.event_id, key);
      this.markOccupied('room', lock.room_id, key);
    }
  }

  private placeScheduled(scheduled: ScheduledEvent): void {
    const key = `${scheduled.day}:${scheduled.timeslot_id}`;
    if (scheduled.second_timeslot_id) {
      const key2 = `${scheduled.day}:${scheduled.second_timeslot_id}`;
      this.markOccupied('room', scheduled.room_id, key);
      this.markOccupied('room', scheduled.room_id, key2);
    } else {
      this.markOccupied('room', scheduled.room_id, key);
    }
  }

  private markOccupied(type: 'lecturer' | 'level' | 'room', id: string, key: string): void {
    let map: Map<string, Set<string>>;
    if (type === 'lecturer') {
      map = this.lecturerOccupancy;
    } else if (type === 'level') {
      map = this.levelOccupancy;
    } else {
      map = this.roomOccupancy;
    }

    if (!map.has(id)) {
      map.set(id, new Set());
    }
    map.get(id)!.add(key);
  }

  canPlace(candidate: CandidatePlacement, event: Event, level: number): boolean {
    const key = `${candidate.day}:${candidate.timeslot_id}`;
    const key2 = candidate.second_timeslot_id ? `${candidate.day}:${candidate.second_timeslot_id}` : null;

    // Check lecturer clash
    if (event.lecturer_id) {
      const lecturerSlots = this.lecturerOccupancy.get(event.lecturer_id);
      if (lecturerSlots?.has(key) || (key2 && lecturerSlots?.has(key2))) {
        return false;
      }
    }

    // Check level clash
    const levelSlots = this.levelOccupancy.get(level);
    if (levelSlots?.has(key) || (key2 && levelSlots?.has(key2))) {
      return false;
    }

    // Check room clash
    const roomSlots = this.roomOccupancy.get(candidate.room_id);
    if (roomSlots?.has(key) || (key2 && roomSlots?.has(key2))) {
      return false;
    }

    return true;
  }

  place(candidate: CandidatePlacement, event: Event, level: number): void {
    const key = `${candidate.day}:${candidate.timeslot_id}`;
    const key2 = candidate.second_timeslot_id ? `${candidate.day}:${candidate.second_timeslot_id}` : null;

    // Mark lecturer occupancy
    if (event.lecturer_id) {
      if (!this.lecturerOccupancy.has(event.lecturer_id)) {
        this.lecturerOccupancy.set(event.lecturer_id, new Set());
      }
      this.lecturerOccupancy.get(event.lecturer_id)!.add(key);
      if (key2) {
        this.lecturerOccupancy.get(event.lecturer_id)!.add(key2);
      }
    }

    // Mark level occupancy
    if (!this.levelOccupancy.has(level)) {
      this.levelOccupancy.set(level, new Set());
    }
    this.levelOccupancy.get(level)!.add(key);
    if (key2) {
      this.levelOccupancy.get(level)!.add(key2);
    }

    // Mark room occupancy
    if (!this.roomOccupancy.has(candidate.room_id)) {
      this.roomOccupancy.set(candidate.room_id, new Set());
    }
    this.roomOccupancy.get(candidate.room_id)!.add(key);
    if (key2) {
      this.roomOccupancy.get(candidate.room_id)!.add(key2);
    }
  }

  unplace(candidate: CandidatePlacement, event: Event, level: number): void {
    const key = `${candidate.day}:${candidate.timeslot_id}`;
    const key2 = candidate.second_timeslot_id ? `${candidate.day}:${candidate.second_timeslot_id}` : null;

    // Unmark lecturer occupancy
    if (event.lecturer_id) {
      this.lecturerOccupancy.get(event.lecturer_id)?.delete(key);
      if (key2) {
        this.lecturerOccupancy.get(event.lecturer_id)?.delete(key2);
      }
    }

    // Unmark level occupancy
    this.levelOccupancy.get(level)?.delete(key);
    if (key2) {
      this.levelOccupancy.get(level)?.delete(key2);
    }

    // Unmark room occupancy
    this.roomOccupancy.get(candidate.room_id)?.delete(key);
    if (key2) {
      this.roomOccupancy.get(candidate.room_id)?.delete(key2);
    }
  }

  isFeasible(candidate: CandidatePlacement, event: Event, level: number): boolean {
    return this.canPlace(candidate, event, level);
  }
}

