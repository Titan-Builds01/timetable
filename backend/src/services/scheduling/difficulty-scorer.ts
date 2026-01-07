import { Event } from '../../../shared/types';

export class DifficultyScorer {
  static compute(
    event: Event,
    candidateCount: number,
    lecturerEventCount: number
  ): number {
    let difficulty = 0;

    // Fewer candidates = higher difficulty (inverse)
    difficulty += Math.max(0, 100 - candidateCount);

    // Labs are harder
    if (event.room_type_required === 'lab') {
      difficulty += 50;
    }

    // Longer events are harder
    if (event.duration_slots === 2) {
      difficulty += 30;
    }

    // Lecturers with more events are harder (tie-breaker)
    difficulty += lecturerEventCount;

    return difficulty;
  }
}

