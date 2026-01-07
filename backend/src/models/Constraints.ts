import { supabase } from '../config/database';
import { ConstraintsConfig } from '../../shared/types';

export class ConstraintsModel {
  static async findBySession(sessionId: string): Promise<ConstraintsConfig | null> {
    const { data, error } = await supabase
      .from('constraints')
      .select('config')
      .eq('session_id', sessionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data?.config as ConstraintsConfig | null;
  }

  static async createOrUpdate(
    sessionId: string,
    config: ConstraintsConfig
  ): Promise<ConstraintsConfig> {
    // Check if exists
    const existing = await this.findBySession(sessionId);

    if (existing) {
      // Update
      const { data, error } = await supabase
        .from('constraints')
        .update({
          config: config as any,
          updated_at: new Date().toISOString(),
        })
        .eq('session_id', sessionId)
        .select('config')
        .single();

      if (error) throw error;
      return data.config as ConstraintsConfig;
    } else {
      // Create
      const { data, error } = await supabase
        .from('constraints')
        .insert({
          session_id: sessionId,
          config: config as any,
        })
        .select('config')
        .single();

      if (error) throw error;
      return data.config as ConstraintsConfig;
    }
  }

  static async getDefaultConstraints(): Promise<ConstraintsConfig> {
    return {
      slot_minutes_note: 'Slots are variable-length; the system uses start_time/end_time per slot.',
      allowed_days: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
      consecutive_pairs: [
        ['TS3', 'TS4'],
        ['TS4', 'TS5'],
        ['TS5', 'TS6'],
        ['TS6', 'TS7'],
        ['TS7', 'TS8'],
      ],
      unit_mapping: {
        lecture: {
          '1': [{ duration_slots: 1 }],
          '2': [{ duration_slots: 1 }, { duration_slots: 1 }],
          '3': [{ duration_slots: 2 }, { duration_slots: 1 }],
        },
        lab: {
          default: [{ duration_slots: 2, preferred_pair: ['TS7', 'TS8'] }],
        },
      },
      defaults: {
        max_sessions_per_lecturer_per_day: 3,
        max_consecutive_sessions_per_lecturer: 2,
        candidate_limit_per_event: 25,
      },
      soft_weights: {
        spread_course_sessions: 3,
        avoid_early: 2,
        avoid_late: 2,
        lecturer_overload: 10,
        level_gaps: 2,
        room_preference: 1,
      },
    };
  }
}

